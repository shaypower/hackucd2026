// POST /api/extract { transcript } -> ExtractResponse
// Reads the trade(s) from a call with the AI model, then runs the deterministic checks.
import { ExtractionError, extractTrades } from "@/lib/ai/extract";
import { apiError, readJson } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { buildTrade } from "@/lib/trades/build";
import { ExtractRequest, type ExtractResponse } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = ExtractRequest.safeParse(await readJson(request));
  if (!body.success) {
    return apiError("bad_request", "Paste a call transcript (up to 20,000 characters).", 400);
  }
  const { transcript } = body.data;

  let result;
  try {
    result = await extractTrades(transcript);
  } catch (error) {
    if (error instanceof ExtractionError) {
      console.error("extract failed:", error.code, error.cause);
      return apiError(error.code, error.message, 502);
    }
    console.error("extract crashed:", error);
    return apiError("internal", "Something went wrong reading the call.", 500);
  }

  if (result.extraction.trades.length === 0) {
    return apiError(
      "unreadable_transcript",
      result.extraction.unreadable_reason ?? "No dealing instruction found in this call. Enter the details manually.",
      422,
    );
  }

  const { register, source } = await getRegister();
  const response: ExtractResponse = {
    trades: result.extraction.trades.map((t) => buildTrade(t, transcript, register)),
    unreadable_reason: result.extraction.unreadable_reason,
    register_source: source,
    model: result.model,
  };
  return Response.json(response);
}
