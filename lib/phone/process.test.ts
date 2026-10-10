import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockTradeClean } from "@/lib/mocks";
import type { Trade } from "@/lib/types";
import { demoRegister } from "@/lib/validation/demo-register";

const saved: { trade: Trade; meta: Record<string, unknown>; phone: unknown }[] = [];
const transcribe = vi.fn();
const extract = vi.fn();

vi.mock("@/lib/ai/transcribe", () => ({ transcribeCall: (...a: unknown[]) => transcribe(...a) }));
vi.mock("@/lib/ai/extract", () => ({ extractTrades: (...a: unknown[]) => extract(...a) }));
vi.mock("@/lib/db/get-register", () => ({ getRegister: async () => ({ register: demoRegister, source: "demo" }) }));
vi.mock("@/lib/db/trades", () => ({
  insertTrade: async (trade: Trade, meta: Record<string, unknown>, phone: unknown) => void saved.push({ trade, meta, phone }),
}));

const { processRecordedCall, fetchRecording } = await import("@/lib/phone/process");

const call = {
  recordingUrl: "https://api.twilio.com/2010-04-01/Accounts/ACtest/Recordings/REtest",
  recordingSid: "REtest",
  callSid: "CAtest",
  from: "+15550100",
  durationSeconds: 21,
};

beforeEach(() => {
  saved.length = 0;
  process.env.TWILIO_ACCOUNT_SID = "ACtest";
  process.env.TWILIO_AUTH_TOKEN = "token";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))));
});
afterEach(() => {
  vi.unstubAllGlobals();
  transcribe.mockReset();
  extract.mockReset();
});

describe("processRecordedCall", () => {
  it("transcribes, extracts, checks and saves a phone trade with caller ID and recording", async () => {
    transcribe.mockResolvedValue({ transcript: "Caller: ...", model: "openai/gpt-audio-mini" });
    extract.mockResolvedValue({ extraction: { trades: [mockTradeClean.extracted], unreadable_reason: null }, model: "anthropic/claude-haiku-5.5" });
    const ids = await processRecordedCall(call);
    expect(ids).toHaveLength(1);
    expect(saved[0].phone).toEqual({ caller_id: "+15550100", recording_sid: "REtest" });
    expect(saved[0].trade.checks.every((c) => c.status !== "fail")).toBe(true);
    expect(saved[0].meta).toMatchObject({ call_sid: "CAtest", transcription_model: "openai/gpt-audio-mini" });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${call.recordingUrl}.wav`);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it("still saves a blocked trade when transcription fails, so no call is lost", async () => {
    transcribe.mockRejectedValue(new Error("boom"));
    extract.mockResolvedValue({ extraction: { trades: [], unreadable_reason: "nothing" }, model: "m" });
    await processRecordedCall(call);
    expect(saved).toHaveLength(1);
    expect(saved[0].trade.transcript).toMatch(/Transcription failed/);
    expect(saved[0].trade.checks.some((c) => c.status === "fail")).toBe(true);
  });

  it("saves a blocked trade when the call has no instruction", async () => {
    transcribe.mockResolvedValue({ transcript: "Caller: hello? wrong number", model: "m" });
    extract.mockResolvedValue({ extraction: { trades: [], unreadable_reason: "wrong number" }, model: "m" });
    await processRecordedCall(call);
    expect(saved[0].meta).toMatchObject({ unreadable_reason: "wrong number" });
  });

  it("never sends Twilio credentials to another host", async () => {
    await expect(fetchRecording("https://evil.example/Recordings/RE1", "wav")).rejects.toThrow(/Refusing/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
