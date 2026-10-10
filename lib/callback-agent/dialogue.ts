// The automated callback conversation. Deterministic on purpose: fixed wording, and it never says
// the original instruction's values. The contact must state them; the LLM only reads their answers.
import type { ExtractedTrade, TradeField } from "@/lib/types";
import { KEY_FIELDS } from "@/lib/trades/diff";

export const MAX_TURNS = 4; // opening question + up to 3 follow-ups
export const MAX_SILENT_TURNS = 2;

export const OPENING =
  "Hello, this is the TelDeal dealing desk's automated confirmation line. This call is recorded. " +
  "We received a dealing instruction today on an account you are the nominated contact for. " +
  "To confirm it, please tell me the instruction in full: whether it's a subscription or a redemption, the fund ISIN, the amount, the currency, and the account number.";

const QUESTIONS: Partial<Record<TradeField, string>> = {
  direction: "is it a subscription or a redemption",
  isin: "which fund it is; please read the ISIN letter by letter",
  account_no: "the account number",
  quantity: "the amount, as a number of units or a cash amount",
  quantity_type: "whether that amount is in units or in cash",
  currency: "the currency",
};

/** Key fields the contact hasn't stated yet (null in what we've heard so far). */
export function missingFields(heard: ExtractedTrade | null): TradeField[] {
  return KEY_FIELDS.filter((f) => !heard || heard[f] === null);
}

export type Step = { kind: "ask"; say: string } | { kind: "finish" };

export function nextStep(heard: ExtractedTrade | null, turns: number): Step {
  const missing = missingFields(heard);
  if (missing.length === 0 || turns >= MAX_TURNS) return { kind: "finish" };
  // quantity and quantity_type are one question when both are missing
  const ask = missing.filter((f) => !(f === "quantity_type" && missing.includes("quantity"))).slice(0, 2);
  const parts = ask.map((f) => QUESTIONS[f]).filter(Boolean);
  return { kind: "ask", say: `Thank you. Could you also tell me ${parts.join(", and ")}?` };
}

export function closing(allMatch: boolean): string {
  return allMatch
    ? "Thank you. That matches the instruction we received. It will now go to the dealing desk for final approval. Goodbye."
    : "Thank you. That does not match the instruction we received, so it will not be dealt. A member of the dealing desk will contact you. Goodbye.";
}

export const NO_SPEECH_RETRY = "Sorry, I didn't catch that. Please tell me the instruction you placed today.";
export const NO_SPEECH_GIVE_UP = "Sorry, I couldn't hear you. The dealing desk will try again later. Goodbye.";
