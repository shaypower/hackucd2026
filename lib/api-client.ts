// Typed client for the TelDeal API. Pages use this; presentational components never fetch.
import {
  ApiError,
  CheckResponse,
  ExtractResponse,
  type ExtractedTrade,
  type UiError,
} from "@/lib/types";

export class ApiClientError extends Error {
  constructor(readonly error: UiError) {
    super(error.message);
  }
}

async function post<T>(path: string, body: unknown, parse: (data: unknown) => T): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError({ code: "upstream_error", message: "Can't reach the server. Check your connection and try again." });
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiError.safeParse(data);
    throw new ApiClientError(parsed.success ? parsed.data.error : { code: "internal", message: `Request failed (${response.status}).` });
  }
  return parse(data);
}

export function extractCall(transcript: string): Promise<ExtractResponse> {
  return post("/api/extract", { transcript }, (d) => ExtractResponse.parse(d));
}

export function recheckTrade(extracted: ExtractedTrade): Promise<CheckResponse> {
  return post("/api/check", { extracted }, (d) => CheckResponse.parse(d));
}
