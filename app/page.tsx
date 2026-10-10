import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DeskCounts, DeskCountsSkeleton, HowItWorks, ScenarioBlocks, SectionHead, type Scenario } from "@/components/landing/landing-blocks";
import { Stage } from "@/components/shell/stage";
import { Button } from "@/components/ui/button";
import { getDeskStats } from "@/lib/db/trades";

const SCENARIOS: Scenario[] = [
  {
    href: "/desk#audio",
    title: "A real phone call",
    body: "Play a recorded instruction. It's transcribed, the trade is read, every field is checked, then you call back and approve.",
    tag: "Happy path",
    status: "pass",
  },
  {
    href: "/desk#fraud",
    title: "A fraudulent instruction",
    body: "Someone who isn't a signatory asks for €250,000 into a mistyped ISIN, and asks you not to call back. Blocked.",
    tag: "Blocked",
    status: "fail",
  },
  {
    href: "/desk#mismatch",
    title: "A fat-finger callback",
    body: "The callback confirms 500 units instead of 5,000. The mismatch is caught field by field and approval stays locked.",
    tag: "Caught",
    status: "warn",
  },
];

const STEPS: [string, string][] = [
  ["Listen", "Record or upload the call; an audio model transcribes it."],
  ["Read", "An LLM extracts the trade and quotes where each value came from."],
  ["Check", "Code, not the AI, checks the ISIN check digit, fund, account, authorised caller, share class and cut-off."],
  ["Confirm", "Call back the nominated contact from the register; the callback is compared field by field."],
  ["Hand off", "Approve and download the Payments file, with the full audit trail."],
];

async function LiveCounts() {
  await connection();
  return <DeskCounts stats={await getDeskStats()} />;
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Stage
        kicker="TelDeal · for fund transfer agents"
        title="Phone trades, verified before money moves."
        sub="Transfer agents still take dealing instructions by phone, key them in by hand, and confirm them on a callback from memory. TelDeal listens to the call, reads the trade with AI, checks every field against the register, and won't let anyone approve until the callback matches."
      >
        <div className="flex animate-in flex-wrap gap-3 pb-8 duration-700 ease-out fade-in fill-mode-both slide-in-from-bottom-2" style={{ animationDelay: "300ms" }}>
          <Button size="lg" nativeButton={false} render={<Link href="/desk" />} className="h-10 bg-[#f5f3ee] px-4 text-foreground hover:bg-white">
            Open the dealing desk →
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/trades" />}
            className="h-10 border-[#f5f3ee]/30 bg-transparent px-4 text-[#f5f3ee] hover:bg-[#f5f3ee]/10 hover:text-[#f5f3ee]"
          >
            View trades
          </Button>
        </div>
      </Stage>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-10 sm:py-12">
        <section className="flex flex-col gap-4">
          <SectionHead title="Try it: one click each" aside="Synthetic demo data" />
          <ScenarioBlocks scenarios={SCENARIOS} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHead title="How it works" />
          <HowItWorks steps={STEPS} />
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">The AI proposes; code decides.</strong> Every value links back to the words in the call, and the model can
            never approve a trade.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHead title="On this desk so far" aside="Live from the audit trail" />
          <Suspense fallback={<DeskCountsSkeleton />}>
            <LiveCounts />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
