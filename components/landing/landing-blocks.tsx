// Landing page blocks: section heads, how it works, and live desk counts. Presentational only.
import type { DeskStats } from "@/lib/db/trades";
import { cn } from "@/lib/utils";

// Entrance: blocks rise in, staggered. Reduced motion collapses it (globals.css).
const RISE = "animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-both";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Section heading in the B1 style: serif title over a hairline, mono aside. */
export function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-foreground pb-3">
      <h2 className="font-serif text-2xl tracking-[-0.01em]">{title}</h2>
      {aside && <span className="font-mono text-[11.5px] text-muted-foreground">{aside}</span>}
    </div>
  );
}

export function HowItWorks({ steps }: { steps: [title: string, body: string][] }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
      {steps.map(([title, body], i) => (
        <li
          key={title}
          style={delay(120 + i * 60)}
          className={cn(RISE, "flex flex-col gap-1.5 bg-paper p-5 sm:last:col-span-2 lg:last:col-span-1")}
        >
          <span className="font-mono text-[11px] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
          <span className="font-serif text-xl tracking-[-0.01em]">{title}</span>
          <span className="text-[13px] leading-relaxed text-muted-foreground">{body}</span>
        </li>
      ))}
    </ol>
  );
}

export function DeskCounts({ stats }: { stats: DeskStats }) {
  const cells = [
    { label: "Instructions captured", value: stats.trades, tone: "" },
    { label: "Blocked by checks", value: stats.blockedByChecks, tone: "text-fail" },
    { label: "Callback mismatches caught", value: stats.callbackMismatches, tone: "text-fail" },
    { label: "Approved", value: stats.approved, tone: "text-pass" },
    { label: "Sent to Payments", value: stats.exported, tone: "" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
      {cells.map((c, i) => (
        <div key={c.label} style={delay(i * 60)} className={cn(RISE, "flex flex-col-reverse justify-end gap-1 bg-paper p-5", i === 0 && "col-span-2 sm:col-span-1")}>
          <dt className="text-[12.5px] text-muted-foreground">{c.label}</dt>
          <dd className={cn("font-serif text-4xl leading-none tabular-nums", c.tone)}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DeskCountsSkeleton() {
  return <div aria-hidden="true" className="h-[106px] animate-pulse rounded-xl border border-border bg-muted" />;
}
