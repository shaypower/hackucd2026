// POST /api/callback { trade_id, original, transcript } -> CallbackResult
// The AI reads the callback call; code compares it field by field with the original instruction.
import { ExtractionError, extractTrades } from "@/lib/ai/extract";
import { apiError, readJson } from "@/lib/api/respond";
import { diffTrades } from "@/lib/trades/diff";
import { CallbackCheckRequest, type CallbackResult } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = CallbackCheckRequest.safeParse(await readJson(request));
  if (!body.success) return apiError("bad_request", "Paste the callback transcript.", 400);
  const { trade_id, original, transcript } = body.data;

  let result;
  try {
    result = await extractTrades(transcript);
  } catch (error) {
    if (error instanceof ExtractionError) return apiError(error.code, error.message, 502);
    console.error("callback extract crashed:", error);
    return apiError("internal", "Something went wrong reading the callback.", 500);
  }

  const [confirmed, ...extra] = result.extraction.trades;
  if (!confirmed) {
    return apiError("unreadable_transcript", result.extraction.unreadable_reason ?? "The callback doesn't confirm a trade.", 422);
  }
  if (extra.length > 0) {
    return apiError("callback_mismatch", "The callback mentions more than one trade. Confirm one instruction per callback.", 422);
  }

  const { fields, all_match } = diffTrades(original, confirmed);
  const response: CallbackResult = {
    id: crypto.randomUUID(),
    trade_id,
    transcript,
    extracted: confirmed,
    fields,
    all_match,
    created_at: new Date().toISOString(),
  };
  return Response.json(response);
}
