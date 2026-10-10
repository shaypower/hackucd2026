"use client";
// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TradeInputProps } from "@/components/trade/types";

const ERROR_TITLES: Partial<Record<string, string>> = {
  unreadable_transcript: "Couldn't find a trade in this call",
  bad_request: "Check the input",
};

export function TradeInput({
  samples,
  pending,
  error,
  onSubmit,
  transcript: controlled,
  onTranscriptChange,
  onAudio,
  transcribing = false,
  audioSamples = [],
}: TradeInputProps) {
  const [local, setLocal] = useState("");
  const transcript = controlled ?? local;
  const setTranscript = (value: string) => (onTranscriptChange ? onTranscriptChange(value) : setLocal(value));

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const busy = pending || transcribing || recording;
  const empty = transcript.trim().length === 0;

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (chunks.length > 0) onAudio?.(new Blob(chunks, { type: rec.mimeType }), "Recording");
      };
      recorder.current = rec;
      setSeconds(0);
      rec.start();
      setRecording(true);
    } catch {
      setMicError("Microphone not available. Allow microphone access, or upload a recording instead.");
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !busy) onSubmit(transcript);
      }}
    >
      {onAudio && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <span className="text-sm font-medium">Call audio:</span>
          {recording ? (
            <Button type="button" variant="destructive" size="sm" onClick={() => recorder.current?.stop()}>
              ■ Stop recording ({seconds}s)
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={startRecording}>
              ● Record call
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
            Upload recording
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onAudio(file, file.name);
            }}
          />
          {audioSamples.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => onAudio(await (await fetch(s.url)).blob(), s.label)}
            >
              ▶ {s.label}
            </Button>
          ))}
          {audioSamples.map((s) => (
            <audio key={`${s.id}-player`} controls src={s.url} className="h-8 max-w-full" aria-label={`Listen: ${s.label}`} />
          ))}
          {transcribing && <span className="text-sm text-muted-foreground">Transcribing the call…</span>}
          {micError && <span className="text-sm text-red-700 dark:text-red-300">{micError}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Or try a sample transcript:</span>
        {samples.map((s) => (
          <Button key={s.id} type="button" variant="outline" size="sm" disabled={busy} onClick={() => setTranscript(s.transcript)}>
            {s.label}
          </Button>
        ))}
      </div>

      <label htmlFor="transcript" className="text-sm font-medium">
        Call transcript
      </label>
      <Textarea
        id="transcript"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={"Agent: Dealing desk...\nCaller: Hi, it's ... account ... I'd like to subscribe ..."}
        rows={9}
        maxLength={20000}
        disabled={busy}
        className="font-mono text-sm"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={empty || busy}>
          {pending ? "Reading the call…" : "Extract trade"}
        </Button>
        {pending && <span className="text-sm text-muted-foreground">The AI reads the call, then every field is checked against the register.</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{ERROR_TITLES[error.code] ?? "Something went wrong"}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
