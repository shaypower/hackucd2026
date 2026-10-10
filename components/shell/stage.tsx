// The cinematic band under the nav: case identity in serif over amber light and dark glass.
// Presentational only. Put operational data on the ivory sheet below, not here.
import type { ReactNode } from "react";
import { Check } from "lucide-react";

export interface StageProps {
  kicker?: string; // e.g. "TD-0418 · Phone instruction · Received 09:41 Dublin"
  title: string;
  sub?: ReactNode;
  facts?: string[]; // identifiers, set in mono
  children?: ReactNode; // e.g. a stage track along the bottom edge
}

export function StageArt() {
  return (
    <div className="td-art" aria-hidden="true">
      <div className="light" />
      <div className="slab s4" />
      <div className="slab s1" />
      <div className="slab s2" />
      <div className="slab s3" />
      <div className="horizon" />
      <svg className="grain" xmlns="http://www.w3.org/2000/svg">
        <filter id="td-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#td-grain)" />
      </svg>
      <div className="fade" />
    </div>
  );
}

export interface StageStep {
  label: string; // "Capture", "Verify", "Callback", "Release"
  state: "done" | "current" | "todo" | "blocked";
  detail: string; // "8 of 8 passed", "Blocked · units differ"
}

// Entrance: content rises in, staggered. Reduced motion collapses it (globals.css).
const RISE = "animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-both";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Capture → Verify → Callback → Release, along the bottom edge of the stage. */
export function StageTrack({ steps }: { steps: StageStep[] }) {
  return (
    <ol aria-label="Case stages" className="grid grid-cols-2 md:grid-cols-4">
      {steps.map((s, i) => (
        <li
          key={s.label}
          aria-current={s.state === "current" ? "step" : undefined}
          style={delay(250 + i * 90)}
          className={`${RISE} flex flex-col gap-0.5 border-b border-[#f5f3ee]/20 pt-3 pr-4 pb-3.5 ${
            s.state === "current" ? "td-current text-[#f5f3ee]" : s.state === "todo" ? "text-[#f5f3ee]/55" : "text-[#f5f3ee]/85"
          }`}
        >
          <span className={`font-mono text-[11px] ${s.state === "current" ? "text-copper-lit" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
          <span className="text-[15px] font-semibold">{s.label}</span>
          <span className={`text-[12.5px] ${s.state === "blocked" ? "text-[#f5ae9e]" : ""}`}>
            {s.state === "done" && <Check aria-hidden="true" className="mr-1 inline size-3.5 text-[#9fd4b4]" strokeWidth={2.2} />}
            {s.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Stage({ kicker, title, sub, facts, children }: StageProps) {
  return (
    <section className="relative isolate flex min-h-64 flex-col overflow-hidden bg-night px-4 pt-6 pb-0 text-[#f5f3ee] sm:px-10 md:min-h-72">
      <StageArt />
      <div className="max-w-2xl pb-8">
        {kicker && <p style={delay(0)} className={`${RISE} font-mono text-[11px] font-medium tracking-[0.12em] text-[#f5f3ee]/65 uppercase`}>{kicker}</p>}
        <h1 style={delay(80)} className={`${RISE} mt-3 mb-2.5 font-serif text-4xl leading-[1.02] font-normal tracking-[-0.018em] sm:text-[44px]`}>{title}</h1>
        {sub && <p style={delay(160)} className={`${RISE} text-[15.5px] text-[#f5f3ee]/80`}>{sub}</p>}
        {facts && facts.length > 0 && (
          <p style={delay(220)} className={`${RISE} mt-3.5 flex flex-wrap gap-x-4.5 gap-y-1 font-mono text-xs text-[#f5f3ee]/70`}>
            {facts.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </p>
        )}
      </div>
      {children && <div className="-mx-4 mt-auto bg-linear-to-t from-night from-55% to-night/0 px-4 pt-6 sm:-mx-10 sm:px-10">{children}</div>}
    </section>
  );
}
