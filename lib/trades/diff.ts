// Field-by-field comparison of the original instruction with the callback confirmation.
import { TRADE_FIELDS, type ExtractedTrade, type FieldDiff, type TradeField } from "@/lib/types";
import { normalizeIsin } from "@/lib/validation/isin";
import { normalizeName } from "@/lib/validation/register";

// Must be stated on the callback and match exactly.
export const KEY_FIELDS: TradeField[] = ["direction", "isin", "account_no", "quantity", "quantity_type", "currency"];
// Compared only when the callback states them (the callback contact may be a different person).
const SOFT_FIELDS: TradeField[] = ["account_name", "fund_name", "caller_name"];

function normalize(field: TradeField, value: string | number | null): string | number | null {
  if (value === null || typeof value === "number") return value;
  if (field === "isin") return normalizeIsin(value);
  if (field === "currency") return value.toUpperCase();
  return normalizeName(value);
}

export function diffTrades(original: ExtractedTrade, callback: ExtractedTrade): { fields: FieldDiff[]; all_match: boolean } {
  const fields = TRADE_FIELDS.map((field): FieldDiff => {
    const a = original[field];
    const b = callback[field];
    let match: boolean;
    if (KEY_FIELDS.includes(field)) match = b !== null && normalize(field, a) === normalize(field, b);
    else if (SOFT_FIELDS.includes(field) && field !== "caller_name") match = b === null || a === null || normalize(field, a) === normalize(field, b);
    else match = true; // caller_name: the nominated contact is often not the original caller
    return { field, original: a, callback: b, match };
  });
  return { fields, all_match: fields.every((f) => f.match) };
}
