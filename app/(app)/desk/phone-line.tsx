"use client";
// Phone line panel (Dev A container): shows the TelDeal number and polls for instructions that came in by phone.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TradeSummary } from "@/lib/db/trades";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/trades/status";

const PHONE = process.env.NEXT_PUBLIC_TELDEAL_PHONE;
const POLL_MS = 4000;

export function PhoneLine({ onOpen }: { onOpen: (tradeId: string) => void }) {
  const [calls, setCalls] = useState<TradeSummary[] | null>(null);
  const [seen, setSeen] = useState<Set<string> | null>(null); // ids present when the page opened
  const [failed, setFailed] = useState(false);
  const autoOpened = useRef(new Set<string>());

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch("/api/trades?channel=phone&limit=5", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TradeSummary[];
        if (stop) return;
        setCalls(data);
        setFailed(false);
        setSeen((s) => s ?? new Set(data.map((c) => c.id)));
      } catch {
        if (!stop) setFailed(true);
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  // Open a brand-new call automatically, so it pops up on the desk while everyone watches.
  useEffect(() => {
    const fresh = calls?.find((c) => seen && !seen.has(c.id) && !autoOpened.current.has(c.id));
    if (fresh) {
      autoOpened.current.add(fresh.id);
      onOpen(fresh.id);
    }
  }, [calls, seen, onOpen]);

  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <section aria-label="Phone line" className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">📞 Phone line</h2>
        {PHONE ? (
          <p className="text-sm">
            Call <strong className="font-mono">{PHONE}</strong>, give your name, account and instruction; it appears here about 20 s after you hang up.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Phone line not configured (set NEXT_PUBLIC_TELDEAL_PHONE).</p>
        )}
      </div>
      {failed && <p className="text-sm text-red-700 dark:text-red-300">Can&apos;t check for new calls right now; retrying…</p>}
      {calls && calls.length === 0 && <p className="text-sm text-muted-foreground">No phone instructions yet.</p>}
      {calls && calls.length > 0 && (
        <ul className="flex flex-col divide-y text-sm">
          {calls.map((c) => {
            const isNew = seen !== null && !seen.has(c.id);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                <span className="font-mono text-muted-foreground">{time(c.created_at)}</span>
                {isNew && <span className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-medium text-white">New</span>}
                <span className="font-mono">{c.caller_id ?? "unknown caller"}</span>
                <span>
                  {c.direction ?? "?"} {c.isin ?? "—"} · acct {c.account_no ?? "—"}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${c.blocked && c.status === "needs_review" ? "bg-red-100 text-red-900" : STATUS_STYLE[c.status]}`}>
                  {c.blocked && c.status === "needs_review" ? "Blocked" : STATUS_LABEL[c.status]}
                </span>
                <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => onOpen(c.id)}>
                  Open
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
