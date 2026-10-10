import { describe, expect, it } from "vitest";
import * as mocks from "@/lib/mocks";
import { ApiError, AuditEvent, CallbackResult, Subscription, Trade } from "@/lib/types";

const trades = [mocks.mockTradeClean, mocks.mockTradeWarnings, mocks.mockTradeFailures];
const callbacks = [mocks.mockCallbackMatch, mocks.mockCallbackMismatch];

describe("mocks match the shared contracts", () => {
  it.each(trades.map((t) => [t.id, t]))("trade %s parses", (_, trade) => {
    expect(() => Trade.parse(trade)).not.toThrow();
  });

  it.each(callbacks.map((c) => [c.id, c]))("callback %s parses", (_, callback) => {
    expect(() => CallbackResult.parse(callback)).not.toThrow();
  });

  it("audit events, subscriptions and errors parse", () => {
    for (const event of mocks.mockAuditEvents) AuditEvent.parse(event);
    Subscription.parse(mocks.mockSubscriptionActive);
    Subscription.parse(mocks.mockSubscriptionInactive);
    for (const error of [mocks.mockErrorUnreadable, mocks.mockErrorUpstream, mocks.mockErrorSubscription]) {
      ApiError.parse({ error });
    }
  });
});

describe("evidence quotes can be highlighted", () => {
  const cases = [
    ...trades.map((t) => [t.id, t.transcript, t.extracted.evidence] as const),
    ...callbacks.map((c) => [c.id, c.transcript, c.extracted.evidence] as const),
  ];

  it.each(cases)("%s: every quote is a substring of its transcript", (_, transcript, evidence) => {
    for (const { field, quote } of evidence) {
      expect(transcript, `${field}: "${quote}"`).toContain(quote);
    }
  });
});

describe("mock states cover what the UI must show", () => {
  it("has a pass-only, a warn and a fail trade", () => {
    const statuses = trades.map((t) => new Set(t.checks.map((c) => c.status)));
    expect(statuses[0]).toEqual(new Set(["pass"]));
    expect(statuses[1].has("warn")).toBe(true);
    expect(statuses[2].has("fail")).toBe(true);
  });

  it("mismatch callback differs only in quantity", () => {
    expect(mocks.mockCallbackMatch.fields.every((f) => f.match)).toBe(true);
    const mismatched = mocks.mockCallbackMismatch.fields.filter((f) => !f.match).map((f) => f.field);
    expect(mismatched).toEqual(["quantity"]);
  });
});
