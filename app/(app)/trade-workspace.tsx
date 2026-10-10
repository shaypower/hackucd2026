"use client";
// One trade's workspace (Dev A container): review → callback → approve → export, with its audit trail.
// Used by /desk (freshly read trades) and /trades/[id] (saved trades).
import { useEffect, useState } from "react";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { CallbackPanel } from "@/components/callback/CallbackPanel";
import { TradeReview } from "@/components/trade/TradeReview";
import { ApiClientError, approveTrade, editTradeField, exportUrl, getTradeDetail, recordCallback } from "@/lib/api-client";
import { approvalBlocker } from "@/lib/trades/approval";
import { makeCallbackSamples } from "@/lib/trades/callback-samples";
import type { TradeDetail, TradeField, UiError } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  return { code: "internal", message: "Something went wrong. Try again." };
}

export function TradeWorkspace({ initial, openCallback = false }: { initial: TradeDetail; openCallback?: boolean }) {
  const [detail, setDetail] = useState(initial);
  const [busy, setBusy] = useState<"edit" | "callback" | "approve" | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [callbackOpen, setCallbackOpen] = useState(openCallback);
  const { trade, callback, audit } = detail;
  const id = trade.id;

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
  const blocker = approvalBlocker(trade, callback);
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
