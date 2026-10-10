// Server-only Stripe client and subscription sync (sandbox keys only).
import "server-only";
import Stripe from "stripe";
import { DESK_ID } from "@/lib/billing/plan";
import { db } from "@/lib/db/client";
import { Subscription, type SubscriptionStatus } from "@/lib/types";

let client: Stripe | undefined;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) throw new Error("Refusing to run with a live Stripe key: sandbox only.");
  client ??= new Stripe(key);
  return client;
}

export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

function toStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  return "inactive";
}

/** Writes Stripe's view of a subscription to our table: this is what unlocks the product. */
export async function syncSubscription(sub: Stripe.Subscription, deskId = sub.metadata?.desk_id || DESK_ID): Promise<void> {
  const periodEnd = sub.items.data[0]?.current_period_end;
  const { error } = await db()
    .from("subscriptions")
    .upsert({
      desk_id: deskId,
      status: toStatus(sub.status),
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
}

export async function getSubscription(deskId = DESK_ID): Promise<Subscription & { stripe_subscription_id: string | null }> {
  const { data, error } = await db()
    .from("subscriptions")
    .select("desk_id, status, current_period_end, stripe_subscription_id")
    .eq("desk_id", deskId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load subscription: ${error.message}`);
  return data ?? { desk_id: deskId, status: "inactive", current_period_end: null, stripe_subscription_id: null };
}

export async function hasActiveSubscription(deskId = DESK_ID): Promise<boolean> {
  return (await getSubscription(deskId)).status === "active";
}
