import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { billingConfigured, hasActiveSubscription } from "@/lib/billing/stripe";

// The desk opens once the desk's Stripe sandbox subscription is active (bought on the landing page).
// Without Stripe keys, or if the check itself fails, the desk stays open so a demo can't get locked out.
async function RequireSubscription() {
  await connection();
  if (!billingConfigured()) return null;
  const active = await hasActiveSubscription().catch(() => true);
  if (!active) redirect("/?locked=1");
  return null;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <RequireSubscription />
      </Suspense>
      {children}
    </>
  );
}
