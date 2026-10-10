import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoRefresh } from "./auto-refresh";
import { DeskStatsCards } from "./stats";
import { TradesTable } from "./trades-table";
import { DeskCountsSkeleton } from "@/components/landing/landing-blocks";
import { listRecentTrades } from "@/lib/db/trades";

export const metadata: Metadata = { title: "Trades · TelDeal" };

async function TradeTable() {
  await connection();
  return <TradesTable trades={await listRecentTrades(50)} />;
}

export default function TradesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-10 sm:py-10">
      <header className="flex animate-in flex-wrap items-end justify-between gap-4 duration-500 ease-out fade-in fill-mode-both slide-in-from-bottom-2">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Desk ledger</p>
          <h1 className="font-serif text-4xl leading-none tracking-[-0.018em] sm:text-[44px]">Trades</h1>
          <p className="max-w-xl text-[15px] text-muted-foreground">Every instruction captured on the desk or the phone line, with what the checks and callbacks caught.</p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1 text-[12.5px] font-medium">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-pass opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-pass" />
          </span>
          Updates live
        </p>
      </header>
      <AutoRefresh />
      <Suspense fallback={<DeskCountsSkeleton />}>
        <DeskStatsCards />
      </Suspense>
      <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse rounded-xl border border-border bg-muted" />}>
        <TradeTable />
      </Suspense>
    </main>
  );
}
