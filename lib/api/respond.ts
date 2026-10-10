// Typed JSON error responses: every non-2xx body is { error: { code, message, field? } }.
import { NotFoundError } from "@/lib/db/trades";
import { EditError } from "@/lib/trades/edit";
import type { ApiError, ApiErrorCode, TradeField } from "@/lib/types";

export function apiError(code: ApiErrorCode, message: string, status: number, field?: TradeField): Response {
  const body: ApiError = { error: { code, message, ...(field ? { field } : {}) } };
  return Response.json(body, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Maps thrown errors from the trade routes to typed responses. */
export async function handleErrors(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof NotFoundError) return apiError("not_found", error.message, 404);
    if (error instanceof EditError) return apiError("bad_request", error.message, 400);
    console.error(error);
    return apiError("internal", "Something went wrong saving this trade. Try again.", 500);
  }
}
