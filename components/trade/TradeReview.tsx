"use client";
// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import { Fragment, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TradeReviewProps } from "@/components/trade/types";
import type { Check, CheckStatus, Evidence, TradeField } from "@/lib/types";

const FIELD_LABELS: Record<TradeField, string> = {
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
const FIELDS = Object.keys(FIELD_LABELS) as TradeField[];

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  fail: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};
const STATUS_ICON: Record<CheckStatus, string> = { pass: "✓", warn: "!", fail: "✕" };
const RANK: Record<CheckStatus, number> = { pass: 0, warn: 1, fail: 2 };

function worst(checks: Check[]): CheckStatus | null {
  return checks.reduce<CheckStatus | null>((w, c) => (w === null || RANK[c.status] > RANK[w] ? c.status : w), null);
}

/** Splits the transcript into plain and highlighted segments for the evidence quotes. */
function segments(transcript: string, evidence: Evidence[]) {
  const ranges: { start: number; end: number; fields: TradeField[] }[] = [];
  for (const e of evidence) {
    const start = transcript.indexOf(e.quote);
    if (start === -1) continue;
    ranges.push({ start, end: start + e.quote.length, fields: [e.field] });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      last.fields.push(...r.fields);
    } else merged.push({ ...r, fields: [...r.fields] });
  }
  const out: { text: string; fields: TradeField[] }[] = [];
  let pos = 0;
  for (const r of merged) {
    if (r.start > pos) out.push({ text: transcript.slice(pos, r.start), fields: [] });
    out.push({ text: transcript.slice(r.start, r.end), fields: r.fields });
    pos = r.end;
  }
  if (pos < transcript.length) out.push({ text: transcript.slice(pos), fields: [] });
  return out;
}

function display(value: string | number | null, field: TradeField): string {
  if (value === null) return "—";
  if (field === "quantity" && typeof value === "number") return new Intl.NumberFormat("en-IE").format(value);
  return String(value);
}

export function TradeReview({ trade, pending, error, onEditField, canProceed, onProceedToCallback, recordingUrl, sourceLabel }: TradeReviewProps) {
  const [selected, setSelected] = useState<TradeField | null>(null);
  const [editing, setEditing] = useState<TradeField | null>(null);
  const [draft, setDraft] = useState("");
  const parts = useMemo(() => segments(trade.transcript, trade.extracted.evidence), [trade.transcript, trade.extracted.evidence]);

  const overall = worst(trade.checks) ?? "pass";
  const save = (field: TradeField) => {
    onEditField(field, draft);
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>
            {trade.extracted.direction ? trade.extracted.direction[0].toUpperCase() + trade.extracted.direction.slice(1) : "Trade"}{" "}
            {trade.extracted.isin ?? ""}
          </span>
          <Badge className={STATUS_STYLE[overall]}>
            {overall === "pass" ? "All checks passed" : overall === "warn" ? "Needs review" : "Blocked"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Transcript">
          {sourceLabel && <p className="mb-2 text-sm font-medium">📞 {sourceLabel}</p>}
          {recordingUrl && <audio controls preload="none" src={recordingUrl} className="mb-3 w-full" aria-label="Original call recording" />}
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Call transcript (highlighted: where each value came from)</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-sm leading-relaxed">
            {parts.map((p, i) =>
              p.fields.length === 0 ? (
                <Fragment key={i}>{p.text}</Fragment>
              ) : (
                <mark
                  key={i}
                  title={p.fields.map((f) => FIELD_LABELS[f]).join(", ")}
                  className={`rounded px-0.5 ${selected && p.fields.includes(selected) ? "bg-sky-300 dark:bg-sky-700" : "bg-yellow-100 dark:bg-yellow-900/60"}`}
                >
                  {p.text}
                </mark>
              ),
            )}
          </pre>
        </section>

        <section aria-label="Extracted fields" className="flex flex-col gap-4">
          <table className="w-full text-sm">
            <tbody>
              {FIELDS.map((field) => {
                const fieldChecks = trade.checks.filter((c) => c.field === field);
                const status = worst(fieldChecks);
                const value = trade.extracted[field];
                return (
                  <tr
                    key={field}
                    className={`border-b align-top ${selected === field ? "bg-sky-50 dark:bg-sky-950/40" : ""}`}
                    onMouseEnter={() => setSelected(field)}
                    onMouseLeave={() => setSelected(null)}
                  >
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-muted-foreground">
                      {FIELD_LABELS[field]}
                    </th>
                    <td className="py-2 pr-3 font-mono">
                      {editing === field ? (
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            save(field);
                          }}
                        >
                          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`New ${FIELD_LABELS[field]}`} className="h-8" />
                          <Button type="submit" size="sm" disabled={pending}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        display(value, field)
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {status && (
                        <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${STATUS_STYLE[status]}`} aria-label={status}>
                          {STATUS_ICON[status]}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {editing !== field && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            setDraft(value === null ? "" : String(value));
                            setEditing(field);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="flex flex-col gap-2" aria-label="Checks">
            {[...trade.checks]
              .sort((a, b) => RANK[b.status] - RANK[a.status])
              .map((c) => (
                <li key={c.id} className={`rounded-md px-3 py-2 text-sm ${STATUS_STYLE[c.status]}`}>
                  <span className="mr-2 font-bold">{STATUS_ICON[c.status]}</span>
                  {c.message}
                  {c.suggestion && c.field && c.status !== "pass" && (
                    <Button size="sm" variant="outline" className="ml-2 h-6" disabled={pending} onClick={() => onEditField(c.field!, c.suggestion!)}>
                      Use {c.suggestion}
                    </Button>
                  )}
                </li>
              ))}
          </ul>

          {trade.nominated_callback && (
            <p className="text-sm text-muted-foreground">
              Callback contact (from the register): <strong>{trade.nominated_callback.name}</strong>, {trade.nominated_callback.phone}
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {trade.status !== "approved" && (
            <div>
              <Button disabled={!canProceed || pending} onClick={onProceedToCallback}>
                Proceed to callback
              </Button>
              {trade.checks.some((c) => c.status === "fail") && (
                <p className="mt-2 text-sm text-muted-foreground">Fix the failed checks (✕) before calling back.</p>
              )}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
