// POST /api/twilio/callback/answer: one spoken answer from the contact (Twilio speech recognition).
import { answerTurn } from "@/lib/callback-agent/call";
import { say, twiml, verifiedTwilioParams } from "@/lib/twilio/webhook";

export const maxDuration = 30;

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });
  try {
    return twiml(await answerTurn(params.CallSid ?? "", params.SpeechResult ?? ""));
  } catch (error) {
    console.error("callback agent failed:", error);
    return twiml(say("Sorry, something went wrong on our side. The dealing desk will call you back. Goodbye.") + "<Hangup/>");
  }
}
