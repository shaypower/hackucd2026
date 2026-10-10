// POST /api/twilio/callback/voice: the contact answered TelDeal's callback call.
import { openingTurn } from "@/lib/callback-agent/call";
import { getCallbackCall } from "@/lib/db/trades";
import { say, twiml, verifiedTwilioParams } from "@/lib/twilio/webhook";

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });
  const call = await getCallbackCall(params.CallSid ?? "");
  if (!call) return twiml(say("Sorry, this call could not be matched to an instruction. Goodbye.") + "<Hangup/>");
  return twiml(await openingTurn(call));
}
