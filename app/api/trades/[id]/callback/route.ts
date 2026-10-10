// POST /api/trades/[id]/callback { transcript } -> TradeDetail
// The AI reads the callback; code compares it with the saved original (never with data from the browser).
import { ExtractionError, extractTrades } from "@/lib/ai/extract";
import { apiError, handleErrors, readJson } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getTrade, getTradeDetail, insertCallback, latestCallback, updateCallbackFields, updateCallbackHeard, updateTrade } from "@/lib/db/trades";
import { applyEdit } from "@/lib/trades/edit";
import { callbackBlocker } from "@/lib/trades/approval";
import { acceptField, diffTrades, SOFT_FIELDS } from "@/lib/trades/diff";
import { CallbackRequest, TradeField, type CallbackResult } from "@/lib/types";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/trades/[id]/callback">) {
  const { id } = await ctx.params;
  const body = CallbackRequest.safeParse(await readJson(request));
  if (!body.success) return apiError("bad_request", "Paste the callback transcript.", 400);
  const { transcript } = body.data;

  return handleErrors(async () => {
    const { register } = await getRegister();
    const trade = await getTrade(id, register);
    const blocker = callbackBlocker(trade);
    if (blocker) return apiError("conflict", blocker, 409);

    let result;
    try {
      result = await extractTrades(transcript);
    } catch (error) {
      if (error instanceof ExtractionError) return apiError(error.code, error.message, 502);
      throw error;
    }
    const [confirmed, ...extra] = result.extraction.trades;
    if (!confirmed) {
      return apiError("unreadable_transcript", result.extraction.unreadable_reason ?? "The callback doesn't confirm a trade.", 422);
    }
    if (extra.length > 0) {
      return apiError("callback_mismatch", "The callback mentions more than one trade. Confirm one instruction per callback.", 422);
    }

    const { fields, all_match } = diffTrades(trade.extracted, confirmed);
    const callback: CallbackResult = {
      id: crypto.randomUUID(),
      trade_id: id,
      transcript,
      extracted: confirmed,
      fields,
      all_match,
      created_at: new Date().toISOString(),
    };
    await insertCallback(callback);
    await updateTrade(id, { status: all_match ? "ready_to_approve" : "callback_mismatch" });
    await addAudit(id, "callback_recorded", {
      contact: trade.nominated_callback?.name,
      all_match,
      mismatched: fields.filter((f) => !f.match).map((f) => f.field),
      model: result.model,
    });
    return Response.json(await getTradeDetail(id, register));
  });
}

// PATCH /api/trades/[id]/callback { field } -> TradeDetail
// The dealer accepts a name difference on the latest callback (e.g. speech-to-text spelling of the fund).
// Key fields (direction, ISIN, account, amount, units/cash, currency) can never be accepted.
// { field, value } corrects what was heard on the callback (e.g. a speech-recognition slip); audited.
const AcceptRequest = z.object({ field: TradeField, value: z.string().optional() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/trades/[id]/callback">) {
  const { id } = await ctx.params;
  const body = AcceptRequest.safeParse(await readJson(request));
  if (!body.success) return apiError("bad_request", "Send { field }.", 400);
  const { field, value } = body.data;
  if (value !== undefined) return correctHeard(id, field, value);
  if (!SOFT_FIELDS.includes(field)) {
    return apiError("conflict", "Key fields can't be accepted. If the contact really said something different, call them again.", 409, field);
  }

  return handleErrors(async () => {
    const { register } = await getRegister();
    const trade = await getTrade(id, register);
    const callback = await latestCallback(id);
    if (trade.status === "approved") return apiError("conflict", "This trade is already approved.", 409);
    const diff = callback?.fields.find((f) => f.field === field);
    if (!callback || !diff || diff.match) return apiError("conflict", "Nothing to accept for that field.", 409, field);

    const { fields, all_match } = acceptField(callback.fields, field);
    await updateCallbackFields(callback.id, fields, all_match);
    if (all_match && trade.status === "callback_mismatch") await updateTrade(id, { status: "ready_to_approve" });
    await addAudit(id, "callback_field_accepted", { field, original: diff.original, callback: diff.callback, all_match });
    return Response.json(await getTradeDetail(id, register));
  });
}

async function correctHeard(id: string, field: TradeField, value: string): Promise<Response> {
  return handleErrors(async () => {
    const { register } = await getRegister();
    const trade = await getTrade(id, register);
    const callback = await latestCallback(id);
    if (trade.status === "approved") return apiError("conflict", "This trade is already approved.", 409);
    if (!callback) return apiError("conflict", "Record a callback first.", 409);

    const heard = applyEdit(callback.extracted, field, value);
    const diff = diffTrades(trade.extracted, heard);
    // Keep earlier "accepted" name differences.
    const fields = diff.fields.map((f) => (callback.fields.find((o) => o.field === f.field)?.accepted && !f.match ? { ...f, match: true, accepted: true } : f));
    const allMatch = fields.every((f) => f.match);
    await updateCallbackHeard(callback.id, heard, fields, allMatch);
    await updateTrade(id, { status: allMatch ? "ready_to_approve" : "callback_mismatch" });
    await addAudit(id, "callback_field_accepted", { field, corrected: true, from: callback.extracted[field], to: heard[field], all_match: allMatch });
    return Response.json(await getTradeDetail(id, register));
  });
}
