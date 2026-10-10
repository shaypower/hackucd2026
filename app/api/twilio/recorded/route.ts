// POST /api/twilio/recorded: Twilio calls this when recording stops (caller pressed # or stayed silent).
import { say, twiml, verifiedTwilioParams } from "@/lib/twilio/webhook";

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });
  if (Number(params.RecordingDuration ?? 0) < 1) {
    return twiml(say("We didn't hear anything. Please call again. Goodbye.") + "<Hangup/>");
  }
  return twiml(
    say("Thank you. Your instruction has been received. The dealing desk will call you back on your nominated number to confirm it before anything is dealt. Goodbye.") +
      "<Hangup/>",
  );
}
