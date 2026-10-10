// Typed client for the TelDeal API. Pages use this; presentational components never fetch.
import {
  ApiError,
  ExtractResponse,
  TradeDetail,
  type TradeField,
  TranscribeResponse,
  type UiError,
} from "@/lib/types";

export class ApiClientError extends Error {
  constructor(readonly error: UiError) {
    super(error.message);
  }
}

async function send<T>(method: string, path: string, body: unknown, parse: (data: unknown) => T): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
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
  return send("POST", "/api/extract", { transcript }, (d) => ExtractResponse.parse(d));
}



export async function transcribeAudio(wav: Blob): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("audio", wav, "call.wav");
  let response: Response;
  try {
    response = await fetch("/api/transcribe", { method: "POST", body: form });
  } catch {
    throw new ApiClientError({ code: "upstream_error", message: "Can't reach the server. Check your connection and try again." });
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiError.safeParse(data);
    throw new ApiClientError(parsed.success ? parsed.data.error : { code: "internal", message: `Upload failed (${response.status}).` });
  }
  return TranscribeResponse.parse(data);
}

const detail = (d: unknown) => TradeDetail.parse(d);

export function getTradeDetail(id: string): Promise<TradeDetail> {
  return send("GET", `/api/trades/${id}`, undefined, detail);
}

export function editTradeField(id: string, field: TradeField, value: string): Promise<TradeDetail> {
  return send("PATCH", `/api/trades/${id}`, { field, value }, detail);
}

export function recordCallback(id: string, transcript: string): Promise<TradeDetail> {
  return send("POST", `/api/trades/${id}/callback`, { transcript }, detail);
}

export function approveTrade(id: string): Promise<TradeDetail> {
  return send("POST", `/api/trades/${id}/approve`, undefined, detail);
}

/** Demo reset: deletes the trade and its audit trail. */
export async function deleteTrade(id: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/trades/${id}`, { method: "DELETE" });
  } catch {
    throw new ApiClientError({ code: "upstream_error", message: "Can't reach the server. Check your connection and try again." });
  }
  if (!response.ok) {
    const parsed = ApiError.safeParse(await response.json().catch(() => null));
    throw new ApiClientError(parsed.success ? parsed.data.error : { code: "internal", message: `Delete failed (${response.status}).` });
  }
}

export function acceptCallbackField(id: string, field: TradeField): Promise<TradeDetail> {
  return send("PATCH", `/api/trades/${id}/callback`, { field }, detail);
}

export interface PlacedCall {
  call_sid: string;
  to: string; // masked
  redirected: boolean; // demo: sent to DEMO_CALLBACK_NUMBER
}

export function callContactNow(id: string): Promise<PlacedCall> {
  return send("POST", `/api/trades/${id}/call`, undefined, (d) => d as PlacedCall);
}

export const exportUrl = (id: string) => `/api/trades/${id}/export`;
