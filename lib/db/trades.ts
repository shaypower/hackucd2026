// Persistence for trades, callbacks and the append-only audit trail.
import "server-only";
import { db } from "@/lib/db/client";
import { callbackContact } from "@/lib/trades/build";
import {
  AuditEvent,
  CallbackResult,
  ExtractedTrade,
  type AuditEventType,
  type FieldDiff,
  type Check,
  type Trade,
  type TradeDetail,
  type TradeStatus,
} from "@/lib/types";
import type { Register } from "@/lib/validation/register";

// No login yet: one demo desk. Replace with the signed-in user when auth exists.
export const DESK_ACTOR = "TA desk (demo)";

export class NotFoundError extends Error {}

function fail(action: string, error: { message: string }): never {
  throw new Error(`Failed to ${action}: ${error.message}`);
}

interface TradeRow {
  id: string;
  status: TradeStatus;
  transcript: string;
  extracted: unknown;
  checks: unknown;
  created_at: string;
  channel?: "desk" | "phone";
  caller_id?: string | null;
  recording_sid?: string | null;
}

function toTrade(row: TradeRow, register: Register): Trade {
  const extracted = ExtractedTrade.parse(row.extracted);
  return {
    id: row.id,
    status: row.status,
    transcript: row.transcript,
    extracted,
    checks: row.checks as Check[],
    nominated_callback: callbackContact(extracted, register),
    created_at: row.created_at,
    channel: row.channel ?? "desk",
    caller_id: row.caller_id ?? null,
    has_recording: Boolean(row.recording_sid),
  };
}

export async function addAudit(tradeId: string, type: AuditEventType, payload: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db().from("audit_events").insert({ trade_id: tradeId, actor: DESK_ACTOR, type, payload });
  if (error) fail("write audit event", error);
}

