"use client";
// Container for /desk (Dev A): owns state and API calls; components only render props.
import { useState } from "react";
import { CallbackPanel } from "@/components/callback/CallbackPanel";
import { TradeInput } from "@/components/trade/TradeInput";
import { TradeReview } from "@/components/trade/TradeReview";
import type { AudioSample, SampleTranscript } from "@/components/trade/types";
import { ApiClientError, checkCallback, extractCall, recheckTrade, transcribeAudio } from "@/lib/api-client";
import { toWav16kMono } from "@/lib/audio/wav";
import { applyEdit, EditError } from "@/lib/trades/edit";
import { mockCallbackSamples } from "@/lib/mocks";
import type { CallbackResult, ExtractResponse, Trade, TradeField, UiError } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  if (error instanceof EditError) return { code: "bad_request", message: error.message };
  return { code: "internal", message: "Something went wrong. Try again." };
}

function approveBlockedReason(trade: Trade, callback: CallbackResult | undefined): string | null {
  if (!canProceed(trade.checks)) return "Fix the failed checks first.";
  if (!trade.nominated_callback) return "No nominated callback contact on the register.";
  if (!callback) return "Record the callback first.";
  if (!callback.all_match) {
    const fields = callback.fields.filter((f) => !f.match).map((f) => f.field.replace("_", " "));
    return `Callback doesn't match: ${fields.join(", ")}. Don't deal; escalate or call again.`;
  }
  return null;
}

export function DeskClient({ samples, audioSamples }: { samples: SampleTranscript[]; audioSamples: AudioSample[] }) {
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<UiError | null>(null);
  const [result, setResult] = useState<Omit<ExtractResponse, "trades"> | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tradeErrors, setTradeErrors] = useState<Record<string, UiError | null>>({});
  const [callbackOpen, setCallbackOpen] = useState<Record<string, boolean>>({});
  const [callbacks, setCallbacks] = useState<Record<string, CallbackResult>>({});
  const [callbackErrors, setCallbackErrors] = useState<Record<string, UiError | null>>({});
  const [callbackPending, setCallbackPending] = useState<string | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  async function handleExtract(transcript: string) {
    setExtracting(true);
    setExtractError(null);
    setTrades([]);
    setCallbackOpen({});
    setCallbacks({});
    setCallbackErrors({});
    setApproved({});
    setResult(null);
    try {
      const { trades, ...meta } = await extractCall(transcript);
      setTrades(trades);
      setResult(meta);
    } catch (error) {
      setExtractError(toUiError(error));
    } finally {
      setExtracting(false);
    }
  }

  async function handleAudio(audio: Blob, label: string) {
    setTranscribing(true);
    setExtractError(null);
    setAudioNote(null);
    try {
      const { wav, seconds } = await toWav16kMono(audio).catch((e: Error) => {
        throw new ApiClientError({ code: "bad_request", message: e.message.startsWith("Recording is") ? e.message : "Couldn't read that audio file." });
      });
      const result = await transcribeAudio(wav);
      setTranscript(result.transcript);
      setAudioNote(`${label}: ${Math.round(seconds)} s transcribed by ${result.model}. Check the transcript against the audio, then it's read below.`);
      setTranscribing(false);
      await handleExtract(result.transcript);
    } catch (error) {
      setExtractError(toUiError(error));
    } finally {
      setTranscribing(false);
    }
  }

  async function handleEdit(trade: Trade, field: TradeField, value: string) {
    setSavingId(trade.id);
    setTradeErrors((e) => ({ ...e, [trade.id]: null }));
    try {
      const extracted = applyEdit(trade.extracted, field, value);
      const checked = await recheckTrade(extracted);
      // Fields changed, so any earlier callback no longer applies.
      setCallbacks((c) => {
        const next = { ...c };
        delete next[trade.id];
        return next;
      });
      setTrades((ts) =>
        ts.map((t) =>
          t.id === trade.id
            ? { ...t, extracted, checks: checked.checks, status: checked.status, nominated_callback: checked.nominated_callback }
            : t,
        ),
      );
    } catch (error) {
      setTradeErrors((e) => ({ ...e, [trade.id]: toUiError(error) }));
    } finally {
      setSavingId(null);
    }
  }

  async function handleCallback(trade: Trade, transcript: string) {
    setCallbackPending(trade.id);
    setCallbackErrors((e) => ({ ...e, [trade.id]: null }));
    try {
      const result = await checkCallback(trade.id, trade.extracted, transcript);
      setCallbacks((c) => ({ ...c, [trade.id]: result }));
    } catch (error) {
      setCallbackErrors((e) => ({ ...e, [trade.id]: toUiError(error) }));
    } finally {
      setCallbackPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TradeInput
        samples={samples}
        pending={extracting}
        error={extractError}
        onSubmit={handleExtract}
        transcript={transcript}
        onTranscriptChange={setTranscript}
        onAudio={handleAudio}
        transcribing={transcribing}
        audioSamples={audioSamples}
      />

      {audioNote && <p className="text-xs text-muted-foreground">{audioNote}</p>}

      {result && (
        <p className="text-xs text-muted-foreground">
          Read by <code>{result.model}</code> · checked against the {result.register_source === "database" ? "fund register database" : "built-in demo register"} ·{" "}
          {trades.length} trade{trades.length === 1 ? "" : "s"} found
        </p>
      )}

      {trades.map((trade) => (
        <div key={trade.id} className="flex flex-col gap-4">
          <TradeReview
            trade={trade}
            pending={savingId === trade.id}
            error={tradeErrors[trade.id] ?? null}
            onEditField={(field, value) => handleEdit(trade, field, value)}
            canProceed={canProceed(trade.checks)}
            onProceedToCallback={() => setCallbackOpen((o) => ({ ...o, [trade.id]: true }))}
          />
          {callbackOpen[trade.id] && (
            <CallbackPanel
              trade={trade}
              contact={trade.nominated_callback}
              callback={callbacks[trade.id] ?? null}
              pending={callbackPending === trade.id}
              error={callbackErrors[trade.id] ?? null}
              onSubmitCallback={(t) => handleCallback(trade, t)}
              canApprove={approveBlockedReason(trade, callbacks[trade.id]) === null}
              approveBlockedReason={approveBlockedReason(trade, callbacks[trade.id])}
              onApprove={() => setApproved((a) => ({ ...a, [trade.id]: true }))}
              samples={mockCallbackSamples}
              approved={approved[trade.id] ?? false}
            />
          )}
        </div>
      ))}
    </div>
  );
}
