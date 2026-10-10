"use client";
// Capture: call audio (record / upload / sample) or a pasted transcript, then extract. Props only.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, FileAudio, Loader2, Mic, Play, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeInputProps } from "@/components/trade/types";
import { cn } from "@/lib/utils";

const ERROR_TITLES: Partial<Record<string, string>> = {
  unreadable_transcript: "Couldn't find a trade in this call",
  bad_request: "Check the input",
  upstream_error: "The reading service didn't respond",
};

/** Five bars that rise and fall while audio is live. Decorative. */
function Levels({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex h-4 items-end gap-[3px]", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="td-level w-[3px] rounded-full bg-current" style={{ height: "100%", animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

function firstCallerLine(transcript: string) {
  const line = transcript.split("\n").find((l) => /^(caller|client)\s*:/i.test(l.trim())) ?? transcript.split("\n")[0] ?? "";
  return line.replace(/^\s*[\w ]+:\s*/, "");
}

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
  const MAX_SECONDS = 120; // lib/audio/wav.ts rejects longer recordings
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Stop at the transcription limit rather than failing after the agent presses Stop.
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) recorder.current?.stop();
  }, [recording, seconds]);

  // Release the microphone if the panel unmounts mid-recording.
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );

  const busy = pending || transcribing || recording;
  const empty = transcript.trim().length === 0;
  const lineCount = empty ? 0 : transcript.trim().split("\n").length;

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

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <form
      aria-label="Capture an instruction"
      className="animate-in overflow-hidden rounded-xl border border-border bg-paper duration-500 ease-out fade-in slide-in-from-bottom-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !busy) onSubmit(transcript);
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-border px-5 pt-5 pb-4 sm:px-7">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Capture</p>
          <h2 className="mt-1.5 font-serif text-[28px] leading-tight tracking-[-0.015em]">New instruction</h2>
        </div>
        <p className="max-w-md text-[13px] text-muted-foreground">
          The AI proposes the trade and quotes the call. Code checks every field against the register.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Sources */}
        <div className="flex flex-col gap-6 border-b border-border px-5 py-5 sm:px-7 lg:border-r lg:border-b-0">
          {onAudio && (
            <section aria-labelledby="ti-audio-h" className="flex flex-col gap-3">
              <h3 id="ti-audio-h" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                Call audio
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {recording ? (
                  <Button type="button" size="lg" variant="destructive" className="h-10 gap-2.5 px-4" onClick={() => recorder.current?.stop()}>
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-fail opacity-60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-fail" />
                    </span>
                    Stop · <span className="font-mono tabular-nums">{clock} / 2:00</span>
                    <Square aria-hidden="true" className="size-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button type="button" size="lg" className="h-10 px-4" disabled={busy} onClick={startRecording}>
                    <Mic aria-hidden="true" />
                    Record call
                  </Button>
                )}
                <Button type="button" size="lg" variant="outline" className="h-10 px-4" disabled={busy} onClick={() => fileInput.current?.click()}>
                  <Upload aria-hidden="true" />
                  Upload
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
              </div>

              {audioSamples.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {audioSamples.map((s) => (
                    <li key={s.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <FileAudio aria-hidden="true" className="size-4 shrink-0 text-copper-ink" />
                          <span className="truncate">{s.label}</span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={async () => {
                            setMicError(null);
                            try {
                              const res = await fetch(s.url);
                              if (!res.ok) throw new Error(String(res.status));
                              onAudio(await res.blob(), s.label);
                            } catch {
                              setMicError("Couldn't load the sample recording. Try again, or paste a transcript.");
                            }
                          }}
                        >
                          <Play aria-hidden="true" className="fill-current" />
                          Use this call
                        </Button>
                      </div>
                      <audio controls preload="none" src={s.url} className="h-8 w-full" aria-label={`Listen: ${s.label}`} />
                    </li>
                  ))}
                </ul>
              )}

              <div aria-live="polite" className="min-h-5 text-[13px]">
                {transcribing && (
                  <span className="inline-flex animate-in items-center gap-2 text-copper-ink fade-in">
                    <Levels />
                    Transcribing the call…
                  </span>
                )}
                {recording && (
                  <span className="inline-flex animate-in items-center gap-2 text-fail fade-in">
                    <Levels />
                    Recording. Stop when the caller has finished.
                  </span>
                )}
                {micError && <span className="text-fail">{micError}</span>}
              </div>
            </section>
          )}

          {samples.length > 0 ? (
            <section aria-labelledby="ti-samples-h" className="flex flex-col gap-2">
              <h3 id="ti-samples-h" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                {onAudio ? "Or a sample transcript" : "Sample transcripts"}
              </h3>
              <ul className="flex flex-col">
                {samples.map((s, i) => {
                  const active = transcript === s.transcript;
                  return (
                    <li key={s.id} className="animate-in fade-in fill-mode-both" style={{ animationDelay: `${150 + i * 50}ms` }}>
                      <button
                        type="button"
                        disabled={busy}
                        aria-pressed={active}
                        onClick={() => setTranscript(s.transcript)}
                        className={cn(
                          "group flex w-full flex-col gap-0.5 border-b border-border px-2 py-2.5 text-left transition-colors duration-200 hover:bg-background disabled:pointer-events-none disabled:opacity-50",
                          active && "bg-background",
                        )}
                      >
                        <span className="flex items-center gap-2 text-[14px] font-medium">
                          <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-input transition-colors duration-200", active && "bg-copper")} />
                          {s.label}
                        </span>
                        <span className="truncate pl-3.5 font-serif text-[14px] text-muted-foreground italic">“{firstCallerLine(s.transcript)}”</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <p className="text-[13px] text-muted-foreground">Or paste the call transcript.</p>
          )}
        </div>

        {/* Transcript */}
        <div className="flex flex-col gap-2 px-5 py-5 sm:px-7">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="transcript" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              Call transcript
            </label>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {lineCount} {lineCount === 1 ? "line" : "lines"} · {transcript.length.toLocaleString("en-IE")} / 20,000
            </span>
          </div>
          <div className="relative flex-1">
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={"Agent: Dealing desk…\nCaller: Hi, it's … account … I'd like to subscribe …"}
              rows={12}
              maxLength={20000}
              disabled={busy}
              className="h-full min-h-64 w-full resize-y rounded-lg border border-input bg-card px-4 py-3 font-mono text-[13.5px] leading-relaxed text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/70 focus:border-copper focus:ring-3 focus:ring-copper/15 disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground"
            />
            {(pending || transcribing) && (
              <div className="pointer-events-none absolute inset-0 flex animate-in items-center justify-center rounded-lg bg-paper/70 backdrop-blur-[1px] duration-200 fade-in">
                <span className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-[13px] font-medium text-[#f5f3ee] shadow-lg">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  {pending ? "Reading the call, then checking every field…" : "Listening to the recording…"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex animate-in gap-3 border-t border-fail/25 bg-fail-wash px-5 py-3.5 text-sm text-fail duration-200 fade-in slide-in-from-top-1 sm:px-7"
        >
          <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
          <div>
            <p className="font-semibold">{ERROR_TITLES[error.code] ?? "Something went wrong"}</p>
            <p className="text-foreground/80">{error.message}</p>
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-background px-5 py-3.5 sm:px-7">
        <p className="text-[13px] text-muted-foreground">
          {pending
            ? "The AI proposes values with quotes; it never approves anything."
            : empty
              ? "Record, upload, or paste a call to begin."
              : "Ready. Extraction quotes the call for every value it finds."}
        </p>
        <Button type="submit" size="lg" className="h-10 px-5" disabled={empty || busy}>
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {pending ? "Reading the call…" : "Extract trade"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}
