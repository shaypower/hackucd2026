import type { Metadata } from "next";
import Link from "next/link";
import { DeskClient } from "./desk-client";
import { mockSamples } from "@/lib/mocks";

export const metadata: Metadata = { title: "Dealing desk · TelDeal" };

export default function DeskPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← TelDeal
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Dealing desk</h1>
        <p className="text-muted-foreground">
          Record or upload a call, or paste a transcript. The AI reads it, then every field is checked against the fund register. The AI never approves anything.
        </p>
      </header>
      <DeskClient
        samples={mockSamples}
        audioSamples={[{ id: "oakpark", label: "Sample recording (47 s)", url: "/samples/oakpark-subscription.mp3" }]}
      />
    </main>
  );
}
