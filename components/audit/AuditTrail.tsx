// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import type { AuditTrailProps } from "@/components/audit/types";
import type { AuditEvent } from "@/lib/types";

const LABELS: Record<AuditEvent["type"], string> = {
  trade_created: "Instruction captured",
  field_edited: "Field corrected",
  callback_recorded: "Callback recorded",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported to Payments",
};

function describe(e: AuditEvent): string {
  const p = e.payload;
  switch (e.type) {
    case "trade_created":
      return `Read by ${p.model ?? "AI"} · ${p.checks_failed ?? 0} failed, ${p.checks_warned ?? 0} warnings`;
    case "field_edited":
      return `${String(p.field)}: ${JSON.stringify(p.from)} → ${JSON.stringify(p.to)}`;
    case "callback_recorded":
      return p.all_match
        ? `${p.contact ?? "Contact"} confirmed every field`
        : `${p.contact ?? "Contact"} disagreed on: ${(p.mismatched as string[] | undefined)?.join(", ")}`;
    case "exported":
      return String(p.file ?? "");
    default:
      return "";
  }
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AuditTrail({ events }: AuditTrailProps) {
  if (events.length === 0) return null;
  return (
    <section aria-label="Audit trail" className="rounded-md border p-3">
      <h3 className="mb-2 text-sm font-medium">Audit trail</h3>
      <ol className="flex flex-col gap-1 text-sm">
        {events.map((e) => (
          <li key={e.id} className="grid grid-cols-[5rem_1fr] gap-2 sm:grid-cols-[5rem_12rem_1fr]">
            <span className="font-mono text-muted-foreground">{time(e.at)}</span>
            <span className="font-medium">{LABELS[e.type]}</span>
            <span className="col-span-2 text-muted-foreground sm:col-span-1">
              {describe(e)} <span className="text-xs">· {e.actor}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
