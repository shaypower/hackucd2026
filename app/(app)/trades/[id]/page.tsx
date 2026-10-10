import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TradeWorkspace } from "../../trade-workspace";
import { getRegister } from "@/lib/db/get-register";
import { getTradeDetail, NotFoundError } from "@/lib/db/trades";
import { STATUS_LABEL } from "@/lib/trades/status";

async function SavedTrade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { register } = await getRegister();
  const detail = await getTradeDetail(id, register).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const received = new Date(detail.trade.created_at).toLocaleString("en-IE", { timeZone: "Europe/Dublin", dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Received {received} · {STATUS_LABEL[detail.trade.status]} · <span className="font-mono">{detail.trade.id}</span>
      </p>
      <TradeWorkspace initial={detail} />
    </>
  );
}

export default function TradePage({ params }: PageProps<"/trades/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8 sm:px-10 sm:py-10">
      <Link href="/trades" className="w-fit font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline">
        ← All trades
      </Link>
      <h1 className="sr-only">Trade</h1>
      <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-xl border border-border bg-muted" />}>
        <SavedTrade params={params} />
      </Suspense>
    </main>
  );
}
