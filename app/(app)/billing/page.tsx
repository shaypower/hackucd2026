import type { Metadata } from "next";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = { title: "Billing · TelDeal" };

export default function BillingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Reading and checking trades is free to try. Approving them and sending them to Payments needs a desk subscription.</p>
      </header>
      <BillingClient />
    </main>
  );
}
