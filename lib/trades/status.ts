import type { TradeStatus } from "@/lib/types";

export const STATUS_LABEL: Record<TradeStatus, string> = {
  needs_review: "Needs review",
  awaiting_callback: "Awaiting callback",
  callback_mismatch: "Callback mismatch",
  ready_to_approve: "Ready to approve",
  approved: "Approved",
  rejected: "Rejected",
};

// Theme tokens (app/globals.css); the label always ships with the colour.
export const STATUS_STYLE: Record<TradeStatus, string> = {
  needs_review: "bg-warn-wash text-warn",
  awaiting_callback: "bg-accent text-copper-ink",
  callback_mismatch: "bg-fail-wash text-fail",
  ready_to_approve: "bg-pass-wash text-pass",
  approved: "bg-pass text-primary-foreground",
  rejected: "bg-muted text-muted-foreground",
};

/** Blocked = still in review with a failed check; shown instead of "Needs review". */
export function statusChip(t: { status: TradeStatus; blocked: boolean }): { label: string; style: string } {
  return t.blocked && t.status === "needs_review" ? { label: "Blocked", style: "bg-fail-wash text-fail" } : { label: STATUS_LABEL[t.status], style: STATUS_STYLE[t.status] };
}
