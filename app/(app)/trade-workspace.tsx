"use client";
// One trade's workspace (Dev A container): review → callback → approve → export, with its audit trail.
// Used by /desk (freshly read trades) and /trades/[id] (saved trades).
import { useEffect, useRef, useState } from "react";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { CallbackPanel } from "@/components/callback/CallbackPanel";
import { TradeReview } from "@/components/trade/TradeReview";
import { acceptCallbackField, ApiClientError, approveTrade, callContactNow, editTradeField, exportUrl, getTradeDetail, recordCallback } from "@/lib/api-client";
import { approvalBlocker } from "@/lib/trades/approval";
import { makeCallbackSamples } from "@/lib/trades/callback-samples";
import { SOFT_FIELDS } from "@/lib/trades/diff";
import type { TradeDetail, TradeField, UiError } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  return { code: "internal", message: "Something went wrong. Try again." };
}

const PHONE_LINE = Boolean(process.env.NEXT_PUBLIC_TELDEAL_PHONE);
const CALL_POLL_MS = 3000;
const CALL_TIMEOUT_MS = 4 * 60 * 1000;

export function TradeWorkspace({ initial, openCallback = false }: { initial: TradeDetail; openCallback?: boolean }) {
  const [detail, setDetail] = useState(initial);
  const [busy, setBusy] = useState<"edit" | "callback" | "approve" | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [callbackOpen, setCallbackOpen] = useState(openCallback);
  const [calling, setCalling] = useState<{ to: string; redirected: boolean; status: string } | null>(null);
  const callPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  const { trade, callback, audit } = detail;
  const id = trade.id;

  useEffect(() => () => void (callPoll.current && clearInterval(callPoll.current)), []);

  // Approval needs an active desk subscription (Stripe). Explain it up front instead of failing on click.
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { status?: string; configured?: boolean } | null) => setSubscribed(s?.configured ? s.status === "active" : null))
      .catch(() => setSubscribed(null));
  }, [trade.status]);

  async function callNow() {
    setError(null);
    try {
      const placed = await callContactNow(id);
      setCalling({ to: placed.to, redirected: placed.redirected, status: "Calling" });
      const started = Date.now();
      const auditBefore = detail.audit.length + 1; // + the "dialling" event
      callPoll.current = setInterval(async () => {
        const next = await getTradeDetail(id).catch(() => null);
        if (!next) return;
        setDetail(next);
        const newEvents = next.audit.slice(auditBefore);
        const ended = newEvents.some((e) => e.type === "callback_recorded" || (e.type === "callback_call" && e.payload.status !== "dialling"));
        if (ended || Date.now() - started > CALL_TIMEOUT_MS) {
          clearInterval(callPoll.current!);
          setCalling(null);
        } else {
          setCalling((c) => c && { ...c, status: "On the call with" });
        }
      }, CALL_POLL_MS);
    } catch (e) {
      setError(toUiError(e));
    }
  }

  // Freshly read trades arrive without their audit trail; load it once.
  useEffect(() => {
    if (initial.audit.length === 0) getTradeDetail(initial.trade.id).then(setDetail).catch(() => {});
  }, [initial]);

  async function run(kind: "edit" | "callback" | "approve", action: () => Promise<TradeDetail>) {
    setBusy(kind);
    setError(null);
    try {
      setDetail(await action());
    } catch (e) {
      setError(toUiError(e));
    } finally {
      setBusy(null);
    }
  }

  const approved = trade.status === "approved";
  const blocker =
    approvalBlocker(trade, callback) ??
    (subscribed === false ? "Approving and exporting needs an active TelDeal Desk subscription: subscribe on the Billing page (€49/month, sandbox)." : null);
  const showCallback = callbackOpen || callback !== null || approved;

  return (
    <div className="flex flex-col gap-4">
      <TradeReview
        trade={trade}
        pending={busy === "edit"}
        error={showCallback ? null : error}
        onEditField={(field: TradeField, value: string) => run("edit", () => editTradeField(id, field, value))}
        canProceed={canProceed(trade.checks) && !approved}
        onProceedToCallback={() => setCallbackOpen(true)}
        recordingUrl={trade.has_recording ? `/api/trades/${id}/recording` : undefined}
        sourceLabel={trade.channel === "phone" ? `Phone call to the TelDeal line${trade.caller_id ? ` from ${trade.caller_id}` : ""}` : undefined}
      />
      {showCallback && (
        <CallbackPanel
          trade={trade}
          contact={trade.nominated_callback}
          callback={callback}
          pending={busy === "callback" || busy === "approve"}
          error={error}
          onSubmitCallback={(t) => run("callback", () => recordCallback(id, t))}
          canApprove={blocker === null}
          approveBlockedReason={blocker}
          onApprove={() => run("approve", () => approveTrade(id))}
          samples={makeCallbackSamples(trade)}
          approved={approved}
          exportUrl={approved ? exportUrl(id) : undefined}
          onCallNow={PHONE_LINE ? callNow : undefined}
          onAcceptField={(field) => run("callback", () => acceptCallbackField(id, field))}
          acceptableFields={SOFT_FIELDS}
          calling={calling}
          onExport={() =>
            // The export is logged server-side; refresh the trail once the file has been generated.
            setTimeout(() => getTradeDetail(id).then(setDetail).catch(() => {}), 1500)
          }
        />
      )}
      <AuditTrail events={audit} />
    </div>
  );
}
