// POST /api/twilio/voice: Twilio calls this when someone rings the TelDeal number. Answers with TwiML:
// recording notice, then record the instruction (up to 2 minutes).
import { attr, say, twiml, twilioConfig, verifiedTwilioParams } from "@/lib/twilio/webhook";

export async function POST(request: Request) {
  if (!twilioConfig()) return twiml(say("This line is not configured yet. Goodbye.") + "<Hangup/>");
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });

  const from = encodeURIComponent(params.From ?? "");
  return twiml(
    say("You've reached the TelDeal dealing desk. This call is recorded for dealing and compliance purposes.") +
      say("After the tone, please give your name, your account number, and your instruction, including the fund ISIN and the amount. Press the hash key, or hang up, when you're finished.") +
      `<Record maxLength="120" finishOnKey="#" playBeep="true" trim="trim-silence" action="/api/twilio/recorded" recordingStatusCallback="${attr(`/api/twilio/recording?from=${from}`)}" recordingStatusCallbackEvent="completed"/>` +
      say("We didn't receive a recording. Please call again. Goodbye."),
  );
}
