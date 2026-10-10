// Typed JSON error responses: every non-2xx body is { error: { code, message, field? } }.
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
