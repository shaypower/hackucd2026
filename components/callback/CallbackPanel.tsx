"use client";
// Callback: who to call (register only), the callback transcript, and a field-by-field comparison with
// the original instruction. Mismatches block approval; once approved, the Payments file downloads. Props only.
import { useState } from "react";
import { ArrowRight, Ban, Check as CheckIcon, Copy, Download, Info, Loader2, Phone, PhoneOutgoing, Users, X } from "lucide-react";
import { StatusMark } from "@/components/shell/status-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { FIELD_LABELS, MONO_FIELDS, display } from "@/components/trade/field-meta";
import type { CallbackPanelProps } from "@/components/callback/types";
import type { FieldDiff } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The TelDeal double rule: two hairlines when values agree, struck through when they differ. */
function Agreement({ diff, independent }: { diff: FieldDiff; independent: boolean }) {
  if (independent) {
    return (
      <svg role="img" aria-label="Independent confirmation" width="30" height="14" viewBox="0 0 30 14" fill="none">
        <path d="M4 7h8M18 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground" />
        <circle cx="15" cy="7" r="1.8" fill="var(--copper)" />
      </svg>
    );
  }
  return diff.match ? (
    <svg role="img" aria-label="Matches" width="30" height="14" viewBox="0 0 30 14" fill="none">
      <path d="M4 5h22M4 9h22" stroke="var(--pass)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg role="img" aria-label="Differs" width="30" height="22" viewBox="0 0 30 22" fill="none">
      <path d="M4 9h22M4 13h22" stroke="var(--fail)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 3L12 19" stroke="var(--fail)" strokeWidth="1.8" strokeLinecap="round" className="td-strike" />
    </svg>
  );
}

