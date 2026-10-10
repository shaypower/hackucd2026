"use client";
// Verify: the call as a script with evidence quotes, beside a ledger of extracted fields and their checks.
// Selecting a field highlights and scrolls to its quote; selecting a quote opens its field. Props only.
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check as CheckIcon, Pencil, Phone, TriangleAlert, X } from "lucide-react";
import { StatusMark } from "@/components/shell/status-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_LABELS, FIELDS, MONO_FIELDS, byRank, display, scriptLines, segments, worst } from "@/components/trade/field-meta";
import type { TradeReviewProps } from "@/components/trade/types";
import type { Check, CheckStatus, TradeField } from "@/lib/types";
import { cn } from "@/lib/utils";

const OVERALL_LABEL: Record<CheckStatus, string> = { pass: "All checks passed", warn: "Needs review", fail: "Blocked" };
const ICON = { pass: CheckIcon, warn: TriangleAlert, fail: X } satisfies Record<CheckStatus, unknown>;
const ICON_TONE: Record<CheckStatus, string> = { pass: "text-pass", warn: "text-warn", fail: "text-fail" };

function scrollNear(el: Element | null | undefined) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
}

function CheckLine({ check, pending, onUse }: { check: Check; pending: boolean; onUse?: () => void }) {
  const Icon = ICON[check.status];
  return (
    <li className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5 border-t border-border py-2 text-[13px] first:border-t-0">
      <Icon
        aria-label={check.status === "pass" ? "Passed" : check.status === "warn" ? "Needs review" : "Failed"}
        className={cn("mt-0.5 size-4", ICON_TONE[check.status])}
        strokeWidth={2.2}
      />
      <span>
        {check.message}
        {onUse && (
          <Button type="button" size="xs" variant="outline" className="ml-2 font-mono" disabled={pending} onClick={onUse}>
            Use {check.suggestion}
          </Button>
        )}
      </span>
    </li>
  );
}

