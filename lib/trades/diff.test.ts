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

describe("names on the callback", () => {
  it("ignores speech-to-text spelling of the fund name when the ISIN matches", () => {
    expect(diffTrades(original, { ...original, fund_name: "eye shares core msci world" }).all_match).toBe(true);
  });

  it("treats sound-alike names as equal", async () => {
    const { namesAlike } = await import("@/lib/trades/diff");
    expect(namesAlike("iShares Core MSCI World", "eye shares core msci world")).toBe(true);
    expect(namesAlike("Harbourview Pension Trustees", "Harbour View Pension Trustees")).toBe(true);
    expect(namesAlike("Harbourview Pension Trustees", "Oakpark Family Office")).toBe(false);
  });

  it("still flags a different fund name when the ISIN doesn't match", () => {
    const r = diffTrades(original, { ...original, isin: "IE00BK5BQT80", fund_name: "Vanguard FTSE All-World" });
    expect(mismatched(r)).toEqual(["isin", "fund_name"]);
  });
});

describe("acceptField", () => {
  it("lets the dealer accept a name difference and recomputes the result", async () => {
    const { acceptField } = await import("@/lib/trades/diff");
    const r = diffTrades(original, { ...original, account_name: "Oakpark Family Office" });
    expect(r.all_match).toBe(false);
    const accepted = acceptField(r.fields, "account_name");
    expect(accepted.all_match).toBe(true);
    expect(accepted.fields.find((f) => f.field === "account_name")).toMatchObject({ match: true, accepted: true });
  });

  it("refuses to accept a key field", async () => {
    const { acceptField } = await import("@/lib/trades/diff");
    const r = diffTrades(original, mockCallbackMismatch.extracted);
    expect(() => acceptField(r.fields, "quantity")).toThrow(/key field/);
  });
});

describe("demo client callback", () => {
  it("Hersh's callback matches Shay's instruction", async () => {
    const shay = { ...original, isin: "IE00B3XXRP09", fund_name: "Vanguard S&P 500", account_no: "40058", account_name: "University of Limerick Investment Group", caller_name: "Shay Power", quantity: 2500 };
    const hersh = { ...shay, caller_name: "Hersh Singh" };
    expect(diffTrades(shay, hersh).all_match).toBe(true);
  });
});
