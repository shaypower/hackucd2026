"use client";
// Every state of each handed-over component, rendered from lib/mocks.ts only. Handlers are no-ops.
// One state is shown at a time per component, picked from a switcher, so the page stays short.
import { useState, type ReactNode } from "react";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { CallbackPanel } from "@/components/callback/CallbackPanel";
import { TradeInput } from "@/components/trade/TradeInput";
import { TradeReview } from "@/components/trade/TradeReview";
import {
  mockAuditEvents,
  mockCallbackMatch,
  mockCallbackMismatch,
  mockCallbackSamples,
  mockContact,
  mockErrorSubscription,
  mockErrorUnreadable,
  mockErrorUpstream,
  mockSamples,
  mockTradeClean,
  mockTradeFailures,
  mockTradeWarnings,
} from "@/lib/mocks";
import { cn } from "@/lib/utils";

const noop = () => {};
const audioSamples = [{ id: "oakpark", label: "Sample recording (47 s)", url: "/samples/oakpark-subscription.mp3" }];
const mismatchReason = `Callback doesn't match: ${mockCallbackMismatch.fields
  .filter((f) => !f.match)
  .map((f) => f.field.replace("_", " "))
  .join(", ")}. Don't deal; escalate or call again.`;

type Kind = "ok" | "warn" | "fail" | "busy" | "empty";
interface State {
  id: string;
  label: string;
  kind: Kind;
  note: string;
  render: () => ReactNode;
}

const DOT: Record<Kind, string> = {
  ok: "bg-pass",
  warn: "bg-warn",
  fail: "bg-fail",
  busy: "bg-copper",
  empty: "bg-muted-foreground/50",
};

const tradeInput: State[] = [
  {
    id: "ti-empty",
    label: "Empty",
    kind: "empty",
    note: "samples + audio sample, nothing entered",
    render: () => <TradeInput samples={mockSamples} pending={false} error={null} onSubmit={noop} onAudio={noop} audioSamples={audioSamples} />,
  },
  {
    id: "ti-pending",
    label: "Extracting",
    kind: "busy",
    note: "pending: true",
    render: () => <TradeInput samples={mockSamples} pending error={null} onSubmit={noop} transcript={mockSamples[0].transcript} onTranscriptChange={noop} />,
  },
  {
    id: "ti-transcribing",
    label: "Transcribing",
    kind: "busy",
    note: "transcribing: true",
    render: () => <TradeInput samples={mockSamples} pending={false} error={null} onSubmit={noop} onAudio={noop} transcribing audioSamples={audioSamples} />,
  },
  {
    id: "ti-unreadable",
    label: "Unreadable call",
    kind: "fail",
    note: "mockErrorUnreadable",
    render: () => (
      <TradeInput
        samples={mockSamples}
        pending={false}
        error={mockErrorUnreadable}
        onSubmit={noop}
        transcript={mockSamples[3].transcript}
        onTranscriptChange={noop}
      />
    ),
  },
  {
    id: "ti-upstream",
    label: "Service down",
    kind: "fail",
    note: "mockErrorUpstream",
    render: () => (
      <TradeInput
        samples={mockSamples}
        pending={false}
        error={mockErrorUpstream}
        onSubmit={noop}
        transcript={mockSamples[0].transcript}
        onTranscriptChange={noop}
      />
    ),
  },
];

const tradeReview: State[] = [
  {
    id: "tr-pass",
    label: "All pass",
    kind: "ok",
    note: "mockTradeClean · canProceed",
    render: () => <TradeReview trade={mockTradeClean} pending={false} error={null} onEditField={noop} canProceed onProceedToCallback={noop} />,
  },
  {
    id: "tr-warn",
    label: "Needs review",
    kind: "warn",
    note: "mockTradeWarnings",
    render: () => <TradeReview trade={mockTradeWarnings} pending={false} error={null} onEditField={noop} canProceed onProceedToCallback={noop} />,
  },
  {
    id: "tr-fail",
    label: "Failed",
    kind: "fail",
    note: "mockTradeFailures · canProceed false",
    render: () => <TradeReview trade={mockTradeFailures} pending={false} error={null} onEditField={noop} canProceed={false} onProceedToCallback={noop} />,
  },
  {
    id: "tr-saving",
    label: "Saving edit",
    kind: "busy",
    note: "pending: true",
    render: () => <TradeReview trade={mockTradeWarnings} pending error={null} onEditField={noop} canProceed onProceedToCallback={noop} />,
  },
  {
    id: "tr-error",
    label: "Edit failed",
    kind: "fail",
    note: "mockErrorUpstream",
    render: () => <TradeReview trade={mockTradeWarnings} pending={false} error={mockErrorUpstream} onEditField={noop} canProceed onProceedToCallback={noop} />,
  },
];

