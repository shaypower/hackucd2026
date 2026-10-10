// GET /api/trades/[id]/export -> .xlsx for the Payments team (approved trades only)
import { apiError, handleErrors } from "@/lib/api/respond";
import { billingConfigured, hasActiveSubscription } from "@/lib/billing/stripe";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getTradeDetail } from "@/lib/db/trades";
import { buildPaymentsWorkbook, exportFileName, XLSX_TYPE } from "@/lib/trades/export";
import { findFund } from "@/lib/validation/register";

export async function GET(_request: Request, ctx: RouteContext<"/api/trades/[id]/export">) {
  const { id } = await ctx.params;
  return handleErrors(async () => {
    if (billingConfigured() && !(await hasActiveSubscription())) {
      return apiError("subscription_required", "Approving trades and exporting to Payments needs an active TelDeal Desk subscription. Subscribe on the Billing page.", 402);
    }
    const { register } = await getRegister();
    const { trade, callback } = await getTradeDetail(id, register);
    if (trade.status !== "approved" || !callback) return apiError("conflict", "Only approved trades can be exported.", 409);

    const file = exportFileName(trade);
    await addAudit(id, "exported", { file });
    const { audit } = await getTradeDetail(id, register); // include the export event itself
    const fundName = trade.extracted.isin ? (findFund(register, trade.extracted.isin)?.name ?? null) : null;
    const bytes = await buildPaymentsWorkbook({ trade, callback, audit, fundName });
    return new Response(bytes, {
      headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="${file}"` },
    });
  });
}
