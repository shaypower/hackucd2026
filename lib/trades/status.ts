import type { TradeStatus } from "@/lib/types";

export const STATUS_LABEL: Record<TradeStatus, string> = {
  needs_review: "Needs review",
  awaiting_callback: "Awaiting callback",
  callback_mismatch: "Callback mismatch",
  ready_to_approve: "Ready to approve",
  approved: "Approved",
  rejected: "Rejected",
};

export const STATUS_STYLE: Record<TradeStatus, string> = {
  needs_review: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  awaiting_callback: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  callback_mismatch: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  ready_to_approve: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  approved: "bg-emerald-600 text-white",
  rejected: "bg-zinc-200 text-zinc-800",
};
