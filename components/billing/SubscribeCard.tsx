// The desk plan: price, what it unlocks, and Subscribe (Stripe Checkout, sandbox). Props only.
import { Check, Loader2, X } from "lucide-react";
import type { SubscribeCardProps } from "@/components/billing/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubscribeCard({ subscription, priceLabel, features, pending, error, onSubscribe }: SubscribeCardProps) {
  const active = subscription.status === "active";
  const [price, ...per] = priceLabel.split(" / ");
  return (
    <section aria-label="Desk plan" className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-paper">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-7">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Desk plan · Stripe sandbox</p>
          <h2 className="mt-1.5 font-serif text-[28px] leading-tight tracking-[-0.015em]">TelDeal Desk</h2>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-semibold whitespace-nowrap",
            active ? "bg-pass-wash text-pass" : "bg-muted text-muted-foreground",
          )}
        >
          {active && <Check aria-hidden="true" className="size-3.5" strokeWidth={2.2} />}
          {active ? "Active" : subscription.status === "canceled" ? "Canceled" : subscription.status === "past_due" ? "Past due" : "Not subscribed"}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-5 py-5 sm:px-7">
        <p className="flex items-baseline gap-2">
          <span className="font-serif text-5xl leading-none tracking-[-0.02em]">{price}</span>
          {per.length > 0 && <span className="text-[13px] text-muted-foreground">/ {per.join(" / ")}</span>}
        </p>
        <ul className="flex flex-col gap-2 text-[14px]">
          {features.map((f) => (
            <li key={f} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5">
              <Check aria-hidden="true" className="mt-0.5 size-4 text-pass" strokeWidth={2.2} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div role="alert" className="flex animate-in gap-3 border-t border-fail/25 bg-fail-wash px-5 py-3 text-sm text-fail duration-200 fade-in sm:px-7">
          <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
          <span>{error.message}</span>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 py-3.5 sm:px-7">
        {active ? (
          <p className="text-[13px] text-muted-foreground">
            Approval and Payments export are unlocked
            {subscription.current_period_end && ` until ${new Date(subscription.current_period_end).toLocaleDateString("en-IE", { dateStyle: "medium" })}`}.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground">
              Test card <span className="font-mono text-foreground">4242 4242 4242 4242</span>, any future date, any CVC.
            </p>
            <Button size="lg" className="h-10 px-5" disabled={pending} onClick={onSubscribe}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {pending ? "Opening Stripe Checkout…" : "Subscribe"}
            </Button>
          </>
        )}
      </footer>
    </section>
  );
}
