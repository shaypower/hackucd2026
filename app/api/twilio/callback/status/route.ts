// POST /api/twilio/callback/status: the callback call ended (or never connected).
import { addAudit, getCallbackCall, updateCallbackCall } from "@/lib/db/trades";
import { verifiedTwilioParams } from "@/lib/twilio/webhook";

const UNREACHED: Partial<Record<string, "no_answer" | "failed">> = { "no-answer": "no_answer", busy: "no_answer", failed: "failed", canceled: "failed" };

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });
  const call = await getCallbackCall(params.CallSid ?? "");
  if (!call || call.outcome) return new Response(null, { status: 204 });

  const status = params.CallStatus ?? "unknown";
  const outcome: "no_answer" | "failed" | "incomplete" | null = UNREACHED[status] ?? (status === "completed" ? "incomplete" : null);
  if (outcome) {
    await updateCallbackCall(call.call_sid, { outcome });
    await addAudit(call.trade_id, "callback_call", {
      call_sid: call.call_sid,
      status: outcome === "incomplete" ? "contact hung up before confirming" : `not reached (${status})`,
    });
  }
  return new Response(null, { status: 204 });
}
