// POST /api/trades/[id]/call -> { call_sid, to }: TelDeal phones the nominated contact (automated callback agent).
import { apiError, handleErrors } from "@/lib/api/respond";
import { callbackDestination, maskNumber, placeCallbackCall } from "@/lib/callback-agent/call";
import { getRegister } from "@/lib/db/get-register";
import { addAudit, getTrade, insertCallbackCall } from "@/lib/db/trades";
import { callbackBlocker } from "@/lib/trades/approval";
import { publicUrl, twilioConfig } from "@/lib/twilio/webhook";

export async function POST(request: Request, ctx: RouteContext<"/api/trades/[id]/call">) {
  const { id } = await ctx.params;
  if (!twilioConfig()) return apiError("upstream_error", "The phone line isn't configured.", 503);
  return handleErrors(async () => {
    const { register } = await getRegister();
    const trade = await getTrade(id, register);
    const blocker = callbackBlocker(trade);
    if (blocker) return apiError("conflict", blocker, 409);
    const contact = trade.nominated_callback!;

    // Safety: the demo register's numbers are made up and may belong to real people. Never dial them.
    if (!process.env.DEMO_CALLBACK_NUMBER && /\b555\b/.test(contact.phone)) {
      return apiError("conflict", "The register's numbers are fictional demo numbers. Set DEMO_CALLBACK_NUMBER to place automated callbacks.", 409);
    }
    const { to, redirected } = callbackDestination(contact.phone);
    const baseUrl = new URL(publicUrl(request)).origin;
    let callSid: string;
    try {
      callSid = await placeCallbackCall(baseUrl, to);
    } catch (error) {
      console.error(error);
      return apiError("upstream_error", "Couldn't place the call. Try again, or record the callback manually.", 502);
    }
    await insertCallbackCall({ call_sid: callSid, trade_id: id, to_number: to });
    await addAudit(id, "callback_call", {
      call_sid: callSid,
      status: "dialling",
      contact: contact.name,
      register_phone: contact.phone,
      ...(redirected ? { demo_redirected_to: maskNumber(to) } : {}),
    });
    return Response.json({ call_sid: callSid, to: maskNumber(to), redirected });
  });
}
