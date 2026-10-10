"use client";
// Landing container: subscription status, Stripe Checkout (sandbox), confirmation on return, then into the desk.
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { SubscribeCard } from "@/components/billing/SubscribeCard";
import { Button } from "@/components/ui/button";
import { PLAN } from "@/lib/billing/plan";
import type { Subscription, UiError } from "@/lib/types";
import { cn } from "@/lib/utils";

type Billing = Subscription & { configured: boolean };

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw (data?.error as UiError) ?? { code: "internal", message: `Request failed (${res.status}).` };
  return data as T;
}

export function LandingGate() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    void (async () => {
      if (sessionId) {
        // Back from Stripe: confirm the payment with Stripe and activate the desk.
        try {
          await call("POST", "/api/billing/confirm", { session_id: sessionId });
          setPaid(true);
        } catch (e) {
          setError(e as UiError);
        }
      } else if (params.get("canceled")) {
        setNotice("Checkout was canceled. No payment was taken.");
      } else if (params.get("locked")) {
        setNotice("Subscribe to open the dealing desk.");
      }
      if (params.size > 0) window.history.replaceState(null, "", "/#plan");
      try {
        setBilling(await call<Billing>("GET", "/api/billing"));
      } catch (e) {
        setError(e as UiError);
      }
    })();
  }, []);

  async function subscribe() {
    setPending(true);
    setError(null);
    try {
      const { url } = await call<{ url: string }>("POST", "/api/billing/checkout");
      window.location.assign(url);
    } catch (e) {
      setError(e as UiError);
      setPending(false);
    }
  }

  const active = billing?.status === "active";
  const open = active || billing?.configured === false; // without Stripe keys (local dev) the desk stays open
  const steps = [
    { label: "Subscribe in the Stripe sandbox", done: active },
    { label: "Payment confirmed with Stripe", done: active },
    { label: "Open the dealing desk", done: false },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {billing ? (
        <SubscribeCard subscription={billing} priceLabel={PLAN.priceLabel} features={PLAN.features} pending={pending} error={error} onSubscribe={subscribe} />
      ) : (
        <div aria-busy="true" className="h-[22rem] w-full max-w-xl animate-pulse rounded-xl border border-border bg-muted">
          {error && <p className="p-5 text-sm text-fail">{error.message}</p>}
        </div>
      )}

      <section aria-label="Then open the desk" className="flex flex-col gap-4 rounded-xl border border-border bg-paper px-5 py-5 sm:px-7">
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Then</p>
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3 border-b border-border py-3 text-[14.5px] last:border-b-0">
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition-colors duration-300",
                  s.done ? "border-pass bg-pass text-primary-foreground" : "border-line-strong text-muted-foreground",
                )}
              >
                {s.done ? <Check aria-label="Done" className="size-3.5" strokeWidth={2.4} /> : i + 1}
              </span>
              <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </li>
          ))}
        </ol>
        {paid && (
          <p role="status" className="animate-in rounded-md bg-pass-wash px-3 py-2 text-[13.5px] font-medium text-pass duration-300 fade-in">
            Payment received. The desk is unlocked.
          </p>
        )}
        {notice && !paid && <p className="rounded-md bg-muted px-3 py-2 text-[13.5px]">{notice}</p>}
        {billing?.configured === false && !active && <p className="text-[13px] text-muted-foreground">Stripe isn&apos;t configured on this deployment, so the desk is open.</p>}
        {open ? (
          <Button size="lg" nativeButton={false} render={<Link href="/desk" />} className="h-11 w-full px-5 text-[15px] sm:w-fit">
            Open the dealing desk
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button size="lg" disabled className="h-11 w-full px-5 text-[15px] sm:w-fit">
            <Lock aria-hidden="true" />
            Subscribe to open the desk
          </Button>
        )}
      </section>
    </div>
  );
}
