// Shared presentation helpers for trade fields: labels, display values, check ranking, evidence segments.
import type { Check, CheckStatus, Evidence, TradeField } from "@/lib/types";

export const FIELD_LABELS: Record<TradeField, string> = {
  direction: "Direction",
  isin: "ISIN",
  fund_name: "Fund",
  account_no: "Account no.",
  account_name: "Account name",
  caller_name: "Caller",
  currency: "Currency",
  quantity: "Quantity",
  quantity_type: "Units / cash",
};
export const FIELDS = Object.keys(FIELD_LABELS) as TradeField[];

/** Identifiers read best in mono. */
export const MONO_FIELDS = new Set<TradeField>(["isin", "account_no", "currency"]);

const RANK: Record<CheckStatus, number> = { pass: 0, warn: 1, fail: 2 };

export function worst(checks: Check[]): CheckStatus | null {
  return checks.reduce<CheckStatus | null>((w, c) => (w === null || RANK[c.status] > RANK[w] ? c.status : w), null);
}

export function byRank(a: Check, b: Check) {
  return RANK[b.status] - RANK[a.status];
}

export function display(value: string | number | null, field: TradeField): string {
  if (value === null || value === "") return "—";
  if (field === "quantity" && typeof value === "number") return new Intl.NumberFormat("en-IE").format(value);
  if (field === "direction" || field === "quantity_type") return String(value)[0].toUpperCase() + String(value).slice(1);
  return String(value);
}

export interface Segment {
  text: string;
  fields: TradeField[];
}

/** Splits the transcript into plain and quoted segments; each quote lists the fields it supports. */
export function segments(transcript: string, evidence: Evidence[]): Segment[] {
  const ranges: { start: number; end: number; fields: TradeField[] }[] = [];
  for (const e of evidence) {
    const start = transcript.indexOf(e.quote);
    if (start === -1 || e.quote.length === 0) continue;
    ranges.push({ start, end: start + e.quote.length, fields: [e.field] });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      last.fields = [...new Set([...last.fields, ...r.fields])];
    } else merged.push({ ...r, fields: [...r.fields] });
  }
  const out: Segment[] = [];
  let pos = 0;
  for (const r of merged) {
    if (r.start > pos) out.push({ text: transcript.slice(pos, r.start), fields: [] });
    out.push({ text: transcript.slice(r.start, r.end), fields: r.fields });
    pos = r.end;
  }
  if (pos < transcript.length) out.push({ text: transcript.slice(pos), fields: [] });
  return out;
}

/** Groups segments into transcript lines, pulling a leading "Speaker:" label off each line. */
export function scriptLines(parts: Segment[]): { speaker: string | null; parts: Segment[] }[] {
  const lines: { speaker: string | null; parts: Segment[] }[] = [{ speaker: null, parts: [] }];
  for (const part of parts) {
    const chunks = part.text.split("\n");
    chunks.forEach((chunk, i) => {
      if (i > 0) lines.push({ speaker: null, parts: [] });
      if (chunk) lines.at(-1)!.parts.push({ text: chunk, fields: part.fields });
    });
  }
  return lines
    .map((line) => {
      const first = line.parts[0];
      const m = first && first.fields.length === 0 ? /^\s*([A-Z][\w .'-]{0,24}):\s?/.exec(first.text) : null;
      if (!m) return line;
      const rest = first.text.slice(m[0].length);
      return { speaker: m[1], parts: rest ? [{ text: rest, fields: [] }, ...line.parts.slice(1)] : line.parts.slice(1) };
    })
    .filter((line) => line.speaker !== null || line.parts.some((p) => p.text.trim()));
}
