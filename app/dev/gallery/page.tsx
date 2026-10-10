// Dev B's component gallery: identity, shell and every component state from lib/mocks.ts. No API calls.
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Stage, StageTrack } from "@/components/shell/stage";
import { StatusMark } from "@/components/shell/status-mark";
import { ComponentStates } from "./component-states";

export const metadata: Metadata = { title: "Gallery · TelDeal" };

const INDEX = [
  { href: "#identity", label: "Identity" },
  { href: "#trade-input", label: "TradeInput" },
  { href: "#trade-review", label: "TradeReview" },
  { href: "#callback-panel", label: "CallbackPanel" },
  { href: "#audit-trail", label: "AuditTrail" },
  { href: "#pending", label: "Not built yet" },
];

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
        kicker="Gallery · identity, shell and component states"
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

      <nav aria-label="Gallery sections" className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-10">
          {INDEX.map((i) => (
            <li key={i.href}>
              <a
                href={i.href}
                className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div id="identity" className="mx-auto grid w-full max-w-6xl scroll-mt-14 grid-cols-[minmax(0,1fr)] gap-14 px-4 py-10 sm:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <Section title="Palette" aside="colour never stands alone">
            <ul className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-4">
              {SWATCHES.map((s) => (
                <li key={s.token} className="flex flex-col gap-2">
                  <span
                    className="h-11 rounded-md border border-border transition-transform duration-200 ease-out hover:-translate-y-0.5"
                    style={{ background: s.hex }}
                  />
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {s.token} · {s.hex}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Type" aside="Newsreader · Instrument Sans · IBM Plex Mono">
            <div className="grid gap-5">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Case title · serif 44</p>
                <p className="mt-2 font-serif text-[40px] leading-none tracking-[-0.018em]">Acme Pension Fund</p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Human words · serif 17.5</p>
                <p className="mt-2 font-serif text-[17.5px] leading-relaxed">
                  “We’d like to subscribe <mark className="rounded-sm bg-hilite px-0.5 text-foreground">five thousand units</mark>, not cash.”
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">System data · sans + mono</p>
                <p className="mt-2 flex items-baseline gap-4">
                  <span className="text-[19px] font-medium tabular-nums">5,000 units</span>
                  <span className="font-mono text-base">IE00B4L5Y983</span>
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-2 lg:gap-12">
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

        <Section title="Component states" aside="lib/mocks.ts only · handlers are no-ops">
          <ComponentStates />
        </Section>
      </div>
    </main>
  );
}
