"use client";
// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TradeInputProps } from "@/components/trade/types";

export function TradeInput({ samples, pending, error, onSubmit }: TradeInputProps) {
  const [transcript, setTranscript] = useState("");
  const empty = transcript.trim().length === 0;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !pending) onSubmit(transcript);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Try a sample call:</span>
        {samples.map((s) => (
          <Button key={s.id} type="button" variant="outline" size="sm" disabled={pending} onClick={() => setTranscript(s.transcript)}>
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
        disabled={pending}
        className="font-mono text-sm"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={empty || pending}>
          {pending ? "Reading the call…" : "Extract trade"}
        </Button>
        {pending && <span className="text-sm text-muted-foreground">The AI reads the call, then every field is checked against the register.</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{error.code === "unreadable_transcript" ? "Couldn't find a trade in this call" : "Extraction failed"}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
