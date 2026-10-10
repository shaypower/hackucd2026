// POST /api/transcribe (multipart form, field "audio") -> TranscribeResponse
import { ExtractionError } from "@/lib/ai/extract";
import { transcribeCall } from "@/lib/ai/transcribe";
import { apiError } from "@/lib/api/respond";
import type { TranscribeResponse } from "@/lib/types";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/flac", "audio/aac"];

export async function POST(request: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("audio");
  } catch {
    return apiError("bad_request", "Send the recording as multipart form data in the field \"audio\".", 400);
  }
  if (!(file instanceof Blob) || file.size === 0) return apiError("bad_request", "No recording received.", 400);
  if (file.size > MAX_BYTES) return apiError("bad_request", "Recording is too large (max 4 MB, about 2 minutes).", 413);
  const mediaType = file.type.split(";")[0];
  if (!ACCEPTED.includes(mediaType)) return apiError("bad_request", `Unsupported audio type "${file.type || "unknown"}".`, 415);

  try {
    const { transcript, model } = await transcribeCall(new Uint8Array(await file.arrayBuffer()), mediaType);
    if (!transcript) return apiError("unreadable_transcript", "No speech found in the recording.", 422);
    const response: TranscribeResponse = { transcript, model };
    return Response.json(response);
  } catch (error) {
    if (error instanceof ExtractionError) {
      console.error("transcribe failed:", error.cause);
      return apiError(error.code, error.message, 502);
    }
    console.error("transcribe crashed:", error);
    return apiError("internal", "Something went wrong transcribing the call.", 500);
  }
}
