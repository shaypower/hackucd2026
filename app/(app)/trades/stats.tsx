// Live counts from the audit trail. Server component; render inside <Suspense>.
import { connection } from "next/server";
import { getDeskStats } from "@/lib/db/trades";

export async function DeskStatsCards() {
  await connection();
  const s = await getDeskStats();
  const cards = [
    { label: "Instructions captured", value: s.trades, tone: "" },
    { label: "Blocked by checks", value: s.blockedByChecks, tone: "text-red-700 dark:text-red-300", hint: "wrong ISIN, unknown account, unauthorised caller…" },
    { label: "Callback mismatches caught", value: s.callbackMismatches, tone: "text-red-700 dark:text-red-300" },
    { label: "Approved", value: s.approved, tone: "text-emerald-700 dark:text-emerald-300" },
    { label: "Sent to Payments", value: s.exported, tone: "" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border p-3">
          <dt className="text-xs text-muted-foreground">{c.label}</dt>
          <dd className={`text-2xl font-semibold tabular-nums ${c.tone}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
