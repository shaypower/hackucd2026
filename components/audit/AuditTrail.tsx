// Audit: an append-only timeline of what happened to the trade, oldest first. Props only.
import { Phone } from "lucide-react";
import type { AuditTrailProps } from "@/components/audit/types";
import type { AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<AuditEvent["type"], string> = {
  trade_created: "Instruction captured",
  field_edited: "Field corrected",
  callback_recorded: "Callback recorded",
  callback_call: "Callback call",
  callback_field_accepted: "Callback difference accepted",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported to Payments",
};

type Tone = "neutral" | "edit" | "warn" | "fail" | "pass";

const DOT: Record<Tone, string> = {
  neutral: "bg-paper ring-1 ring-line-strong",
  edit: "bg-copper",
  warn: "bg-warn",
  fail: "bg-fail",
  pass: "bg-pass",
};

function tone(e: AuditEvent): Tone {
  if (e.type === "field_edited" || e.type === "callback_field_accepted" || (e.type === "callback_call" && e.payload.status === "dialling")) return "edit";
  if (e.type === "callback_call") return "warn"; // ended without a confirmation: not reached, hung up, incomplete
  if (e.type === "rejected" || (e.type === "callback_recorded" && e.payload.all_match === false)) return "fail";
  if (e.type === "approved" || e.type === "exported") return "pass";
  return "neutral";
}

const fieldName = (f: unknown) => String(f ?? "field").replace(/_/g, " ");
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const value = (v: unknown) => (v === null || v === undefined || v === "" ? "empty" : String(v));

function describe(e: AuditEvent): string {
  const p = e.payload;
  switch (e.type) {
    case "trade_created": {
      const warned = Number(p.checks_warned ?? 0);
      return `Read by ${p.model ?? "AI"} · ${Number(p.checks_failed ?? 0)} failed, ${warned} warning${warned === 1 ? "" : "s"}`;
    }
    case "callback_recorded":
      return (
        (p.all_match
          ? `${p.contact ?? "Contact"} confirmed every field`
          : `${p.contact ?? "Contact"} disagreed on: ${((p.mismatched as string[] | undefined) ?? []).map(fieldName).join(", ") || "one or more fields"}`) +
        (p.channel === "phone" ? " (automated phone callback)" : "")
      );
    case "callback_call":
      return p.status === "dialling"
        ? `Calling ${p.contact ?? "nominated contact"}${p.demo_redirected_to ? ` (demo: redirected to ${p.demo_redirected_to})` : ""}`
        : sentence(String(p.status ?? ""));
    case "callback_field_accepted":
      if (p.corrected) return `${sentence(fieldName(p.field))}: heard ${value(p.from)}, corrected to ${value(p.to)} by the dealer`;
      return `${sentence(fieldName(p.field))}: ${value(p.callback)} accepted as ${value(p.original)}`;
    case "exported":
      return String(p.file ?? "");
    default:
      return "";
  }
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AuditTrail({ events }: AuditTrailProps) {
  if (events.length === 0) return null;
  return (
    <section aria-label="Audit trail" className="rounded-xl border border-border bg-paper">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-border px-5 pt-5 pb-4 sm:px-7">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Audit trail</p>
          <h3 className="mt-1 font-serif text-2xl leading-tight tracking-[-0.01em]">What happened, in order</h3>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {events.length} event{events.length === 1 ? "" : "s"} · append-only
        </p>
      </header>

      <ol className="px-5 py-3 sm:px-7">
        {events.map((e, i) => {
          const t = tone(e);
          const detail = describe(e);
          return (
            <li
              key={e.id}
              style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
              // The spine: a hairline from each dot down to the next.
              className="relative grid animate-in grid-cols-[7px_minmax(0,1fr)] gap-x-4 py-2.5 duration-300 fade-in fill-mode-both not-last:after:absolute not-last:after:top-[18px] not-last:after:-bottom-[18px] not-last:after:left-[3px] not-last:after:w-px not-last:after:bg-border"
            >
              <span aria-hidden="true" className={cn("relative z-10 mt-[5px] size-[7px] rounded-full", DOT[t])} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <time dateTime={e.at} className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {time(e.at)} <span className="text-[10px] tracking-[0.08em] uppercase">Dublin</span>
                  </time>
                  <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", t === "fail" && "text-fail", t === "pass" && "text-pass")}>
                    {e.type === "callback_call" && <Phone aria-hidden="true" className="size-3.5 text-copper-ink" strokeWidth={2.2} />}
                    {LABELS[e.type]}
                  </span>
                </p>
                {e.type === "field_edited" ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    {sentence(fieldName(e.payload.field))}:{" "}
                    <span className="font-mono">{value(e.payload.from)}</span> <span aria-label="changed to">→</span>{" "}
                    <span className="font-mono font-semibold text-copper-ink">{value(e.payload.to)}</span>
                  </p>
                ) : (
                  detail && <p className={cn("text-[12.5px] break-words", t === "fail" ? "text-fail" : t === "warn" ? "text-warn" : "text-muted-foreground")}>{detail}</p>
                )}
                <p className="text-[11.5px] text-muted-foreground">{e.actor}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
