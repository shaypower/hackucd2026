import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">TelDeal</h1>
      <p className="text-muted-foreground">
        Turn phone trade instructions into verified, auditable trades. Paste a call, and TelDeal reads the trade with AI, then checks the ISIN, account
        and caller against the register before anyone calls back.
      </p>
      <div>
        <Button render={<Link href="/desk" />}>Open the dealing desk →</Button>
      </div>
    </main>
  );
}
