// Workflow rules shared by the API (enforced) and the UI (explained). Code decides; never the model.
import type { CallbackResult, Trade } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

/** Why a callback can't be recorded yet, or null if it can. */
export function callbackBlocker(trade: Trade): string | null {
  if (trade.status === "approved") return "This trade is already approved.";
  if (!canProceed(trade.checks)) return "Fix the failed checks before calling back.";
  if (!trade.nominated_callback) return "No nominated callback contact on the register for this account.";
  return null;
}

/** Why the trade can't be approved yet, or null if it can. */
export function approvalBlocker(trade: Trade, callback: CallbackResult | null): string | null {
  if (trade.status === "approved") return "This trade is already approved.";
  if (!canProceed(trade.checks)) return "Fix the failed checks first.";
  if (!trade.nominated_callback) return "No nominated callback contact on the register.";
  if (!callback || trade.status === "needs_review" || trade.status === "awaiting_callback") {
    return "Record the callback first.";
  }
  if (!callback.all_match || trade.status === "callback_mismatch") {
    const fields = callback.fields.filter((f) => !f.match).map((f) => f.field.replace("_", " "));
    return `Callback doesn't match: ${fields.join(", ")}. Don't deal; escalate or call again.`;
  }
  return null;
}
