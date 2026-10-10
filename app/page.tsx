import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">TelDeal</h1>
      <p className="text-muted-foreground">
        Turn phone trade instructions into verified, auditable trades.
      </p>
      <div>
        <Button disabled>Start a trade (coming soon)</Button>
      </div>
    </main>
  );
}
