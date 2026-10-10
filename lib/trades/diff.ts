// Field-by-field comparison of the original instruction with the callback confirmation.
import { TRADE_FIELDS, type ExtractedTrade, type FieldDiff, type TradeField } from "@/lib/types";
import { levenshtein, normalizeIsin } from "@/lib/validation/isin";
import { normalizeName } from "@/lib/validation/register";

// Must be stated on the callback and match exactly. These are the fraud control: never overridable.
export const KEY_FIELDS: TradeField[] = ["direction", "isin", "account_no", "quantity", "quantity_type", "currency"];
// Names: compared only when the callback states them, tolerantly (speech-to-text spells names freely),
// and a dealer may accept a difference after checking it.
export const SOFT_FIELDS: TradeField[] = ["account_name", "fund_name", "caller_name"];

function normalize(field: TradeField, value: string | number | null): string | number | null {
  if (value === null || typeof value === "number") return value;
  if (field === "isin") return normalizeIsin(value);
  if (field === "currency") return value.toUpperCase();
  return normalizeName(value);
}

/** Speech-to-text spellings of the same name: "eye shares core msci world" ≈ "iShares Core MSCI World". */
export function namesAlike(a: string, b: string): boolean {
  const compact = (s: string) => normalizeName(s).replace(/ /g, "");
  // Common phonetic spellings of letters/prefixes in fund and company names.
  const sounds = (s: string) => compact(s).replace(/^eye/, "i").replace(/eye/g, "i").replace(/ph/g, "f");
  const x = sounds(a);
  const y = sounds(b);
  if (x === y) return true;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length) >= 0.8;
}

export function diffTrades(original: ExtractedTrade, callback: ExtractedTrade): { fields: FieldDiff[]; all_match: boolean } {
  const isinMatches = callback.isin !== null && normalize("isin", original.isin) === normalize("isin", callback.isin);
  const fields = TRADE_FIELDS.map((field): FieldDiff => {
    const a = original[field];
    const b = callback[field];
    let match: boolean;
    if (KEY_FIELDS.includes(field)) match = b !== null && normalize(field, a) === normalize(field, b);
    else if (field === "caller_name") match = true; // the nominated contact is often not the original caller
    else if (field === "fund_name" && isinMatches) match = true; // the ISIN identifies the fund
    else match = b === null || a === null || namesAlike(String(a), String(b));
    return { field, original: a, callback: b, match };
  });
  return { fields, all_match: fields.every((f) => f.match) };
}

/** Marks a mismatched name field as accepted by the dealer. Key fields can't be accepted. */
export function acceptField(fields: FieldDiff[], field: TradeField): { fields: FieldDiff[]; all_match: boolean } {
  if (!SOFT_FIELDS.includes(field)) throw new Error(`${field} is a key field; it can't be accepted. Call the contact again.`);
  const next = fields.map((f) => (f.field === field ? { ...f, match: true, accepted: true } : f));
  return { fields: next, all_match: next.every((f) => f.match) };
}
