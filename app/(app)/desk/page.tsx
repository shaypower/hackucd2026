import type { Metadata } from "next";
import { DeskClient } from "./desk-client";

export const metadata: Metadata = { title: "Dealing desk · TelDeal" };

export default function DeskPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-10 sm:py-10">
      <header className="flex animate-in flex-col gap-2 duration-500 ease-out fade-in fill-mode-both slide-in-from-bottom-2">
        <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Dealing desk</p>
        <h1 className="font-serif text-4xl leading-none tracking-[-0.018em] sm:text-[44px]">Take an instruction</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          Take a call on the phone line, record or upload one, or paste a transcript. The AI reads it, every field is checked against the fund register, and the
          AI never approves anything.
        </p>
      </header>
      <DeskClient />
    </main>
  );
}
