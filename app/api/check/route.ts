// POST /api/check { extracted } -> CheckResponse
// Re-runs the deterministic checks after the agent corrects a field. No AI involved.
import { apiError, readJson } from "@/lib/api/respond";
import { getRegister } from "@/lib/db/get-register";
import { callbackContact } from "@/lib/trades/build";
import { CheckRequest, type CheckResponse } from "@/lib/types";
import { runChecks, statusFromChecks } from "@/lib/validation/checks";

export async function POST(request: Request) {
  const body = CheckRequest.safeParse(await readJson(request));
  if (!body.success) {
    return apiError("bad_request", "Invalid trade fields.", 400);
  }
  const { register, source } = await getRegister();
  const checks = runChecks(body.data.extracted, register);
  const response: CheckResponse = {
    checks,
    status: statusFromChecks(checks),
    nominated_callback: callbackContact(body.data.extracted, register),
    register_source: source,
  };
  return Response.json(response);
}
