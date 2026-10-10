// Server side of the automated callback: placing the call and running each turn of the conversation.
import "server-only";
import { closing, MAX_SILENT_TURNS, NO_SPEECH_GIVE_UP, NO_SPEECH_RETRY, nextStep, OPENING } from "@/lib/callback-agent/dialogue";
import { extractTrades } from "@/lib/ai/extract";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getCallbackCall, getTrade, saveCallbackResult, updateCallbackCall, type CallbackCall } from "@/lib/db/trades";
import { diffTrades } from "@/lib/trades/diff";
import { attr, say, twilioConfig } from "@/lib/twilio/webhook";
import type { CallbackResult, ExtractedTrade } from "@/lib/types";

/** E.164 for Twilio: "+1 443 586 0648" -> "+14435860648". */
export const e164 = (n: string) => n.replace(/[^\d+]/g, "");

/** In the demo every callback goes to one real phone; the register numbers are fictional. */
export function callbackDestination(registerPhone: string): { to: string; redirected: boolean } {
  const demo = process.env.DEMO_CALLBACK_NUMBER;
  return demo ? { to: e164(demo), redirected: true } : { to: e164(registerPhone), redirected: false };
}

export const maskNumber = (n: string) => n.slice(0, -4).replace(/\d/g, "•") + n.slice(-4);

export async function placeCallbackCall(baseUrl: string, to: string): Promise<string> {
  const config = twilioConfig();
  const from = process.env.NEXT_PUBLIC_TELDEAL_PHONE;
  if (!config || !from) throw new Error("Twilio is not configured.");
  const body = new URLSearchParams({
    To: to,
    From: e164(from),
    Url: `${baseUrl}/api/twilio/callback/voice`,
    Method: "POST",
    StatusCallback: `${baseUrl}/api/twilio/callback/status`,
    StatusCallbackMethod: "POST",
    Record: "true",
    Timeout: "30",
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64") },
    body,
  });
  const data = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok || !data.sid) throw new Error(`Twilio refused the call: ${data.message ?? res.status}`);
  return data.sid;
}

const gather = (prompt: string) =>
  `<Gather input="speech" action="/api/twilio/callback/answer" method="POST" actionOnEmptyResult="true" speechTimeout="auto" timeout="7" language="en-GB" hints="${attr("subscribe, subscription, redeem, redemption, units, euro, dollars, sterling, ISIN, I E, account")}">${say(prompt)}</Gather>`;

/** First thing the contact hears. */
export async function openingTurn(call: CallbackCall): Promise<string> {
  await updateCallbackCall(call.call_sid, { transcript: `Agent: ${OPENING}` });
  return gather(OPENING);
}

/** Handles one answer; returns the TwiML for what happens next. */
export async function answerTurn(callSid: string, speech: string): Promise<string> {
  const call = await getCallbackCall(callSid);
  if (!call) return say("Sorry, this call could not be matched to an instruction. Goodbye.") + "<Hangup/>";

  if (!speech.trim()) {
    const silent = call.silent_turns + 1;
    await updateCallbackCall(callSid, { silent_turns: silent });
    if (silent >= MAX_SILENT_TURNS) {
      await updateCallbackCall(callSid, { outcome: "incomplete" });
      await addAudit(call.trade_id, "callback_call", { call_sid: callSid, status: "no response from contact" });
      return say(NO_SPEECH_GIVE_UP) + "<Hangup/>";
    }
    return gather(NO_SPEECH_RETRY);
  }

  const transcript = `${call.transcript}\nCaller: ${speech.trim()}`;
  const turns = call.turns + 1;
  const result = await extractTrades(transcript);
  const heard: ExtractedTrade | null = result.extraction.trades[0] ?? null;
  const step = nextStep(heard, turns);

  if (step.kind === "ask") {
    await updateCallbackCall(callSid, { transcript: `${transcript}\nAgent: ${step.say}`, turns });
    return gather(step.say);
  }

  const { register } = await getRegister();
  const trade = await getTrade(call.trade_id, register);
  const confirmed = heard ?? { ...trade.extracted, direction: null, isin: null, account_no: null, quantity: null, quantity_type: null, currency: null, evidence: [] };
  const { fields, all_match } = diffTrades(trade.extracted, confirmed);
  const callback: CallbackResult = {
    id: crypto.randomUUID(),
    trade_id: trade.id,
    transcript,
    extracted: confirmed,
    fields,
    all_match,
    created_at: new Date().toISOString(),
  };
  await saveCallbackResult(callback, { channel: "phone", call_sid: callSid, turns, model: result.model }, trade.nominated_callback?.name);
  await updateCallbackCall(callSid, { transcript: `${transcript}\nAgent: ${closing(all_match)}`, turns, outcome: all_match ? "matched" : "mismatched" });
  return say(closing(all_match)) + "<Hangup/>";
}
