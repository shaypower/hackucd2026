// Cleans up model output before validation. The model is a proposal; this makes it safe to show:
// normalised values, and evidence quotes that really appear in the transcript.
import type { Evidence, ExtractedTrade, Extraction } from "@/lib/types";
import { normalizeIsin } from "@/lib/validation/isin";

function cleanString(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Finds `quote` in the transcript, ignoring case and runs of whitespace; returns the exact transcript text. */
export function locateQuote(transcript: string, quote: string): string | null {
  const q = quote.trim();
  if (!q) return null;
  if (transcript.includes(q)) return q;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const match = new RegExp(escaped, "i").exec(transcript);
  return match ? match[0] : null;
}

export function cleanTrade(trade: ExtractedTrade, transcript: string): { trade: ExtractedTrade; droppedEvidence: number } {
  const isin = cleanString(trade.isin);
  const currency = cleanString(trade.currency);
  const cleaned: ExtractedTrade = {
    direction: trade.direction,
    isin: isin ? normalizeIsin(isin) : null,
    fund_name: cleanString(trade.fund_name),
    account_no: cleanString(trade.account_no),
    account_name: cleanString(trade.account_name),
    caller_name: cleanString(trade.caller_name),
    currency: currency ? currency.toUpperCase() : null,
    quantity: typeof trade.quantity === "number" && Number.isFinite(trade.quantity) ? trade.quantity : null,
    quantity_type: trade.quantity_type,
    evidence: [],
  };

  let dropped = 0;
  const seen = new Set<string>();
  for (const e of trade.evidence) {
    const quote = locateQuote(transcript, e.quote);
    const key = `${e.field}\u0000${quote}`;
    if (!quote || cleaned[e.field] === null || seen.has(key)) {
      dropped++;
      continue;
    }
    seen.add(key);
    cleaned.evidence.push({ field: e.field, quote } satisfies Evidence);
  }
  return { trade: cleaned, droppedEvidence: dropped };
}

const VALUE_FIELDS = ["direction", "isin", "fund_name", "account_no", "account_name", "caller_name", "currency", "quantity", "quantity_type"] as const;

function hasAnyField(trade: ExtractedTrade): boolean {
  return VALUE_FIELDS.some((f) => trade[f] !== null);
}

export function cleanExtraction(extraction: Extraction, transcript: string): { extraction: Extraction; droppedEvidence: number } {
  let droppedEvidence = 0;
  const trades = extraction.trades
    .map((t) => {
      const result = cleanTrade(t, transcript);
      droppedEvidence += result.droppedEvidence;
      return result.trade;
    })
    .filter(hasAnyField); // models sometimes add an all-null "phantom" trade
  return {
    extraction: { trades, unreadable_reason: cleanString(extraction.unreadable_reason) },
    droppedEvidence,
  };
}
