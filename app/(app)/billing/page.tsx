import type { Metadata } from "next";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = { title: "Billing · TelDeal" };

export default function BillingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-10 sm:py-10">
      <header className="flex animate-in flex-col gap-2 duration-500 ease-out fade-in fill-mode-both slide-in-from-bottom-2">
        <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Billing</p>
        <h1 className="font-serif text-4xl leading-none tracking-[-0.018em] sm:text-[44px]">Desk subscription</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Reading and checking trades is free to try. Approving them and sending them to Payments needs a desk subscription.</p>
      </header>
      <BillingClient />
    </main>
  );
}