export function TradeReview({ trade, pending, error, onEditField, canProceed, onProceedToCallback, recordingUrl, sourceLabel }: TradeReviewProps) {
  const [selected, setSelected] = useState<TradeField | null>(null);
  const [editing, setEditing] = useState<TradeField | null>(null);
  const [draft, setDraft] = useState("");
  // The edit form stays open until the save succeeds, so a failed save keeps what the agent typed.
  const [submitted, setSubmitted] = useState<TradeField | null>(null);
  const saved = submitted !== null && submitted === editing && !pending && !error;
  const openEdit = saved ? null : editing;
  const quoteEls = useRef(new Map<TradeField, HTMLElement>());
  const rowEls = useRef(new Map<TradeField, HTMLElement>());

  const { transcript, extracted, checks } = trade;
  const lines = useMemo(() => scriptLines(segments(transcript, extracted.evidence)), [transcript, extracted.evidence]);
  const quoted = useMemo(
    () => new Set(extracted.evidence.filter((e) => e.quote && transcript.includes(e.quote)).map((e) => e.field)),
    [extracted.evidence, transcript],
  );

  const overall = worst(checks) ?? "pass";
  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const c of checks) counts[c.status]++;
  const tradeChecks = checks.filter((c) => c.field === null).sort(byRank);
  const approved = trade.status === "approved";
  const fieldNo = (f: TradeField) => FIELDS.indexOf(f) + 1;

  function selectFromRow(field: TradeField) {
    const next = selected === field ? null : field;
    setSelected(next);
    if (editing !== field) setEditing(null);
    if (next) requestAnimationFrame(() => scrollNear(quoteEls.current.get(next)));
  }
  function selectFromQuote(fields: TradeField[]) {
    const next =
      fields.includes(selected as TradeField) && fields.length > 1 ? fields[(fields.indexOf(selected as TradeField) + 1) % fields.length] : fields[0];
    setSelected(next);
    setEditing(null);
    requestAnimationFrame(() => scrollNear(rowEls.current.get(next)));
  }
  function startEdit(field: TradeField) {
    const value = extracted[field];
    setDraft(value === null ? "" : String(value));
    setSubmitted(null);
    setEditing(field);
  }

  const failing = checks.filter((c) => c.status === "fail");
  const warning = checks.filter((c) => c.status === "warn");
  const contact = trade.nominated_callback;
  const next = approved
    ? { tone: "pass" as const, title: "Approved", text: "This trade is approved and locked." }
    : failing.length > 0
      ? {
          tone: "fail" as const,
          title: `Blocked · ${failing.length} failed check${failing.length > 1 ? "s" : ""}`,
          text: `${failing[0].message} Fix it before calling back.`,
        }
      : warning.length > 0
        ? {
            tone: "warn" as const,
            title: `Review ${warning.length} warning${warning.length > 1 ? "s" : ""}`,
            text: contact ? `Then call back ${contact.name} on the registered number.` : "Then call back the registered contact.",
          }
        : {
            tone: "pass" as const,
            title: "Ready for callback",
            text: contact ? `Next: call back ${contact.name} on ${contact.phone}, from the register.` : "Next: call back the registered contact.",
          };
  const NextIcon = ICON[next.tone];

  const title = [display(extracted.direction, "direction"), extracted.isin].filter((v) => v && v !== "—").join(" ") || "Trade";

  return (
    <section
      aria-label={`Review: ${title}`}
      className="relative animate-in overflow-hidden rounded-xl border border-border bg-paper duration-500 ease-out fade-in slide-in-from-bottom-2"
    >
      {pending && (
        <div role="progressbar" aria-label="Saving" className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-copper/15">
          <div className="td-progress h-full w-1/3 bg-copper" />
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border px-5 pt-5 pb-4 sm:px-7">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            Verify · <span title={trade.id}>{trade.id.length > 12 ? trade.id.slice(0, 8) : trade.id}</span>
            {trade.channel === "phone" ? " · phone line" : ""}
          </p>
          <h2 className="mt-1.5 font-serif text-[28px] leading-tight tracking-[-0.015em]">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[extracted.fund_name, extracted.account_name && `${extracted.account_name}${extracted.account_no ? ` · ${extracted.account_no}` : ""}`]
              .filter(Boolean)
              .join(" · ") || "Fund and account not stated"}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <StatusMark status={overall} label={OVERALL_LABEL[overall]} className={overall === "pass" ? "bg-pass-wash px-2" : undefined} />
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {checks.length} checks · {counts.pass} passed · {counts.warn} review · {counts.fail} failed
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        {/* Evidence */}
        <section aria-label="Call transcript" className="border-b border-border px-5 py-5 sm:px-7 lg:border-r lg:border-b-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Source evidence</h3>
            <p className="text-xs text-muted-foreground">Underlined words are where each value came from</p>
          </div>
          {sourceLabel && (
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Phone aria-hidden="true" className="size-4 text-copper-ink" />
              {sourceLabel}
            </p>
          )}
          {recordingUrl && <audio controls preload="none" src={recordingUrl} className="mb-3 h-9 w-full" aria-label="Original call recording" />}
          <ol className="max-h-[26rem] overflow-y-auto pr-2 [scrollbar-width:thin]">
            {lines.map((line, i) => (
              <li key={i} className="grid grid-cols-1 gap-x-3 gap-y-0.5 py-1.5 sm:grid-cols-[64px_minmax(0,1fr)]">
                <span
                  className={cn(
                    "font-mono text-[10.5px] sm:pt-1 tracking-[0.08em] uppercase",
                    line.speaker && /caller|client|contact/i.test(line.speaker) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {line.speaker ?? ""}
                </span>
                <p
                  className={cn(
                    "font-serif text-[16.5px] leading-relaxed",
                    line.speaker && /agent|desk/i.test(line.speaker) ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {line.parts.map((p, j) =>
                    p.fields.length === 0 ? (
                      <span key={j}>{p.text}</span>
                    ) : (
                      <button
                        key={j}
                        type="button"
                        ref={(el) => {
                          if (el) p.fields.forEach((f) => quoteEls.current.set(f, el));
                        }}
                        aria-pressed={selected !== null && p.fields.includes(selected)}
                        aria-label={`Quote “${p.text}”, supports ${p.fields.map((f) => FIELD_LABELS[f]).join(", ")}`}
                        onClick={() => selectFromQuote(p.fields)}
                        className={cn(
                          "cursor-pointer rounded-[3px] px-0.5 text-left underline decoration-copper/55 decoration-[1.5px] underline-offset-[5px] transition-[background-color,box-shadow,text-decoration-color] duration-200 hover:bg-accent",
                          selected !== null && p.fields.includes(selected) && "bg-hilite text-foreground decoration-copper shadow-[0_0_0_3px_var(--hilite)]",
                        )}
                      >
                        {p.text}
                        <sup className="ml-0.5 font-mono text-[9.5px] text-copper-ink">{p.fields.map(fieldNo).join(",")}</sup>
                      </button>
                    ),
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Ledger */}
        <section aria-label="Extracted fields" className="flex flex-col px-5 py-5 sm:px-7">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">The trade, as read</h3>
            <p className="text-xs text-muted-foreground">
              <span className="border-b border-dashed border-input">AI proposal</span> · checks are code
            </p>
          </div>
          <ul>
            {FIELDS.map((field, i) => {
              const fieldChecks = checks.filter((c) => c.field === field).sort(byRank);
              const status = worst(fieldChecks);
              const isSel = selected === field;
              const quote = extracted.evidence.find((e) => e.field === field && e.quote && transcript.includes(e.quote))?.quote;
              return (
                <li
                  key={field}
                  ref={(el) => {
                    if (el) rowEls.current.set(field, el);
                  }}
                  className="animate-in border-b border-border fade-in fill-mode-both"
                  style={{ animationDelay: `${120 + i * 35}ms` }}
                >
                  <button
                    type="button"
                    aria-expanded={isSel}
                    aria-controls={isSel ? `field-${trade.id}-${field}` : undefined}
                    onClick={() => selectFromRow(field)}
                    className={cn(
                      "grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-t-lg px-1.5 py-2.5 text-left transition-colors duration-200 hover:bg-background/70 sm:grid-cols-[26px_104px_minmax(0,1fr)_auto]",
                      isSel && "bg-background",
                    )}
                  >
                    <span
                      className={cn(
                        "row-span-2 inline-flex size-[22px] items-center justify-center rounded-full border font-mono text-[10.5px] transition-colors duration-200 sm:row-span-1",
                        quoted.has(field) ? "border-copper/50 text-copper-ink" : "border-dashed border-input text-muted-foreground",
                        isSel && quoted.has(field) && "border-copper bg-copper text-white",
                      )}
                    >
                      {fieldNo(field)}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{FIELD_LABELS[field]}</span>
                    <span
                      className={cn(
                        "col-start-2 min-w-0 truncate text-[17px] font-medium tabular-nums sm:col-start-auto",
                        MONO_FIELDS.has(field) && "font-mono text-[15px] tracking-[0.02em]",
                        extracted[field] === null && "text-muted-foreground",
                      )}
                    >
                      {display(extracted[field], field)}
                    </span>
                    <span className="col-start-3 row-span-2 row-start-1 justify-self-end sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                      {status ? <StatusMark status={status} /> : <span className="text-xs text-muted-foreground">No check</span>}
                    </span>
                  </button>

                  {isSel && (
                    <div
                      id={`field-${trade.id}-${field}`}
                      className="animate-in rounded-b-lg bg-background px-1.5 pt-1 pb-4 duration-200 fade-in slide-in-from-top-1 sm:pl-[38px]"
                    >
                      {quote ? (
                        <>
                          <p className="font-serif text-[19px] leading-snug">“{quote}”</p>
                          <p className="mt-1 mb-3 font-mono text-[11px] text-muted-foreground">quote {fieldNo(field)} · exact words from the call</p>
                        </>
                      ) : (
                        <p className="mb-3 font-serif text-[16px] text-muted-foreground italic">Not stated in the call. Nothing to quote.</p>
                      )}
                      {fieldChecks.length > 0 && (
                        <ul className="mb-3" aria-label={`${FIELD_LABELS[field]} checks`}>
                          {fieldChecks.map((c) => (
                            <CheckLine
                              key={c.id}
                              check={c}
                              pending={pending}
                              onUse={c.suggestion && c.status !== "pass" && !approved ? () => onEditField(field, c.suggestion!) : undefined}
                            />
                          ))}
                        </ul>
                      )}
                      {approved ? null : openEdit === field ? (
                        <form
                          className="flex animate-in flex-col gap-2 duration-200 fade-in"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setSubmitted(field);
                            onEditField(field, draft);
                          }}
                        >
                          <label htmlFor={`edit-${field}`} className="text-[12.5px] font-semibold">
                            New value for {FIELD_LABELS[field].toLowerCase()}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Input
                              id={`edit-${field}`}
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              className={cn("h-9 max-w-xs bg-card", MONO_FIELDS.has(field) && "font-mono")}
                            />
                            <Button type="submit" disabled={pending || draft === String(extracted[field] ?? "")}>
                              Save
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            The quote stays as evidence. Checks re-run after saving, and an earlier callback no longer counts.
                          </p>
                        </form>
                      ) : (
                        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => startEdit(field)}>
                          <Pencil aria-hidden="true" />
                          Edit value
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {tradeChecks.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Whole-trade checks</h4>
              <ul>
                {tradeChecks.map((c) => (
                  <CheckLine key={c.id} check={c} pending={pending} />
                ))}
              </ul>
            </div>
          )}

          {contact && (
            <p className="mt-4 border-t border-border pt-3 text-[13px] text-muted-foreground">
              Callback contact, from the register: <strong className="font-semibold text-foreground">{contact.name}</strong>{" "}
              <span className="font-mono text-foreground">{contact.phone}</span>
              {contact.dialled_phone && (
                <span className="mt-1 block text-xs">
                  Demo: register numbers are fictional, so automated callbacks ring <span className="font-mono text-copper-ink">{contact.dialled_phone}</span>{" "}
                  instead.
                </span>
              )}
            </p>
          )}
        </section>
      </div>

      {error && (
        <div role="alert" className="flex animate-in gap-3 border-t border-fail/25 bg-fail-wash px-5 py-3 text-sm text-fail duration-200 fade-in sm:px-7">
          <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
          <span>
            <strong className="font-semibold">Edit not saved.</strong> {error.message}
          </span>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-forest px-5 py-3.5 text-[#f5f3ee] sm:px-7">
        <div className="flex min-w-0 items-center gap-3" aria-live="polite">
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
              next.tone === "pass" && "bg-[#9fd4b4]/15 text-[#9fd4b4]",
              next.tone === "warn" && "bg-copper-lit/15 text-copper-lit",
              next.tone === "fail" && "bg-[#f5ae9e]/15 text-[#f5ae9e]",
            )}
          >
            <NextIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold">{next.title}</p>
            <p className="text-[13px] text-[#f5f3ee]/75">{next.text}</p>
          </div>
        </div>
        {!approved && (
          <Button
            type="button"
            size="lg"
            disabled={!canProceed || pending}
            onClick={onProceedToCallback}
            className="h-10 bg-[#f5f3ee] px-4 text-foreground hover:bg-white disabled:bg-[#f5f3ee]/40"
          >
            Proceed to callback
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </footer>
    </section>
  );
}
