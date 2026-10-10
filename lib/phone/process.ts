// Turns a recorded call to the TelDeal line into saved, checked trade(s). Runs after Twilio's webhook returns.
import "server-only";
import { extractTrades } from "@/lib/ai/extract";
import { transcribeCall } from "@/lib/ai/transcribe";
import { getRegister } from "@/lib/db/get-register";
import { insertTrade } from "@/lib/db/trades";
import { buildTrade } from "@/lib/trades/build";
import { twilioConfig } from "@/lib/twilio/webhook";
import type { ExtractedTrade } from "@/lib/types";

const EMPTY: ExtractedTrade = {
  direction: null, isin: null, fund_name: null, account_no: null, account_name: null,
  caller_name: null, currency: null, quantity: null, quantity_type: null, evidence: [],
};

export interface RecordedCall {
  recordingUrl: string;
  recordingSid: string;
  callSid: string;
  from: string | null;
  durationSeconds: number;
}

function twilioAuthHeader(): string {
  const config = twilioConfig();
  if (!config) throw new Error("Twilio is not configured.");
  return "Basic " + Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
}

/** Fetches a recording from Twilio. Only ever sends credentials to api.twilio.com. */
export async function fetchRecording(recordingUrl: string, format: "wav" | "mp3"): Promise<Response> {
  const url = new URL(recordingUrl);
  if (url.protocol !== "https:" || url.hostname !== "api.twilio.com") throw new Error(`Refusing to fetch recording from ${url.host}`);
  return fetch(`${url.origin}${url.pathname.replace(/\.(wav|mp3)$/, "")}.${format}`, { headers: { Authorization: twilioAuthHeader() } });
}

export function recordingUrlFor(recordingSid: string): string {
  const config = twilioConfig();
  if (!config) throw new Error("Twilio is not configured.");
  return `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${recordingSid}`;
}

export async function processRecordedCall(call: RecordedCall): Promise<string[]> {
  const meta = { call_sid: call.callSid, duration_s: call.durationSeconds } as Record<string, unknown>;

  // A call is never lost: if transcription or extraction fails, save it as a blocked trade for manual entry.
  let transcript = "(Transcription failed. Listen to the recording and enter the trade manually.)";
  try {
    const audio = await fetchRecording(call.recordingUrl, "wav");
    if (!audio.ok) throw new Error(`Recording download failed: ${audio.status}`);
    const result = await transcribeCall(new Uint8Array(await audio.arrayBuffer()), "audio/wav");
    transcript = result.transcript || "(No speech detected in the recording.)";
    meta.transcription_model = result.model;
  } catch (error) {
    console.error("phone: transcription failed", call.callSid, error);
  }

  let extracted: ExtractedTrade[] = [];
  try {
    const result = await extractTrades(transcript);
    extracted = result.extraction.trades;
    meta.model = result.model;
    if (result.extraction.unreadable_reason) meta.unreadable_reason = result.extraction.unreadable_reason;
  } catch (error) {
    console.error("phone: extraction failed", call.callSid, error);
  }
  if (extracted.length === 0) extracted = [EMPTY];

  const { register, source } = await getRegister();
  const ids: string[] = [];
  for (const e of extracted) {
    const trade = buildTrade(e, transcript, register);
    await insertTrade(trade, { ...meta, register_source: source }, { caller_id: call.from, recording_sid: call.recordingSid });
    ids.push(trade.id);
  }
  return ids;
}
