import Link from "next/link";
import { Suspense } from "react";
import { DeskStatsCards } from "./(app)/trades/stats";
import { Button } from "@/components/ui/button";

const SCENARIOS = [
  {
    href: "/desk#audio",
    title: "A real phone call",
    body: "Play a recorded instruction. It's transcribed, the trade is read, every field is checked, then you call back and approve.",
    tag: "Happy path",
    tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    href: "/desk#fraud",
    title: "A fraudulent instruction",
    body: "Someone who isn't a signatory asks for €250,000 into a mistyped ISIN, and asks you not to call back. Blocked.",
    tag: "Blocked",
    tone: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  {
    href: "/desk#mismatch",
    title: "A fat-finger callback",
    body: "The callback confirms 500 units instead of 5,000. The mismatch is caught field by field and approval stays locked.",
    tag: "Caught",
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
];

const STEPS = [
  ["Listen", "Record or upload the call; an audio model transcribes it."],
  ["Read", "An LLM extracts the trade and quotes where each value came from."],
  ["Check", "Code, not the AI, checks the ISIN check digit, fund, account, authorised caller, share class and cut-off."],
  ["Confirm", "Call back the nominated contact from the register; the callback is compared field by field."],
  ["Hand off", "Approve and download the Payments file, with the full audit trail."],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-6 py-16">
      <section className="flex flex-col gap-5">
        <p className="text-sm font-medium text-muted-foreground">TelDeal · for fund transfer agents</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Phone trades, verified before money moves.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Transfer agents still take dealing instructions by phone, key them in by hand, and confirm them on a callback from memory. TelDeal listens to the
          call, reads the trade with AI, checks every field against the register, and won&apos;t let anyone approve until the callback matches.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" render={<Link href="/desk" />}>
            Open the dealing desk →
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/trades" />}>
            View trades
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Try it: one click each</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Link key={s.href} href={s.href} className="group flex flex-col gap-2 rounded-lg border p-5 transition hover:border-foreground/40 hover:shadow-sm">
              <span className={`w-fit rounded px-2 py-0.5 text-xs font-medium ${s.tone}`}>{s.tag}</span>
              <h3 className="font-semibold group-hover:underline">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-5">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-1">
              <span className="text-sm font-semibold">
                {i + 1}. {title}
              </span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">The AI proposes; code decides.</strong> Every value links back to the words in the call, and the model can never approve
          a trade.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">On this desk so far</h2>
        <Suspense fallback={<div className="h-20 animate-pulse rounded-md bg-muted" />}>
          <DeskStatsCards />
        </Suspense>
      </section>
    </main>
  );
}
