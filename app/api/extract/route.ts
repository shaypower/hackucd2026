// POST /api/extract { transcript } -> ExtractResponse
// Reads the trade(s) from a call with the AI model, runs the deterministic checks and saves each trade.
import { ExtractionError, extractTrades } from "@/lib/ai/extract";
import { apiError, readJson } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { insertTrade } from "@/lib/db/trades";
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
  const trades = result.extraction.trades.map((t) => buildTrade(t, transcript, register));
  try {
    for (const trade of trades) await insertTrade(trade, { model: result.model, register_source: source });
  } catch (error) {
    console.error("save failed:", error);
    return apiError("internal", "The trade was read but couldn't be saved. Try again.", 500);
  }

  const response: ExtractResponse = {
    trades,
    unreadable_reason: result.extraction.unreadable_reason,
    register_source: source,
    model: result.model,
  };
  return Response.json(response);
}
