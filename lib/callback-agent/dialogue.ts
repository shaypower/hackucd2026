// The automated callback conversation. Deterministic on purpose: fixed wording, and it never says
// the original instruction's values. The contact must state them; the LLM only reads their answers.
import type { ExtractedTrade, TradeField } from "@/lib/types";
import { KEY_FIELDS } from "@/lib/trades/diff";

export const MAX_TURNS = 5; // answers that told us something
export const MAX_UNPRODUCTIVE_TURNS = 3; // silence, "sorry?", or nothing usable

// Played in full before listening starts, so a "Hello?" on pick-up can't cut it off.
export const INTRO =
  "Hello, this is the TelDeal dealing desk's automated confirmation line. This call is recorded. " +
  "We received a dealing instruction today on an account you are the nominated contact for, and we need you to confirm it.";

export const FULL_QUESTION =
  "Please tell me the instruction in full: whether it's a subscription or a redemption, the fund ISIN, the amount, the currency, and the account number. " +
  "You can say repeat, or press star, to hear this again.";

const ASK: Partial<Record<TradeField, string>> = {
  direction: "whether it's a subscription or a redemption",
  isin: "the fund ISIN. Please read it letter by letter",
  account_no: "the account number",
  quantity: "the amount, as a number of units or a cash amount",
  quantity_type: "whether that amount is in units or in cash",
  currency: "the currency",
};

/** Key fields the contact hasn't stated yet (null in what we've heard so far). */
export function missingFields(heard: ExtractedTrade | null): TradeField[] {
  return KEY_FIELDS.filter((f) => !heard || heard[f] === null);
}

/** True if nothing usable has been heard yet. */
export function heardNothing(heard: ExtractedTrade | null): boolean {
  return missingFields(heard).length === KEY_FIELDS.length;
}

const REPEAT = /\b(repeat|again|pardon|sorry|what|huh|hello|hi|who('?s| is) (this|that)|didn'?t (hear|catch|get)|say that|come again)\b/i;

/** "Sorry, what?", "Can you repeat that?", "Hello?" — short, with no instruction in it. */
export function isRepeatRequest(speech: string): boolean {
  return speech.trim().split(/\s+/).length <= 8 && REPEAT.test(speech) && !/\d/.test(speech);
}

export type Step = { kind: "ask"; say: string } | { kind: "finish" } | { kind: "incomplete" };

export function nextStep(heard: ExtractedTrade | null, productiveTurns: number): Step {
  const missing = missingFields(heard);
  if (missing.length === 0) return { kind: "finish" };
  if (productiveTurns >= MAX_TURNS) return { kind: "incomplete" };
  if (heardNothing(heard)) return { kind: "ask", say: FULL_QUESTION };
  // One thing at a time; amount and units-or-cash are one question when both are missing.
  const field = missing[0] === "quantity_type" && missing.includes("quantity") ? "quantity" : missing[0];
  return { kind: "ask", say: `Thank you. I still need ${ASK[field]}.` };
}

export function closing(allMatch: boolean): string {
  return allMatch
    ? "Thank you. That matches the instruction we received. It will now go to the dealing desk for final approval. Goodbye."
    : "Thank you. That does not match the instruction we received, so it will not be dealt. A member of the dealing desk will contact you. Goodbye.";
}

export const INCOMPLETE =
  "Thank you. I couldn't confirm every detail, so nothing will be dealt yet. A member of the dealing desk will contact you. Goodbye.";
export const NO_SPEECH_RETRY = "Sorry, I didn't catch that. " + FULL_QUESTION;
export const NO_SPEECH_GIVE_UP = "Sorry, I couldn't hear you. The dealing desk will try again later. Goodbye.";
