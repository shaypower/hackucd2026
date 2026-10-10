import { describe, expect, it } from "vitest";
import { mockTradeClean } from "@/lib/mocks";
import { applyEdit, EditError } from "@/lib/trades/edit";

const t = mockTradeClean.extracted;

describe("applyEdit", () => {
  it.each([
    ["5000", 5000],
    ["5,000", 5000],
    ["5k", 5000],
    ["€250,000", 250000],
    ["1.5m", 1500000],
  ])("parses quantity %s", (raw, expected) => {
    expect(applyEdit(t, "quantity", raw).quantity).toBe(expected);
  });

  it("rejects a non-number quantity", () => {
    expect(() => applyEdit(t, "quantity", "lots")).toThrow(EditError);
  });

  it("validates enum fields case-insensitively", () => {
    expect(applyEdit(t, "direction", "Redeem").direction).toBe("redeem");
    expect(applyEdit(t, "quantity_type", "CASH").quantity_type).toBe("cash");
    expect(() => applyEdit(t, "direction", "buy")).toThrow("subscribe, redeem");
  });

  it("normalises ISIN and currency", () => {
    expect(applyEdit(t, "isin", "ie00 bk5b qt80").isin).toBe("IE00BK5BQT80");
    expect(applyEdit(t, "currency", "eur").currency).toBe("EUR");
  });

  it("empty input clears the field", () => {
    expect(applyEdit(t, "account_name", "  ").account_name).toBeNull();
  });

  it("drops the edited field's transcript evidence and keeps the rest", () => {
    const edited = applyEdit(t, "isin", "IE00BK5BQT80");
    expect(edited.evidence.some((e) => e.field === "isin")).toBe(false);
    expect(edited.evidence.length).toBe(t.evidence.length - 1);
  });
});
