import { describe, expect, it } from "vitest";
import { mockTradeClean, mockTradeFailures } from "@/lib/mocks";
import { makeCallbackSamples } from "@/lib/trades/callback-samples";

describe("makeCallbackSamples", () => {
  it("builds a confirming and a wrong-quantity callback from the trade", () => {
    const [confirm, wrong] = makeCallbackSamples(mockTradeClean);
    expect(confirm.transcript).toContain("Subscribe 5,000 units of IE00B4L5Y983");
    expect(confirm.transcript).toContain("Mark Doyle speaking");
    expect(wrong.label).toBe("Callback says 500 units");
    expect(wrong.transcript).toContain("500 units");
  });

  it("uses money amounts for cash trades", () => {
    const [confirm] = makeCallbackSamples(mockTradeFailures);
    expect(confirm.transcript).toContain("€250,000");
  });

  it("returns nothing when key fields are missing", () => {
    expect(makeCallbackSamples({ ...mockTradeClean, extracted: { ...mockTradeClean.extracted, isin: null } })).toEqual([]);
  });
});

describe("maskPhone", () => {
  it("shows only the prefix and last four digits", async () => {
    const { maskPhone } = await import("@/lib/trades/build");
    expect(maskPhone("+353870000123")).toBe("+353 87 ••• 0123");
    expect(maskPhone("+353 87 000 0123")).toBe("+353 87 ••• 0123");
  });
});
