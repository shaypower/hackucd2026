// POST /api/twilio/recording: Twilio's recording-status callback. Replies at once, then transcribes,
// extracts, checks and saves the trade in the background (after()).
import { after } from "next/server";
import { processRecordedCall } from "@/lib/phone/process";
import { verifiedTwilioParams } from "@/lib/twilio/webhook";

export const maxDuration = 60;

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) return new Response("Forbidden", { status: 403 });
  if (params.RecordingStatus !== "completed" || !params.RecordingUrl || !params.RecordingSid) {
    return new Response(null, { status: 204 });
  }

  const from = new URL(request.url).searchParams.get("from") || params.From || null;
  after(async () => {
    try {
      const ids = await processRecordedCall({
        recordingUrl: params.RecordingUrl,
        recordingSid: params.RecordingSid,
        callSid: params.CallSid ?? "",
        from,
        durationSeconds: Number(params.RecordingDuration ?? 0),
      });
      console.log("phone: saved trades", ids.join(", "), "from call", params.CallSid);
    } catch (error) {
      console.error("phone: failed to process call", params.CallSid, error);
    }
  });
  return new Response(null, { status: 204 });
}
