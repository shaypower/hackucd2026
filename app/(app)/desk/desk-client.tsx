"use client";
// Container for /desk (Dev A): owns state and API calls; components only render props.
import { useState } from "react";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { CallbackPanel } from "@/components/callback/CallbackPanel";
import { TradeInput } from "@/components/trade/TradeInput";
import { TradeReview } from "@/components/trade/TradeReview";
import type { AudioSample, SampleTranscript } from "@/components/trade/types";
import {
  ApiClientError,
  approveTrade,
  editTradeField,
  exportUrl,
  extractCall,
  getTradeDetail,
  recordCallback,
  transcribeAudio,
} from "@/lib/api-client";
import { toWav16kMono } from "@/lib/audio/wav";
import { mockCallbackSamples } from "@/lib/mocks";
import { approvalBlocker } from "@/lib/trades/approval";
import type { ExtractResponse, TradeDetail, TradeField, UiError } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  return { code: "internal", message: "Something went wrong. Try again." };
}

export function DeskClient({ samples, audioSamples }: { samples: SampleTranscript[]; audioSamples: AudioSample[] }) {
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<UiError | null>(null);
  const [meta, setMeta] = useState<Omit<ExtractResponse, "trades"> | null>(null);

  // Saved trades in the order they were read, with their server state (trade, latest callback, audit).
  const [order, setOrder] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, TradeDetail>>({});
  const [busy, setBusy] = useState<Record<string, "edit" | "callback" | "approve" | undefined>>({});
  const [errors, setErrors] = useState<Record<string, UiError | null>>({});
  const [callbackOpen, setCallbackOpen] = useState<Record<string, boolean>>({});

  async function run(id: string, kind: "edit" | "callback" | "approve", action: () => Promise<TradeDetail>) {
    setBusy((b) => ({ ...b, [id]: kind }));
    setErrors((e) => ({ ...e, [id]: null }));
    try {
      const detail = await action();
      setDetails((d) => ({ ...d, [id]: detail }));
    } catch (error) {
      setErrors((e) => ({ ...e, [id]: toUiError(error) }));
    } finally {
      setBusy((b) => ({ ...b, [id]: undefined }));
    }
  }

  async function handleExtract(text: string) {
    setExtracting(true);
    setExtractError(null);
    setOrder([]);
    setDetails({});
    setErrors({});
    setCallbackOpen({});
    setMeta(null);
    try {
      const { trades, ...rest } = await extractCall(text);
      setMeta(rest);
      setOrder(trades.map((t) => t.id));
      setDetails(Object.fromEntries(trades.map((t) => [t.id, { trade: t, callback: null, audit: [] }])));
      // Load the saved audit trail (the "instruction captured" event).
      await Promise.all(trades.map((t) => getTradeDetail(t.id).then((d) => setDetails((all) => ({ ...all, [t.id]: d }))).catch(() => {})));
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

      {meta && (
        <p className="text-xs text-muted-foreground">
          Read by <code>{meta.model}</code> · checked against the {meta.register_source === "database" ? "fund register database" : "built-in demo register"} ·{" "}
          {order.length} trade{order.length === 1 ? "" : "s"} found and saved
        </p>
      )}

      {order.map((id) => {
        const detail = details[id];
        if (!detail) return null;
        const { trade, callback, audit } = detail;
        const approved = trade.status === "approved";
        const blocker = approvalBlocker(trade, callback);
        return (
          <div key={id} className="flex flex-col gap-4">
            <TradeReview
              trade={trade}
              pending={busy[id] === "edit"}
              error={busy[id] === undefined && !callbackOpen[id] ? (errors[id] ?? null) : null}
              onEditField={(field: TradeField, value: string) => run(id, "edit", () => editTradeField(id, field, value))}
              canProceed={canProceed(trade.checks) && !approved}
              onProceedToCallback={() => setCallbackOpen((o) => ({ ...o, [id]: true }))}
            />
            {(callbackOpen[id] || callback || approved) && (
              <CallbackPanel
                trade={trade}
                contact={trade.nominated_callback}
                callback={callback}
                pending={busy[id] === "callback" || busy[id] === "approve"}
                error={callbackOpen[id] ? (errors[id] ?? null) : null}
                onSubmitCallback={(t) => run(id, "callback", () => recordCallback(id, t))}
                canApprove={blocker === null}
                approveBlockedReason={blocker}
                onApprove={() => run(id, "approve", () => approveTrade(id))}
                samples={mockCallbackSamples}
                approved={approved}
                exportUrl={approved ? exportUrl(id) : undefined}
                onExport={() =>
                  // The export is logged server-side; refresh the trail once the file has been generated.
                  setTimeout(() => getTradeDetail(id).then((d) => setDetails((all) => ({ ...all, [id]: d }))).catch(() => {}), 1500)
                }
              />
            )}
            <AuditTrail events={audit} />
          </div>
        );
      })}
    </div>
  );
}