export function CallbackPanel({
  trade,
  contact,
  callback,
  pending,
  error,
  onSubmitCallback,
  canApprove,
  approveBlockedReason,
  onApprove,
  samples = [],
  approved = false,
  exportUrl,
  onExport,
  onCallNow,
  calling = null,
  onAcceptField,
  acceptableFields = [],
}: CallbackPanelProps) {
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const shortId = trade.id.length > 12 ? trade.id.slice(0, 8) : trade.id;
  const rows = callback?.fields ?? [];
  const compared = rows.filter((f) => f.field !== "caller_name");
  const differing = compared.filter((f) => !f.match);
  const agree = compared.length - differing.length;
  const differNames = differing.map((f) => FIELD_LABELS[f.field].toLowerCase());

  const status = approved
    ? { s: "pass" as const, label: "Approved" }
    : !callback
      ? null
      : callback.all_match
        ? { s: "pass" as const, label: "Confirmed" }
        : { s: "fail" as const, label: differing.length === 1 ? `${FIELD_LABELS[differing[0].field]} differs` : `${differing.length} fields differ` };

  async function copyNumber() {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  // A name difference the dealer may accept after checking it; key fields never can.
  const canAccept = (field: FieldDiff["field"]) => !approved && !!onAcceptField && acceptableFields.includes(field);
  const onlyNamesDiffer = differing.length > 0 && differing.every((f) => acceptableFields.includes(f.field));

  function outcome(f: FieldDiff) {
    if (f.field === "caller_name") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
          <Users aria-hidden="true" className="size-3.5" />
          {f.original && f.callback && display(f.original, f.field) !== display(f.callback, f.field) ? "Independent" : "Same person"}
        </span>
      );
    }
    if (!f.match) {
      return (
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusMark status="fail" label="Differs" />
          {canAccept(f.field) ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => onAcceptField?.(f.field)}
              title="Accept this name difference after checking it"
            >
              Accept
            </Button>
          ) : (
            <span className="text-[11.5px] text-muted-foreground">Key field: call again</span>
          )}
        </span>
      );
    }
    if (f.accepted) {
      return (
        <span title="Accepted by the dealer">
          <StatusMark status="pass" label="Accepted" />
        </span>
      );
    }
    if (f.callback === null) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Info aria-hidden="true" className="size-3.5" />
          Not restated
        </span>
      );
    }
    return <StatusMark status="pass" label="Match" />;
  }

  const next = approved
    ? { tone: "pass" as const, title: "Approved", text: "Download the Payments file. Generating it does not send it to Payments or execute the trade." }
    : canApprove
      ? { tone: "pass" as const, title: "Ready to approve", text: "Every trade field agrees with the original instruction." }
      : {
          tone: callback && !callback.all_match ? ("fail" as const) : ("wait" as const),
          title: callback && !callback.all_match ? "Approval blocked" : "Approval locked",
          text: approveBlockedReason ?? "Record the callback first.",
        };

  return (
    <section
      aria-label="Callback"
      className="relative animate-in overflow-hidden rounded-xl border border-border bg-paper duration-500 ease-out fade-in slide-in-from-bottom-2"
    >
      {pending && (
        <div role="progressbar" aria-label="Working" className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-copper/15">
          <div className="td-progress h-full w-1/3 bg-copper" />
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border px-5 pt-5 pb-4 sm:px-7">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            Callback · <span title={trade.id}>{shortId}</span>
          </p>
          <h2 className="mt-1.5 font-serif text-[28px] leading-tight tracking-[-0.015em]">Confirm with the registered contact</h2>
        </div>
        {status ? (
          <StatusMark
            key={status.label}
            status={status.s}
            label={status.label}
            className={cn("animate-in zoom-in-95 duration-300 fade-in", status.s === "pass" && "bg-pass-wash px-2")}
          />
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">Not recorded yet</span>
        )}
      </header>

      {/* Who to call */}
      <div className="grid gap-x-10 gap-y-4 border-b border-border px-5 py-5 sm:px-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {contact ? (
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Who to call</p>
            <p className="mt-2 font-serif text-[26px] leading-tight">{contact.name}</p>
            <p className="text-[13px] text-muted-foreground">Nominated contact for account {contact.account_no}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[22px] tracking-[0.02em] tabular-nums">{contact.phone}</span>
              <Button type="button" variant="outline" size="sm" onClick={copyNumber} aria-live="polite">
                {copied ? <CheckIcon aria-hidden="true" className="text-pass" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy number"}
              </Button>
            </div>
            {contact.dialled_phone && (
              <p className="mt-2 text-xs text-muted-foreground">
                Demo: register numbers are fictional, so automated callbacks ring <span className="font-mono text-copper-ink">{contact.dialled_phone}</span>{" "}
                instead.
              </p>
            )}
          </div>
        ) : (
          <div role="alert" className="flex gap-3 rounded-lg border border-fail/30 bg-fail-wash p-4 text-sm text-fail">
            <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
            <div>
              <p className="font-semibold">No nominated callback contact</p>
              <p className="text-foreground/80">The register has no callback contact for this account. Escalate before dealing.</p>
            </div>
          </div>
        )}
        <ul className="flex flex-col gap-3 self-center text-[13px] text-muted-foreground">
          <li className="flex gap-2.5">
            <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fail" />
            <span>
              <strong className="font-semibold text-foreground">Register only.</strong> Never use a number given during the original call.
            </span>
          </li>
          <li className="flex gap-2.5">
            <PhoneOutgoing aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Dial from your desk phone; TelDeal doesn&apos;t place calls. Paste what was said below.</span>
          </li>
          <li className="flex gap-2.5">
            <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>A different person confirming is expected; it isn&apos;t a mismatch.</span>
          </li>
        </ul>
      </div>

      {/* Automated callback: TelDeal's agent phones the nominated contact */}
      {!approved && onCallNow && (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Automated callback</p>
              <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
                TelDeal&apos;s agent asks the contact to <strong className="font-semibold text-foreground">state</strong> the instruction (it never reads it
                out), then compares it field by field.
              </p>
            </div>
            <Button type="button" size="lg" className="h-10 px-4" disabled={pending || calling !== null} onClick={onCallNow}>
              <Phone aria-hidden="true" />
              Call {contact?.name ?? "contact"} now
            </Button>
          </div>
          {calling && (
            <p role="status" className="flex animate-in items-center gap-2.5 rounded-lg bg-copper/10 px-3 py-2 text-[13px] fade-in">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-copper opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-copper" />
              </span>
              <span>
                <span className="font-semibold capitalize">{calling.status}</span> <span className="font-mono">{calling.to}</span>
                {calling.redirected && <span className="text-muted-foreground"> (demo: redirected from the register number)</span>}. The result appears here
                automatically.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Callback transcript */}
      {!approved && (
        <form
          className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:px-7"
          onSubmit={(e) => {
            e.preventDefault();
            if (transcript.trim() && !pending) onSubmitCallback(transcript);
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`cb-${trade.id}`} className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              {onCallNow ? "Or paste what the contact said" : "What the contact said"}
            </label>
            {samples.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Demo callbacks:</span>
                {samples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={pending}
                    aria-pressed={transcript === s.transcript}
                    onClick={() => setTranscript(s.transcript)}
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border border-dashed border-input px-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-muted-foreground hover:text-foreground disabled:opacity-50",
                      transcript === s.transcript && "border-solid border-foreground bg-foreground text-background hover:text-background",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            id={`cb-${trade.id}`}
            rows={5}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={pending}
            placeholder={"Agent: Hi, it's the dealing desk calling back to confirm…\nCaller: Yes, … speaking. Subscribe …"}
            className="w-full resize-y rounded-lg border border-input bg-white px-4 py-3 font-mono text-[13.5px] leading-relaxed transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/70 focus:border-copper focus:ring-3 focus:ring-copper/15 disabled:bg-background disabled:text-muted-foreground"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">The callback is read the same way as the original, then compared field by field in code.</p>
            <Button type="submit" size="lg" variant="outline" className="h-10 px-4" disabled={!transcript.trim() || pending}>
              {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {pending ? "Comparing…" : "Compare with original"}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="flex animate-in gap-3 border-b border-fail/25 bg-fail-wash px-5 py-3.5 text-sm text-fail duration-200 fade-in sm:px-7">
          <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
          <div>
            <p className="font-semibold">{error.code === "subscription_required" ? "Subscription required" : "Callback not checked"}</p>
            <p className="text-foreground/80">{error.message}</p>
          </div>
        </div>
      )}

      {/* Comparison */}
      {callback && (
        <div className="px-5 py-5 sm:px-7">
          <div
            key={callback.id}
            role="status"
            className={cn(
              "mb-5 flex animate-in flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3.5 duration-300 fade-in slide-in-from-top-1",
              callback.all_match ? "border-pass/30 bg-pass-wash" : "border-fail/30 bg-fail-wash",
            )}
          >
            <div className="flex items-center gap-2.5">
              {callback.all_match ? (
                <CheckIcon aria-hidden="true" className="size-5 text-pass" strokeWidth={2.2} />
              ) : (
                <X aria-hidden="true" className="size-5 text-fail" strokeWidth={2.2} />
              )}
              <div>
                <p className={cn("text-[16px] font-semibold", callback.all_match ? "text-pass" : "text-fail")}>
                  {callback.all_match
                    ? "Callback confirms every trade field"
                    : `Approval blocked — ${differNames.join(", ")} ${differing.length === 1 ? "differs" : "differ"}`}
                </p>
                {!callback.all_match && (
                  <p className="text-[13px] text-foreground/80">
                    {onlyNamesDiffer && onAcceptField
                      ? "Only a name differs. Check it, then accept it below, or call the contact again."
                      : "Don't deal. Call the registered contact again, or escalate."}
                  </p>
                )}
              </div>
            </div>
            <span className="font-mono text-[12px] text-foreground/80 tabular-nums">
              {agree} of {compared.length} fields agree
            </span>
          </div>

          {/* Phone: one block per field, original above callback, so nothing scrolls out of view. */}
          <ul className="flex flex-col sm:hidden" aria-label="Field comparison">
            {rows.map((f) => {
              const independent = f.field === "caller_name";
              const bad = !f.match && !independent;
              const mono = MONO_FIELDS.has(f.field);
              return (
                <li key={f.field} className={cn("border-b border-border px-2 py-3", bad && "td-flag rounded-md bg-fail-wash")}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted-foreground">{independent ? "Speaker" : FIELD_LABELS[f.field]}</span>
                    {outcome(f)}
                  </div>
                  <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[15px]">
                    <dt className="font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground uppercase">Original</dt>
                    <dd className={cn("font-medium tabular-nums", mono && "font-mono text-[14px]")}>{display(f.original, f.field)}</dd>
                    <dt className="font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground uppercase">Callback</dt>
                    <dd
                      className={cn("font-medium tabular-nums", mono && "font-mono text-[14px]", bad && "text-fail underline decoration-2 underline-offset-4")}
                    >
                      {display(f.callback, f.field)}
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">Original instruction compared with the callback, field by field</caption>
              <thead>
                <tr className="border-b border-foreground">
                  <th scope="col" className="w-32 pr-3 pb-2.5 font-mono text-[11px] font-normal tracking-[0.12em] text-muted-foreground uppercase">
                    Field
                  </th>
                  <th scope="col" className="pr-3 pb-2.5 font-mono text-[11px] font-normal tracking-[0.12em] text-muted-foreground uppercase">
                    Original call
                  </th>
                  <th scope="col" className="w-14 pb-2.5">
                    <span className="sr-only">Agreement</span>
                  </th>
                  <th scope="col" className="pr-3 pb-2.5 font-mono text-[11px] font-normal tracking-[0.12em] text-muted-foreground uppercase">
                    Callback
                  </th>
                  <th scope="col" className="w-44 pb-2.5 font-mono text-[11px] font-normal tracking-[0.12em] text-muted-foreground uppercase">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f, i) => {
                  const independent = f.field === "caller_name";
                  const bad = !f.match && !independent;
                  const mono = MONO_FIELDS.has(f.field);
                  const big = f.field === "quantity";
                  return (
                    <tr
                      key={f.field}
                      className={cn("animate-in border-b border-border fade-in fill-mode-both", bad && "td-flag bg-fail-wash")}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <th scope="row" className="py-3 pr-3 text-[13px] font-normal text-muted-foreground">
                        {independent ? "Speaker" : FIELD_LABELS[f.field]}
                      </th>
                      <td className={cn("py-3 pr-3 font-medium tabular-nums", mono ? "font-mono text-[14.5px]" : "text-[15.5px]", big && "text-[20px]")}>
                        {display(f.original, f.field)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex">
                          <Agreement diff={f} independent={independent} />
                        </span>
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-3 font-medium tabular-nums",
                          mono ? "font-mono text-[14.5px]" : "text-[15.5px]",
                          big && "text-[20px]",
                          bad && "text-fail underline decoration-2 underline-offset-[6px]",
                          f.callback === null && !bad && "text-muted-foreground",
                        )}
                      >
                        {display(f.callback, f.field)}
                      </td>
                      <td className="py-3">{outcome(f)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next action */}
      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-forest px-5 py-3.5 text-[#f5f3ee] sm:px-7">
        <div className="flex min-w-0 items-center gap-3" aria-live="polite">
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
              next.tone === "pass" && "bg-[#9fd4b4]/15 text-[#9fd4b4]",
              next.tone === "wait" && "bg-copper-lit/15 text-copper-lit",
              next.tone === "fail" && "bg-[#f5ae9e]/15 text-[#f5ae9e]",
            )}
          >
            {next.tone === "fail" ? (
              <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
            ) : next.tone === "pass" ? (
              <CheckIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />
            ) : (
              <Info aria-hidden="true" className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold">{next.title}</p>
            <p className="text-[13px] text-[#f5f3ee]/75">{next.text}</p>
          </div>
        </div>
        {approved ? (
          exportUrl && (
            <a
              href={exportUrl}
              download
              onClick={() => {
                setDownloaded(true);
                onExport?.();
              }}
              className={cn(buttonVariants({ size: "lg" }), "h-10 bg-[#f5f3ee] px-4 text-foreground hover:bg-white")}
            >
              <Download aria-hidden="true" />
              {downloaded ? "Download again (.xlsx)" : "Download Payments file (.xlsx)"}
            </a>
          )
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={!canApprove || pending}
            onClick={onApprove}
            className="h-10 bg-[#f5f3ee] px-4 text-foreground hover:bg-white disabled:bg-[#f5f3ee]/40"
          >
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Approve trade
            {!pending && <ArrowRight aria-hidden="true" />}
          </Button>
        )}
      </footer>
      {approved && downloaded && (
        <p className="animate-in border-t border-border bg-background px-5 py-2.5 text-xs text-muted-foreground fade-in sm:px-7">
          File generated. That doesn&apos;t mean Payments has received it; hand-off is confirmed outside TelDeal.
        </p>
      )}
    </section>
  );
}
