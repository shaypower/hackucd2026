// Dev B's component gallery. B1: identity, shell and primitives. Later cards add component states from lib/mocks.ts.
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Stage, StageTrack } from "@/components/shell/stage";
import { StatusMark } from "@/components/shell/status-mark";

export const metadata: Metadata = { title: "Gallery · TelDeal" };

const SWATCHES = [
  { name: "Ivory", token: "--background", hex: "#F5F3EE" },
  { name: "Paper", token: "--paper", hex: "#FBFAF7" },
  { name: "Night", token: "--night", hex: "#0B1513" },
  { name: "Forest", token: "--forest", hex: "#102622" },
  { name: "Ink", token: "--foreground", hex: "#17221F" },
  { name: "Copper", token: "--copper", hex: "#B36D48" },
  { name: "Copper ink", token: "--copper-ink", hex: "#8A4B2A" },
  { name: "Highlight", token: "--hilite", hex: "#F0D2B4" },
  { name: "Pass", token: "--pass", hex: "#2C6A4C" },
  { name: "Warn", token: "--warn", hex: "#875A0C" },
  { name: "Fail", token: "--fail", hex: "#A1382A" },
];

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="flex animate-in flex-col gap-4 duration-700 ease-out fade-in fill-mode-both slide-in-from-bottom-3" style={{ animationDelay: "400ms" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-foreground pb-3">
        <h2 className="font-serif text-2xl tracking-[-0.01em]">{title}</h2>
        {aside && <span className="font-mono text-[11.5px] text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export default function GalleryPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Stage
        kicker="Gallery · B1 identity and shell"
        title="Acme Pension Fund"
        sub={
          <>
            Subscribe <span className="tabular-nums">5,000</span> units · iShares Core MSCI World UCITS ETF (Acc) · EUR
          </>
        }
        facts={["Account 40012", "IE00B4L5Y983", "Owner A. Brennan"]}
      >
        <StageTrack
          steps={[
            { label: "Capture", state: "done", detail: "Call transcript" },
            { label: "Verify", state: "done", detail: "8 of 8 passed" },
            { label: "Callback", state: "current", detail: "Blocked · units differ" },
            { label: "Release", state: "todo", detail: "Locked until callback" },
          ]}
        />
      </Stage>

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-10 sm:px-10">
        <Section title="Palette" aside="status colours always pair with an icon and a word">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {SWATCHES.map((s) => (
              <li key={s.token} className="flex flex-col gap-2">
                <span className="h-14 rounded-md border border-border transition-transform duration-200 ease-out hover:-translate-y-0.5" style={{ background: s.hex }} />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {s.token} · {s.hex}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type" aside="Newsreader · Instrument Sans · IBM Plex Mono">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Case title · serif 44</p>
              <p className="mt-2 font-serif text-[44px] leading-none tracking-[-0.018em]">Acme Pension Fund</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Human words · serif 17.5</p>
              <p className="mt-2 font-serif text-[17.5px] leading-relaxed">
                “We’d like to subscribe <mark className="rounded-sm bg-hilite px-0.5 text-foreground">five thousand units</mark>, not cash.”
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">System data · sans + mono</p>
              <p className="mt-2 text-[19px] font-medium tabular-nums">5,000 units</p>
              <p className="font-mono text-base">IE00B4L5Y983</p>
            </div>
          </div>
        </Section>

        <Section title="Check results">
          <div className="flex flex-wrap items-center gap-6">
            <StatusMark status="pass" />
            <StatusMark status="warn" />
            <StatusMark status="fail" />
            <StatusMark status="fail" label="Units differ" />
          </div>
        </Section>

        <Section title="Buttons" aside="components/ui/button">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Proceed to callback</Button>
            <Button size="lg" variant="outline">
              Edit value
            </Button>
            <Button size="lg" variant="secondary">
              Load demo case
            </Button>
            <Button size="lg" variant="destructive">
              Reject instruction
            </Button>
            <Button size="lg" disabled>
              Approve
            </Button>
          </div>
        </Section>
      </div>
    </main>
  );
}
