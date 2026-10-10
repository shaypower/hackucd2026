"use client";
// Phone line panel (Dev A container): shows the TelDeal number and polls for instructions that came in by phone.
import { useEffect, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeSummary } from "@/lib/db/trades";
import { statusChip } from "@/lib/trades/status";
import { cn } from "@/lib/utils";

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

  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <section aria-label="Phone line" className="overflow-hidden rounded-xl border border-border bg-paper">
      <div className="grid items-center gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            <span aria-hidden="true" className="relative flex size-2">
              {PHONE && !failed && <span className="absolute inline-flex size-full animate-ping rounded-full bg-pass opacity-50" />}
              <span className={cn("relative inline-flex size-2 rounded-full", PHONE && !failed ? "bg-pass" : "bg-line-strong")} />
            </span>
            Phone line {PHONE && !failed ? "· live" : ""}
          </p>
          <h2 className="font-serif text-2xl leading-tight tracking-[-0.01em]">Call the desk</h2>
          <p className="max-w-md text-[13.5px] text-muted-foreground">
            {PHONE
              ? "Give your name, account and instruction. The trade appears here about 20 seconds after you hang up."
              : "Phone line not configured: set NEXT_PUBLIC_TELDEAL_PHONE."}
          </p>
        </div>
        {PHONE && (
          <a
            href={`tel:${PHONE.replace(/\s/g, "")}`}
            className="flex items-center justify-center gap-3 rounded-xl bg-night px-5 py-4 text-[#f5f3ee] transition-colors duration-200 hover:bg-forest sm:justify-self-end"
          >
            <Phone aria-hidden="true" className="size-5 text-copper-lit" />
            <span className="font-mono text-xl tracking-[0.04em] tabular-nums sm:text-2xl">{PHONE}</span>
          </a>
        )}
      </div>

      {failed && <p className="border-t border-border bg-fail-wash px-5 py-2.5 text-[13px] text-fail sm:px-7">Can&apos;t check for new calls right now; retrying…</p>}
      {calls && calls.length === 0 && <p className="border-t border-border px-5 py-3 text-[13px] text-muted-foreground sm:px-7">No phone instructions yet.</p>}
      {calls && calls.length > 0 && (
        <ul className="border-t border-border">
          {calls.map((c) => {
            const isNew = seen !== null && !seen.has(c.id);
            const chip = statusChip(c);
            return (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border px-5 py-2.5 text-[13.5px] last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,11rem)_minmax(0,1fr)_auto_auto] sm:px-7"
              >
                <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{time(c.created_at)}</span>
                <span className="hidden truncate font-mono text-[12.5px] sm:block">{c.caller_id ?? "Unknown caller"}</span>
                <span className="col-span-2 min-w-0 truncate sm:col-span-1">
                  {isNew && <span className="mr-2 rounded bg-copper px-1.5 py-0.5 text-[11px] font-semibold text-white">New</span>}
                  {c.direction ? c.direction[0].toUpperCase() + c.direction.slice(1) : "Trade"} <span className="font-mono">{c.isin ?? "—"}</span>
                  <span className="text-muted-foreground"> · acct </span>
                  <span className="font-mono">{c.account_no ?? "—"}</span>
                </span>
                <span className={cn("w-fit rounded-md px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap", chip.style)}>{chip.label}</span>
                <Button size="sm" variant="outline" className="h-7 justify-self-end" onClick={() => onOpen(c.id)}>
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
