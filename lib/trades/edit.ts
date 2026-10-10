// Applies an agent's edit (raw text from an input) to one field of an extracted trade.
import { Direction, QuantityType, type ExtractedTrade, type TradeField } from "@/lib/types";
import { normalizeIsin } from "@/lib/validation/isin";

export class EditError extends Error {}

function parseQuantity(raw: string): number {
  const m = /^([\d.,]+)\s*(k|m)?$/i.exec(raw.replace(/[€$£\s]/g, ""));
  const n = m ? Number(m[1].replace(/,/g, "")) * (m[2]?.toLowerCase() === "k" ? 1e3 : m[2]?.toLowerCase() === "m" ? 1e6 : 1) : NaN;
  if (!Number.isFinite(n)) throw new EditError(`"${raw}" isn't a number.`);
  return n;
}

export function applyEdit(trade: ExtractedTrade, field: TradeField, raw: string): ExtractedTrade {
  const text = raw.trim();
  let value: ExtractedTrade[TradeField];
  if (text === "") value = null;
  else if (field === "quantity") value = parseQuantity(text);
  else if (field === "direction" || field === "quantity_type") {
    const schema = field === "direction" ? Direction : QuantityType;
    const parsed = schema.safeParse(text.toLowerCase());
    if (!parsed.success) throw new EditError(`Use one of: ${schema.options.join(", ")}.`);
    value = parsed.data;
  } else if (field === "isin") value = normalizeIsin(text);
  else if (field === "currency") value = text.toUpperCase();
  else value = text;

  return {
    ...trade,
    [field]: value,
    // An edited value no longer comes from the transcript.
    evidence: trade.evidence.filter((e) => e.field !== field),
  };
}
