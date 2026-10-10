"use client";
// Trades list (Dev A container): rows link to the trade; delete is a demo reset (confirms, then refreshes).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Monitor, Phone, Trash2, X } from "lucide-react";
import { ApiClientError, deleteTrade } from "@/lib/api-client";
import type { TradeSummary } from "@/lib/db/trades";
import { statusChip } from "@/lib/trades/status";
import { cn } from "@/lib/utils";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function TradesTable({ trades }: { trades: TradeSummary[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(t: TradeSummary) {
    const what = `${t.direction ?? "trade"} ${t.isin ?? ""}`.trim();
    if (!window.confirm(`Delete this demo trade (${what}) and its audit trail? This can't be undone.`)) return;
    setDeleting(t.id);
    setError(null);
    try {
      await deleteTrade(t.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.error.message : "Couldn't delete the trade. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (trades.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted-foreground">
        No trades yet.{" "}
        <Link href="/desk" className="font-medium text-copper-ink underline underline-offset-4">
          Take one on the dealing desk.
        </Link>
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-paper">
      {error && (
        <p role="alert" className="flex items-center gap-2 border-b border-fail/25 bg-fail-wash px-5 py-2.5 text-[13px] text-fail">
          <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
          {error}
        </p>
      )}
      <div className="relative overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              <th className="py-3 pr-3 pl-5 font-medium">Received</th>
              <th className="py-3 pr-3 font-medium">Source</th>
              <th className="py-3 pr-3 font-medium">Instruction</th>
              <th className="py-3 pr-3 font-medium">Account</th>
              <th className="py-3 pr-3 text-right font-medium">Quantity</th>
              <th className="py-3 pr-3 font-medium">Status</th>
              <th className="py-3 pr-5">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const chip = statusChip(t);
              return (
                <tr
                  key={t.id}
                  className={cn("border-b border-border transition-[background-color,opacity] duration-200 last:border-b-0 hover:bg-background", deleting === t.id && "opacity-40")}
                >
                  <td className="py-2.5 pr-3 pl-5 font-mono text-[12px] whitespace-nowrap text-muted-foreground tabular-nums">{fmtTime(t.created_at)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {t.channel === "phone" ? <Phone aria-hidden="true" className="size-3.5 text-copper-ink" /> : <Monitor aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                      {t.channel === "phone" ? <span className="font-mono text-[12.5px]">{t.caller_id ?? "Phone"}</span> : "Desk"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/trades/${t.id}`} className="font-medium whitespace-nowrap underline-offset-4 hover:underline">
                      {t.direction ? t.direction[0].toUpperCase() + t.direction.slice(1) : "Trade"} <span className="font-mono">{t.isin ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 font-mono">{t.account_no ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.quantity === null ? "—" : new Intl.NumberFormat("en-IE").format(t.quantity)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap", chip.style)}>{chip.label}</span>
                  </td>
                  <td className="py-2.5 pr-5 text-right">
                    <button
                      type="button"
                      disabled={deleting !== null}
                      onClick={() => remove(t)}
                      aria-label={`Delete demo trade ${t.direction ?? ""} ${t.isin ?? ""} received ${fmtTime(t.created_at)}`}
                      title="Delete demo trade"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-fail-wash hover:text-fail disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
