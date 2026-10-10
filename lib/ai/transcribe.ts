// Transcribes a phone call recording with an audio-capable OpenRouter model.
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, generateText } from "ai";
import { ExtractionError } from "@/lib/ai/extract";

// Best of 4 audio models on our sample call (account digits + spoken ISIN correct 3/3); see PR.
export const DEFAULT_AUDIO_MODEL = "openai/gpt-audio-mini";

export const TRANSCRIBE_INSTRUCTIONS = `Transcribe this recorded phone call to a fund dealing desk, verbatim.
- One line per turn, prefixed "Agent:" (the dealing desk) or "Caller:" (the client). If you can't tell who is speaking, use "Speaker:".
- Account numbers and codes are often read digit by digit: write "four zero zero three one" as 40031. In such a run, "for"/"to"/"oh" are the digits 4/2/0.
- Write numbers and codes exactly as spoken. Spell out letter/number sequences such as ISINs as said (e.g. "I E zero zero B four...") rather than guessing a code.
- Mark unclear audio as [inaudible]. Do not summarise, correct, or add anything that was not said.
- Output only the transcript.`;

export async function transcribeCall(
  audio: Uint8Array,
  mediaType: string,
  model = process.env.OPENROUTER_AUDIO_MODEL || DEFAULT_AUDIO_MODEL,
): Promise<{ transcript: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ExtractionError("upstream_error", "OPENROUTER_API_KEY is not set.");
  const openrouter = createOpenRouter({ apiKey });
  try {
    const { text } = await generateText({
      model: openrouter(model),
      instructions: TRANSCRIBE_INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this call." },
            { type: "file", data: audio, mediaType },
          ],
        },
      ],
      temperature: 0,
      maxRetries: 1,
      timeout: 55_000,
    });
    return { transcript: text.trim(), model };
  } catch (error) {
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      throw new ExtractionError("upstream_error", "The transcription model is rate-limited. Try again in a moment.", { cause: error });
    }
    throw new ExtractionError("upstream_error", "Transcription failed. Try again, or paste the transcript.", { cause: error });
  }
}
