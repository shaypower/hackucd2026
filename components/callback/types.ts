// Props contract for callback components. Owner: Dev A; change only by adding optional props.
import type { CallbackResult, Contact, Trade, UiError } from "@/lib/types";

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
}
