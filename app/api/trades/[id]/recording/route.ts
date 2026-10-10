// GET /api/trades/[id]/recording: plays back the original call (proxied, so Twilio credentials stay server-side).
import { apiError, handleErrors } from "@/lib/api/respond";
import { getRecordingSid } from "@/lib/db/trades";
import { fetchRecording, recordingUrlFor } from "@/lib/phone/process";

export async function GET(_request: Request, ctx: RouteContext<"/api/trades/[id]/recording">) {
  const { id } = await ctx.params;
  return handleErrors(async () => {
    const sid = await getRecordingSid(id);
    if (!sid) return apiError("not_found", "This trade has no call recording.", 404);
    const audio = await fetchRecording(recordingUrlFor(sid), "mp3");
    if (!audio.ok || !audio.body) return apiError("upstream_error", "Couldn't load the recording from Twilio.", 502);
    return new Response(audio.body, { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" } });
  });
}
