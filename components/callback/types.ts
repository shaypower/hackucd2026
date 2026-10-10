// Props contract for callback components. Owner: Dev A; change only by adding optional props.
import type { SampleTranscript } from "@/components/trade/types";
import type { CallbackResult, Contact, Trade, TradeField, UiError } from "@/lib/types";

// /trades/[id]/callback: who to call, paste the callback transcript, see the field-by-field diff.
export interface CallbackPanelProps {
  trade: Trade;
  contact: Contact | null; // nominated callback contact from the register
  callback: CallbackResult | null; // null until a callback transcript has been submitted
  pending: boolean;
  error: UiError | null;
  onSubmitCallback: (transcript: string) => void;
  canApprove: boolean;
  approveBlockedReason: string | null; // e.g. "Callback quantity differs", "Subscription required"
  onApprove: () => void;
  samples?: SampleTranscript[]; // example callback transcripts for demos
  approved?: boolean;
  exportUrl?: string; // Payments .xlsx, shown once approved
  onExport?: () => void; // called when the download starts
  // Optional automated callback by phone (TelDeal's agent calls the nominated contact)
  onCallNow?: () => void;
  calling?: { to: string; redirected: boolean; status: string } | null;
  // Optional: dealer accepts a name difference (fund / account name / speaker). Key fields can't be accepted.
  onAcceptField?: (field: TradeField) => void;
  acceptableFields?: TradeField[];
  // Optional: correct what was heard on the callback (audited); the comparison is recalculated.
  onEditCallbackField?: (field: TradeField, value: string) => void;
}
