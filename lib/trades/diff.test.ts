import { describe, expect, it } from "vitest";
import { mockCallbackMatch, mockCallbackMismatch, mockTradeClean } from "@/lib/mocks";
import { diffTrades } from "@/lib/trades/diff";

const original = mockTradeClean.extracted;
const mismatched = (r: ReturnType<typeof diffTrades>) => r.fields.filter((f) => !f.match).map((f) => f.field);

describe("diffTrades", () => {
  it("matches an identical confirmation", () => {
    expect(diffTrades(original, mockCallbackMatch.extracted).all_match).toBe(true);
  });

  it("flags a quantity mismatch (5,000 vs 500)", () => {
    const r = diffTrades(original, mockCallbackMismatch.extracted);
    expect(r.all_match).toBe(false);
    expect(mismatched(r)).toEqual(["quantity"]);
  });

  it("ignores case, spacing and punctuation differences", () => {
    const r = diffTrades(original, { ...original, isin: "ie00 b4l5 y983", currency: "usd", account_name: "harbourview pension trustees." });
    expect(r.all_match).toBe(true);
  });

  it("requires every key field to be confirmed on the callback", () => {
    const r = diffTrades(original, { ...original, currency: null, quantity_type: null });
    expect(mismatched(r)).toEqual(["currency", "quantity_type"]);
  });

  it("flags a different direction or ISIN", () => {
    expect(mismatched(diffTrades(original, { ...original, direction: "redeem", isin: "IE00BK5BQT80" }))).toEqual(["direction", "isin"]);
  });

  it("tolerates a missing or different caller name (callback contact may differ)", () => {
    expect(diffTrades(original, { ...original, caller_name: null }).all_match).toBe(true);
    expect(diffTrades(original, { ...original, caller_name: "Niamh Fallon" }).all_match).toBe(true);
  });

  it("flags a conflicting account name when both are stated", () => {
    expect(mismatched(diffTrades(original, { ...original, account_name: "Oakpark Family Office" }))).toEqual(["account_name"]);
  });
});
