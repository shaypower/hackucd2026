"use client";
// Container for /desk (Dev A): owns input state and API calls; components only render props.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TradeInput } from "@/components/trade/TradeInput";
import type { AudioSample, SampleTranscript } from "@/components/trade/types";
import { ApiClientError, extractCall, getTradeDetail, transcribeAudio } from "@/lib/api-client";
import { toWav16kMono } from "@/lib/audio/wav";
import type { ExtractResponse, TradeDetail, UiError } from "@/lib/types";
import { TradeWorkspace } from "../trade-workspace";
import { PhoneLine } from "./phone-line";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  return { code: "internal", message: "Something went wrong. Try again." };
}

// One-click demo scenarios, linked from the home page as /desk#<id>.
export const SCENARIOS = {
  audio: { title: "A real phone call", guide: "The recording is transcribed, the trade read and checked. Next: Proceed to callback → “Callback confirms” → Approve → Download." },
  fraud: { title: "A fraudulent instruction", guide: "An unknown caller and a mistyped ISIN are blocked before anyone calls back. Try “Use IE00B4L5Y983”: the caller check still blocks it." },
  mismatch: { title: "A fat-finger callback", guide: "The callback reads back the wrong quantity. Pick “Callback says 500 units” → Compare: Approve stays locked." },
} as const;
type ScenarioId = keyof typeof SCENARIOS;

export function DeskClient({ samples, audioSamples }: { samples: SampleTranscript[]; audioSamples: AudioSample[] }) {
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<UiError | null>(null);
  const [meta, setMeta] = useState<Omit<ExtractResponse, "trades"> | null>(null);
  const [trades, setTrades] = useState<TradeDetail[]>([]);
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const started = useRef(false);

  async function handleExtract(text: string) {
    setExtracting(true);
    setExtractError(null);
    setTrades([]);
    setMeta(null);
    try {
      const { trades, ...rest } = await extractCall(text);
      setMeta(rest);
      setTrades(trades.map((trade) => ({ trade, callback: null, audit: [] })));
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

  // A call to the phone line: show that saved trade on the desk (top of the page).
  const openPhoneTrade = useCallback(async (id: string) => {
    try {
      const detail = await getTradeDetail(id);
      setMeta(null);
      setTrades([detail]);
      requestAnimationFrame(() => document.getElementById("desk-trades")?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      setExtractError(toUiError(error));
    }
  }, []);

  // Run a scenario from the URL hash once, on first load.
  useEffect(() => {
    const id = window.location.hash.slice(1) as ScenarioId;
    if (started.current || !(id in SCENARIOS)) return;
    started.current = true;
    const sample = (sid: string) => samples.find((s) => s.id === sid)?.transcript ?? "";
    // Start after this render (the hash is only known in the browser).
    void Promise.resolve().then(async () => {
      setScenario(id);
      if (id === "audio" && audioSamples[0]) {
        const blob = await (await fetch(audioSamples[0].url)).blob();
        await handleAudio(blob, audioSamples[0].label);
      } else {
        const text = sample(id === "fraud" ? "fraud" : "clean");
        setTranscript(text);
        await handleExtract(text);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {scenario && (
        <div className="rounded-md border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40">
          <strong>Demo: {SCENARIOS[scenario].title}.</strong> {SCENARIOS[scenario].guide}
        </div>
      )}

      <PhoneLine onOpen={openPhoneTrade} />

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
          {trades.length} trade{trades.length === 1 ? "" : "s"} found and saved ·{" "}
          <Link href="/trades" className="underline">
            all trades
          </Link>
        </p>
      )}

      <div id="desk-trades" className="flex scroll-mt-4 flex-col gap-6">
        {trades.map((detail) => (
          <TradeWorkspace key={detail.trade.id} initial={detail} openCallback={scenario === "mismatch"} />
        ))}
      </div>
    </div>
  );
}
