// POST /api/trades/[id]/approve -> TradeDetail
// Re-checks against the register as it is now, then requires a matching callback.
import { apiError, handleErrors } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getTrade, getTradeDetail, latestCallback, updateTrade } from "@/lib/db/trades";
import { approvalBlocker } from "@/lib/trades/approval";
import { runChecks } from "@/lib/validation/checks";

export async function POST(_request: Request, ctx: RouteContext<"/api/trades/[id]/approve">) {
  const { id } = await ctx.params;
  return handleErrors(async () => {
    const { register } = await getRegister();
    const saved = await getTrade(id, register);
    const trade = { ...saved, checks: runChecks(saved.extracted, register) };
    const blocker = approvalBlocker(trade, await latestCallback(id));
    if (blocker) return apiError("conflict", blocker, 409);

    await updateTrade(id, { status: "approved", checks: trade.checks });
    await addAudit(id, "approved", {});
    return Response.json(await getTradeDetail(id, register));
  });
}
