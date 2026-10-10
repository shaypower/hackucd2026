import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockTradeClean } from "@/lib/mocks";
import type { CallbackResult, ExtractedTrade } from "@/lib/types";
import { demoRegister } from "@/lib/validation/demo-register";

const extract = vi.fn();
const results: CallbackResult[] = [];
let session: Record<string, unknown>;
const audits: unknown[] = [];

vi.mock("@/lib/ai/extract", () => ({ extractTrades: (...a: unknown[]) => extract(...a) }));
vi.mock("@/lib/db/get-register", () => ({ getRegister: async () => ({ register: demoRegister, source: "demo" }) }));
vi.mock("@/lib/db/trades", () => ({
  getCallbackCall: async () => session,
  updateCallbackCall: async (_sid: string, patch: Record<string, unknown>) => void Object.assign(session, patch),
  getTrade: async () => ({ ...mockTradeClean, status: "awaiting_callback" }),
  saveCallbackResult: async (cb: CallbackResult) => void results.push(cb),
  addAudit: async (...a: unknown[]) => void audits.push(a),
}));

const { answerTurn } = await import("@/lib/callback-agent/call");
const heard = (t: Partial<ExtractedTrade> | null) =>
  extract.mockResolvedValueOnce({ extraction: { trades: t ? [{ ...mockTradeClean.extracted, ...t }] : [], unreadable_reason: null }, model: "m" });

beforeEach(() => {
  session = { call_sid: "CA1", trade_id: mockTradeClean.id, to_number: "+353870000000", transcript: "Agent: opening", turns: 0, silent_turns: 0, outcome: null };
  results.length = 0;
  audits.length = 0;
  extract.mockReset();
});

describe("callback agent turns", () => {
  it("asks for missing fields without revealing them", async () => {
    heard({ isin: null, currency: null });
    const twiml = await answerTurn("CA1", "Subscribe five thousand units on account four zero zero one two");
    expect(twiml).toMatch(/<Gather.*ISIN letter by letter.*currency/s);
    expect(twiml).not.toContain("IE00B4L5Y983");
    expect(session.turns).toBe(1);
    expect(String(session.transcript)).toContain("Caller: Subscribe five thousand units");
  });

  it("saves a matched callback and says goodbye", async () => {
    heard({});
    const twiml = await answerTurn("CA1", "Subscribe 5,000 units of IE00B4L5Y983 in US dollars, account 40012");
    expect(results[0].all_match).toBe(true);
    expect(session.outcome).toBe("matched");
    expect(twiml).toMatch(/matches the instruction.*<Hangup\/>/s);
  });

  it("saves a mismatch when the contact states a different quantity", async () => {
    heard({ quantity: 500 });
    const twiml = await answerTurn("CA1", "Subscribe 500 units of IE00B4L5Y983 in US dollars, account 40012");
    expect(results[0].all_match).toBe(false);
    expect(results[0].fields.filter((f) => !f.match).map((f) => f.field)).toEqual(["quantity"]);
    expect(twiml).toMatch(/does not match.*will not be dealt/s);
  });

  it("re-asks once on silence, then gives up", async () => {
    expect(await answerTurn("CA1", "")).toMatch(/didn&#39;t catch that/);
    expect(await answerTurn("CA1", "")).toMatch(/couldn&#39;t hear you.*<Hangup\/>/s);
    expect(session.outcome).toBe("incomplete");
    expect(results).toHaveLength(0);
  });
});
