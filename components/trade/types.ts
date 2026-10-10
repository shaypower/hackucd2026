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
export interface AudioSample {
  id: string;
  label: string;
  url: string; // under /public
}

export interface TradeInputProps {
  samples: SampleTranscript[];
  pending: boolean; // extraction in progress
  error: UiError | null;
  onSubmit: (transcript: string) => void;
  // Optional: controlled transcript (e.g. filled in by transcription)
  transcript?: string;
  onTranscriptChange?: (transcript: string) => void;
  // Optional: audio input. The component records/picks audio; the page transcribes it.
  onAudio?: (audio: Blob, label: string) => void;
  transcribing?: boolean;
  audioSamples?: AudioSample[];
}

// /trades/[id]: transcript with highlighted evidence next to the extracted fields and their checks.
export interface TradeReviewProps {
  trade: Trade;
  pending: boolean; // an edit is being saved
  error: UiError | null;
  onEditField: (field: TradeField, value: string) => void;
  canProceed: boolean; // true when no check is "fail"
  onProceedToCallback: () => void;
  recordingUrl?: string; // original call audio, if it came in by phone
  sourceLabel?: string; // e.g. "Phone call from +1 555 0100"
}
