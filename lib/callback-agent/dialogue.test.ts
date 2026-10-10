import { describe, expect, it } from "vitest";
import { closing, FULL_QUESTION, INCOMPLETE, INTRO, isRepeatRequest, MAX_TURNS, missingFields, nextStep } from "@/lib/callback-agent/dialogue";
import { mockTradeClean } from "@/lib/mocks";
import type { ExtractedTrade } from "@/lib/types";

const full = mockTradeClean.extracted;
const partial: ExtractedTrade = { ...full, isin: null, currency: null };
const nothing: ExtractedTrade = { ...full, direction: null, isin: null, account_no: null, quantity: null, quantity_type: null, currency: null };
const ask = (s: ReturnType<typeof nextStep>) => (s.kind === "ask" ? s.say : "");

describe("callback dialogue", () => {
  it("never reveals the original instruction", () => {
    const said = [INTRO, FULL_QUESTION, INCOMPLETE, closing(true), closing(false), ask(nextStep(partial, 1)), ask(nextStep(null, 1))].join(" ");
    for (const value of ["IE00B4L5Y983", "40012", "5,000", "5000", "USD", "Harbourview"]) expect(said).not.toContain(value);
  });

  it("finishes once every key field has been stated", () => {
    expect(nextStep(full, 1)).toEqual({ kind: "finish" });
  });

  it("re-asks the full question when nothing usable was heard", () => {
    expect(ask(nextStep(null, 1))).toBe(FULL_QUESTION);
    expect(ask(nextStep(nothing, 2))).toBe(FULL_QUESTION);
  });

  it("asks for one missing thing at a time", () => {
    expect(missingFields(partial)).toEqual(["isin", "currency"]);
    expect(ask(nextStep(partial, 1))).toBe("Thank you. I still need the fund ISIN. Please read it letter by letter.");
    expect(ask(nextStep({ ...partial, isin: "IE00B4L5Y983" }, 2))).toBe("Thank you. I still need the currency.");
  });

  it("asks amount and units-or-cash together", () => {
    expect(ask(nextStep({ ...full, quantity: null, quantity_type: null }, 1))).toMatch(/amount, as a number of units or a cash amount\.$/);
  });

  it("ends as incomplete (not a mismatch) after the maximum number of turns", () => {
    expect(nextStep(partial, MAX_TURNS)).toEqual({ kind: "incomplete" });
  });

  it("recognises repeat requests but not instructions", () => {
    for (const s of ["Sorry, what?", "Can you repeat that?", "Hello?", "Pardon", "I didn't catch that", "Who is this?"]) expect(isRepeatRequest(s)).toBe(true);
    for (const s of ["Subscribe 5,000 units", "Sorry, it's a redemption of 500 units of IE00B4L5Y983 in euro on account 40012", "It's a subscription"]) {
      expect(isRepeatRequest(s)).toBe(false);
    }
  });
});
