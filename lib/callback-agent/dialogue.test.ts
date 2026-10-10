import { describe, expect, it } from "vitest";
import { closing, MAX_TURNS, missingFields, nextStep, OPENING } from "@/lib/callback-agent/dialogue";
import { mockTradeClean } from "@/lib/mocks";
import type { ExtractedTrade } from "@/lib/types";

const full = mockTradeClean.extracted;
const partial: ExtractedTrade = { ...full, isin: null, currency: null };

describe("callback dialogue", () => {
  it("never reveals the original instruction", () => {
    const said = [OPENING, closing(true), closing(false), (nextStep(null, 1) as { say: string }).say].join(" ");
    for (const value of ["IE00B4L5Y983", "40012", "5,000", "5000", "USD", "Harbourview"]) expect(said).not.toContain(value);
  });

  it("finishes once every key field has been stated", () => {
    expect(nextStep(full, 1)).toEqual({ kind: "finish" });
  });

  it("asks only for what's missing", () => {
    expect(missingFields(partial)).toEqual(["isin", "currency"]);
    const step = nextStep(partial, 1);
    expect(step.kind === "ask" && step.say).toMatch(/ISIN letter by letter.*currency/);
  });

  it("asks units-or-cash together with the amount", () => {
    const step = nextStep({ ...full, quantity: null, quantity_type: null }, 1);
    expect(step.kind === "ask" && step.say).toMatch(/amount, as a number of units or a cash amount\?$/);
  });

  it("gives up after the maximum number of turns", () => {
    expect(nextStep(partial, MAX_TURNS)).toEqual({ kind: "finish" });
  });
});
