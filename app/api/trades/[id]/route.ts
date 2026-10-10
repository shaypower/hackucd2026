// GET /api/trades/[id] -> TradeDetail
// PATCH /api/trades/[id] { field, value } -> TradeDetail (agent correction; checks re-run, callback needed again)
import { apiError, handleErrors, readJson } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getTrade, getTradeDetail, updateTrade } from "@/lib/db/trades";
import { applyEdit } from "@/lib/trades/edit";
import { EditFieldRequest } from "@/lib/types";
import { runChecks, statusFromChecks } from "@/lib/validation/checks";

export async function GET(_request: Request, ctx: RouteContext<"/api/trades/[id]">) {
  const { id } = await ctx.params;
  return handleErrors(async () => {
    const { register } = await getRegister();
    return Response.json(await getTradeDetail(id, register));
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/trades/[id]">) {
  const { id } = await ctx.params;
  const body = EditFieldRequest.safeParse(await readJson(request));
  if (!body.success) return apiError("bad_request", "Send { field, value }.", 400);
  const { field, value } = body.data;

  return handleErrors(async () => {
    const { register } = await getRegister();
    const trade = await getTrade(id, register);
    if (trade.status === "approved") return apiError("conflict", "Approved trades can't be edited.", 409);

    const extracted = applyEdit(trade.extracted, field, value);
    const checks = runChecks(extracted, register);
    await updateTrade(id, { extracted, checks, status: statusFromChecks(checks) });
    await addAudit(id, "field_edited", { field, from: trade.extracted[field], to: extracted[field] });
    return Response.json(await getTradeDetail(id, register));
  });
}
