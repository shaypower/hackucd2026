// GET /api/trades?channel=phone&limit=5 -> recent trade summaries (the desk polls this for incoming calls)
import { handleErrors } from "@/lib/api/respond";
import { listRecentTrades } from "@/lib/db/trades";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  return handleErrors(async () =>
    Response.json(await listRecentTrades(limit, channel === "phone" || channel === "desk" ? channel : undefined)),
  );
}
