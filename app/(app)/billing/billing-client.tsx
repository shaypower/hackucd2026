"use client";
// Billing container (Dev A): subscription status, Stripe Checkout redirect, confirmation on return.
import Link from "next/link";
import { useEffect, useState } from "react";
import { SubscribeCard } from "@/components/billing/SubscribeCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PLAN } from "@/lib/billing/plan";
import type { Subscription, UiError } from "@/lib/types";

interface Receipt {
  subscription_id: string;
  subscription_status: string;
  amount_paid: number | null;
  currency: string | null;
  invoice_id: string | null;
  customer_email: string | null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw (data?.error as UiError) ?? { code: "internal", message: `Request failed (${res.status}).` };
  return data as T;
}

export function BillingClient() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => call<Subscription>("GET", "/api/billing").then(setSubscription).catch(setError);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    void (async () => {
      if (sessionId) {
        // Back from Stripe: confirm the payment with Stripe and activate the desk.
        try {
          setReceipt(await call<Receipt>("POST", "/api/billing/confirm", { session_id: sessionId }));
        } catch (e) {
          setError(e as UiError);
        }
        window.history.replaceState(null, "", "/billing");
      } else if (params.get("canceled")) {
        setNotice("Checkout was canceled. No payment was taken.");
        window.history.replaceState(null, "", "/billing");
      }
      await refresh();
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

  async function cancelTest() {
    setPending(true);
    try {
      await call("POST", "/api/billing/cancel");
      setReceipt(null);
      setNotice("Test subscription canceled. Approval is locked again, so you can re-run the purchase demo.");
      await refresh();
    } catch (e) {
      setError(e as UiError);
    } finally {
      setPending(false);
    }
  }

  const money = (minor: number | null, currency: string | null) =>
    minor === null || !currency ? "" : new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format(minor / 100);

  return (
    <div className="flex flex-col gap-6">
      {receipt && (
        <Alert>
          <AlertTitle>Payment received: subscription active</AlertTitle>
          <AlertDescription>
            <span className="block">
              {money(receipt.amount_paid, receipt.currency)} paid{receipt.customer_email ? ` by ${receipt.customer_email}` : ""} · subscription{" "}
              <code>{receipt.subscription_id}</code> ({receipt.subscription_status}){receipt.invoice_id && <> · invoice <code>{receipt.invoice_id}</code></>}
            </span>
            <span className="block">
              Approval and Payments export are now unlocked. <Link href="/desk" className="underline">Back to the dealing desk</Link>
            </span>
          </AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {subscription ? (
        <SubscribeCard subscription={subscription} priceLabel={PLAN.priceLabel} features={PLAN.features} pending={pending} error={error} onSubscribe={subscribe} />
      ) : (
        <p className="text-muted-foreground">Loading subscription…</p>
      )}
      <p className="max-w-xl text-sm text-muted-foreground">
        <strong className="text-foreground">Why this price:</strong> {PLAN.rationale}
      </p>
      <p className="max-w-xl text-sm text-muted-foreground">
        Stripe sandbox: no real money moves. Pay with test card <code>4242 4242 4242 4242</code>, any future expiry, any CVC.
      </p>
      {subscription?.status === "active" && (
        <div>
          <Button variant="outline" size="sm" disabled={pending} onClick={cancelTest}>
            Cancel test subscription (re-run the demo)
          </Button>
        </div>
      )}
    </div>
  );
}
