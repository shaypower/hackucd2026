import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DeskStatsCards } from "./stats";
import { listRecentTrades } from "@/lib/db/trades";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/trades/status";

export const metadata: Metadata = { title: "Trades · TelDeal" };

async function TradeTable() {
  await connection();
  const trades = await listRecentTrades(50);
  if (trades.length === 0) {
    return (
      <p className="text-muted-foreground">
        No trades yet. <Link href="/desk" className="underline">Capture one on the dealing desk.</Link>
      </p>
    );
  }
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Received</th>
            <th className="py-2 pr-3 font-medium">Instruction</th>
            <th className="py-2 pr-3 font-medium">Account</th>
            <th className="py-2 pr-3 text-right font-medium">Quantity</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b hover:bg-muted/50">
              <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{fmtTime(t.created_at)}</td>
              <td className="py-2 pr-3">
                <Link href={`/trades/${t.id}`} className="font-medium hover:underline">
                  {t.direction ? t.direction[0].toUpperCase() + t.direction.slice(1) : "Trade"} <span className="font-mono">{t.isin ?? "—"}</span>
                </Link>
              </td>
              <td className="py-2 pr-3 font-mono">{t.account_no ?? "—"}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{t.quantity === null ? "—" : new Intl.NumberFormat("en-IE").format(t.quantity)}</td>
              <td className="py-2">
                {t.blocked && t.status === "needs_review" ? (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-red-900 dark:bg-red-950 dark:text-red-200">Blocked</span>
                ) : (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TradesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
        <p className="text-muted-foreground">Every instruction captured on the desk, with what the checks and callbacks caught.</p>
      </header>
      <Suspense fallback={<div className="h-20 animate-pulse rounded-md bg-muted" />}>
        <DeskStatsCards />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading trades…</p>}>
        <TradeTable />
      </Suspense>
    </main>
  );
}