const callbackPanel: State[] = [
  {
    id: "cb-empty",
    label: "Before callback",
    kind: "empty",
    note: "callback: null",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={mockContact}
        callback={null}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="Record the callback first."
        onApprove={noop}
        samples={mockCallbackSamples}
      />
    ),
  },
  {
    id: "cb-pending",
    label: "Reading",
    kind: "busy",
    note: "pending: true",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={mockContact}
        callback={null}
        pending
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="Record the callback first."
        onApprove={noop}
        samples={mockCallbackSamples}
      />
    ),
  },
  {
    id: "cb-mismatch",
    label: "Mismatch",
    kind: "fail",
    note: "mockCallbackMismatch · blocked",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={mockContact}
        callback={mockCallbackMismatch}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason={mismatchReason}
        onApprove={noop}
        samples={mockCallbackSamples}
      />
    ),
  },
  {
    id: "cb-match",
    label: "Match",
    kind: "ok",
    note: "mockCallbackMatch · canApprove",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={mockContact}
        callback={mockCallbackMatch}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove
        approveBlockedReason={null}
        onApprove={noop}
        samples={mockCallbackSamples}
      />
    ),
  },
  {
    id: "cb-call",
    label: "Automated call",
    kind: "empty",
    note: "onCallNow · dialled_phone (demo)",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={{ ...mockContact, dialled_phone: "+353 •• ••• 0199" }}
        callback={null}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="Record the callback first."
        onApprove={noop}
        samples={mockCallbackSamples}
        onCallNow={noop}
      />
    ),
  },
  {
    id: "cb-calling",
    label: "Calling",
    kind: "busy",
    note: "calling: { status: dialling }",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={{ ...mockContact, dialled_phone: "+353 •• ••• 0199" }}
        callback={null}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="Record the callback first."
        onApprove={noop}
        onCallNow={noop}
        calling={{ status: "dialling", to: "+353 •• ••• 0199", redirected: true }}
      />
    ),
  },
  {
    id: "cb-approved",
    label: "Approved",
    kind: "ok",
    note: "approved: true",
    render: () => (
      <CallbackPanel
        trade={{ ...mockTradeClean, status: "approved" }}
        contact={mockContact}
        callback={mockCallbackMatch}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason={null}
        onApprove={noop}
        approved
      />
    ),
  },
  {
    id: "cb-subscription",
    label: "Subscription",
    kind: "fail",
    note: "mockErrorSubscription",
    render: () => (
      <CallbackPanel
        trade={mockTradeClean}
        contact={mockContact}
        callback={mockCallbackMatch}
        pending={false}
        error={mockErrorSubscription}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="Subscription required"
        onApprove={noop}
      />
    ),
  },
  {
    id: "cb-no-contact",
    label: "No contact",
    kind: "empty",
    note: "contact: null",
    render: () => (
      <CallbackPanel
        trade={{ ...mockTradeClean, nominated_callback: null }}
        contact={null}
        callback={null}
        pending={false}
        error={null}
        onSubmitCallback={noop}
        canApprove={false}
        approveBlockedReason="No nominated callback contact on the register."
        onApprove={noop}
      />
    ),
  },
];

const auditTrail: State[] = [
  { id: "at-full", label: "Full trail", kind: "ok", note: "mockAuditEvents", render: () => <AuditTrail events={mockAuditEvents} /> },
  { id: "at-partial", label: "In progress", kind: "busy", note: "first two events", render: () => <AuditTrail events={mockAuditEvents.slice(0, 2)} /> },
  {
    id: "at-empty",
    label: "Empty",
    kind: "empty",
    note: "events: []",
    render: () => (
      <>
        <AuditTrail events={[]} />
        <p className="text-sm text-muted-foreground italic">AuditTrail renders nothing when there are no events.</p>
      </>
    ),
  },
];

const GROUPS = [
  { id: "trade-input", name: "TradeInput", file: "components/trade/TradeInput.tsx", states: tradeInput },
  { id: "trade-review", name: "TradeReview", file: "components/trade/TradeReview.tsx", states: tradeReview },
  { id: "callback-panel", name: "CallbackPanel", file: "components/callback/CallbackPanel.tsx", states: callbackPanel },
  { id: "audit-trail", name: "AuditTrail", file: "components/audit/AuditTrail.tsx", states: auditTrail },
];

function StateSwitcher({ id, name, file, states }: (typeof GROUPS)[number]) {
  const [current, setCurrent] = useState(states[0].id);
  const state = states.find((s) => s.id === current) ?? states[0];
  const body = state.render();
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-16 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-foreground pb-3">
        <h3 id={`${id}-h`} className="font-serif text-2xl tracking-[-0.01em]">
          {name}
        </h3>
        <span className="font-mono text-[11.5px] text-muted-foreground">{file}</span>
      </div>
      <div role="group" aria-label={`${name} states`} className="flex flex-wrap gap-1.5">
        {states.map((s) => (
          <button
            key={s.id}
            id={s.id}
            type="button"
            aria-pressed={s.id === state.id}
            onClick={() => setCurrent(s.id)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border border-input px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:border-muted-foreground hover:text-foreground",
              s.id === state.id && "border-foreground bg-foreground text-background hover:text-background",
            )}
          >
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[s.kind])} />
            {s.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <span>{state.label}</span>
          <span>{state.note}</span>
        </div>
        <div key={state.id} data-state={state.id} className="animate-in overflow-x-auto p-4 duration-300 ease-out fade-in slide-in-from-bottom-1 sm:p-6">
          {body}
        </div>
      </div>
    </section>
  );
}

export function ComponentStates() {
  return (
    <div className="flex flex-col gap-14">
      {GROUPS.map((g) => (
        <StateSwitcher key={g.id} {...g} />
      ))}
      <section id="pending" className="flex scroll-mt-16 flex-col gap-3">
        <div className="border-b border-foreground pb-3">
          <h3 className="font-serif text-2xl tracking-[-0.01em]">Not built yet</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">SubscribeCard</span> (components/billing/types.ts) is waiting for Dev A&apos;s v1 (Stripe, A8). Mock data
          is ready: <span className="font-mono">mockSubscriptionActive / Inactive</span>.
        </p>
      </section>
    </div>
  );
}
