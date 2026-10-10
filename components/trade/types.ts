// Props contract for trade components. Owner: Dev A; change only by adding optional props.
// Components render props only: no fetching, no API calls. Components that take callbacks are
// client components ("use client").
import type { Trade, TradeField, UiError } from "@/lib/types";

export interface SampleTranscript {
  id: string;
  label: string; // e.g. "Clean subscription", "Unauthorised caller"
  transcript: string;
}

// /desk: paste or pick a call transcript, then extract.
export interface TradeInputProps {
  samples: SampleTranscript[];
  pending: boolean; // extraction in progress
  error: UiError | null;
  onSubmit: (transcript: string) => void;
}

// /trades/[id]: transcript with highlighted evidence next to the extracted fields and their checks.
export interface TradeReviewProps {
  trade: Trade;
  pending: boolean; // an edit is being saved
  error: UiError | null;
  onEditField: (field: TradeField, value: string) => void;
  canProceed: boolean; // true when no check is "fail"
  onProceedToCallback: () => void;
}