export async function insertTrade(
  trade: Trade,
  meta: Record<string, unknown>,
  phone?: { caller_id: string | null; recording_sid: string },
): Promise<void> {
  const { error } = await db().from("trades").insert({
    id: trade.id,
    status: trade.status,
    transcript: trade.transcript,
    extracted: trade.extracted,
    checks: trade.checks,
    created_at: trade.created_at,
    ...(phone ? { channel: "phone", caller_id: phone.caller_id, recording_sid: phone.recording_sid } : {}),
  });
  if (error) fail("save trade", error);
  const failed = trade.checks.filter((c) => c.status === "fail").length;
  const warned = trade.checks.filter((c) => c.status === "warn").length;
  await addAudit(trade.id, "trade_created", {
    ...meta,
    channel: phone ? "phone" : "desk",
    ...(phone ? { caller_id: phone.caller_id } : {}),
    status: trade.status,
    checks_failed: failed,
    checks_warned: warned,
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Demo reset: removes a trade with its callbacks, calls and audit events (FKs cascade). */
export async function deleteTrade(id: string): Promise<void> {
  if (!UUID.test(id)) throw new NotFoundError(`Trade ${id} not found.`);
  const { data, error } = await db().from("trades").delete().eq("id", id).select("id");
  if (error) fail("delete trade", error);
  if (!data || data.length === 0) throw new NotFoundError(`Trade ${id} not found.`);
}

export async function getTrade(id: string, register: Register): Promise<Trade> {
  if (!UUID.test(id)) throw new NotFoundError(`Trade ${id} not found.`);
  const { data, error } = await db().from("trades").select("*").eq("id", id).maybeSingle();
  if (error) fail("load trade", error);
  if (!data) throw new NotFoundError(`Trade ${id} not found.`);
  return toTrade(data as TradeRow, register);
}

export async function updateTrade(id: string, patch: { status?: TradeStatus; extracted?: ExtractedTrade; checks?: Check[] }): Promise<void> {
  const { error } = await db().from("trades").update(patch).eq("id", id);
  if (error) fail("update trade", error);
}

export async function insertCallback(callback: CallbackResult): Promise<void> {
  const { error } = await db().from("callbacks").insert(callback);
  if (error) fail("save callback", error);
}

export async function latestCallback(tradeId: string): Promise<CallbackResult | null> {
  const { data, error } = await db()
    .from("callbacks")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("load callback", error);
  return data ? CallbackResult.parse(data) : null;
}

export async function listAudit(tradeId: string): Promise<AuditEvent[]> {
  const { data, error } = await db().from("audit_events").select("*").eq("trade_id", tradeId).order("at", { ascending: true });
  if (error) fail("load audit trail", error);
  return (data ?? []).map((e) => AuditEvent.parse(e));
}

export async function getTradeDetail(id: string, register: Register): Promise<TradeDetail> {
  const trade = await getTrade(id, register);
  const [callback, audit] = await Promise.all([latestCallback(id), listAudit(id)]);
  return { trade, callback, audit };
}

export interface TradeSummary {
  id: string;
  status: TradeStatus;
  created_at: string;
  direction: string | null;
  isin: string | null;
  account_no: string | null;
  quantity: number | null;
  blocked: boolean; // at least one failed check
  channel: "desk" | "phone";
  caller_id: string | null;
}

export async function listRecentTrades(limit = 20, channel?: "desk" | "phone"): Promise<TradeSummary[]> {
  let query = db().from("trades").select("id, status, created_at, extracted, checks, channel, caller_id");
  if (channel) query = query.eq("channel", channel);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) fail("list trades", error);
  return (data ?? []).map((r) => {
    const e = r.extracted as ExtractedTrade;
    const blocked = (r.checks as Check[]).some((c) => c.status === "fail");
    return {
      id: r.id, status: r.status, created_at: r.created_at, direction: e.direction, isin: e.isin,
      account_no: e.account_no, quantity: e.quantity, blocked, channel: r.channel ?? "desk", caller_id: r.caller_id ?? null,
    };
  });
}

export interface DeskStats {
  trades: number;
  blockedByChecks: number; // instructions that failed a check when captured
  callbackMismatches: number; // callbacks that disagreed with the original
  approved: number;
  exported: number;
}

/** Live counts from the audit trail (small demo dataset, so a single scan is fine). */
export async function getDeskStats(): Promise<DeskStats> {
  const { data, error } = await db().from("audit_events").select("trade_id, type, payload");
  if (error) fail("load stats", error);
  const rows = (data ?? []) as { trade_id: string; type: AuditEventType; payload: Record<string, unknown> }[];
  const tradesWith = (pred: (r: (typeof rows)[number]) => boolean) => new Set(rows.filter(pred).map((r) => r.trade_id)).size;
  return {
    trades: tradesWith((r) => r.type === "trade_created"),
    blockedByChecks: tradesWith((r) => r.type === "trade_created" && Number(r.payload.checks_failed ?? 0) > 0),
    callbackMismatches: rows.filter((r) => r.type === "callback_recorded" && r.payload.all_match === false).length,
    approved: tradesWith((r) => r.type === "approved"),
    exported: tradesWith((r) => r.type === "exported"),
  };
}

export async function getRecordingSid(tradeId: string): Promise<string | null> {
  if (!UUID.test(tradeId)) throw new NotFoundError(`Trade ${tradeId} not found.`);
  const { data, error } = await db().from("trades").select("recording_sid").eq("id", tradeId).maybeSingle();
  if (error) fail("load recording", error);
  if (!data) throw new NotFoundError(`Trade ${tradeId} not found.`);
  return data.recording_sid;
}

// ---------- Automated callback calls ----------

export interface CallbackCall {
  call_sid: string;
  trade_id: string;
  to_number: string;
  transcript: string;
  turns: number;
  silent_turns: number;
  outcome: "matched" | "mismatched" | "incomplete" | "no_answer" | "failed" | null;
}

export async function insertCallbackCall(call: Pick<CallbackCall, "call_sid" | "trade_id" | "to_number">): Promise<void> {
  const { error } = await db().from("callback_calls").insert(call);
  if (error) fail("save callback call", error);
}

export async function getCallbackCall(callSid: string): Promise<CallbackCall | null> {
  const { data, error } = await db().from("callback_calls").select("*").eq("call_sid", callSid).maybeSingle();
  if (error) fail("load callback call", error);
  return data as CallbackCall | null;
}

export async function updateCallbackCall(callSid: string, patch: Partial<Omit<CallbackCall, "call_sid" | "trade_id">>): Promise<void> {
  const { error } = await db().from("callback_calls").update(patch).eq("call_sid", callSid);
  if (error) fail("update callback call", error);
}

/** Saves a callback comparison and moves the trade to ready_to_approve / callback_mismatch. */
export async function saveCallbackResult(callback: CallbackResult, meta: Record<string, unknown>, contactName: string | undefined): Promise<void> {
  await insertCallback(callback);
  await updateTrade(callback.trade_id, { status: callback.all_match ? "ready_to_approve" : "callback_mismatch" });
  await addAudit(callback.trade_id, "callback_recorded", {
    ...meta,
    contact: contactName,
    all_match: callback.all_match,
    mismatched: callback.fields.filter((f) => !f.match).map((f) => f.field),
  });
}

export async function updateCallbackFields(callbackId: string, fields: FieldDiff[], allMatch: boolean): Promise<void> {
  const { error } = await db().from("callbacks").update({ fields, all_match: allMatch }).eq("id", callbackId);
  if (error) fail("update callback", error);
}
