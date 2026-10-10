// Persistence for trades, callbacks and the append-only audit trail.
import "server-only";
import { db } from "@/lib/db/client";
import { callbackContact } from "@/lib/trades/build";
import {
  AuditEvent,
  CallbackResult,
  ExtractedTrade,
  type AuditEventType,
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
  };
}

export async function addAudit(tradeId: string, type: AuditEventType, payload: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db().from("audit_events").insert({ trade_id: tradeId, actor: DESK_ACTOR, type, payload });
  if (error) fail("write audit event", error);
}

export async function insertTrade(trade: Trade, meta: Record<string, unknown>): Promise<void> {
  const { error } = await db().from("trades").insert({
    id: trade.id,
    status: trade.status,
    transcript: trade.transcript,
    extracted: trade.extracted,
    checks: trade.checks,
    created_at: trade.created_at,
  });
  if (error) fail("save trade", error);
  const failed = trade.checks.filter((c) => c.status === "fail").length;
  const warned = trade.checks.filter((c) => c.status === "warn").length;
  await addAudit(trade.id, "trade_created", { ...meta, status: trade.status, checks_failed: failed, checks_warned: warned });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
}

export async function listRecentTrades(limit = 20): Promise<TradeSummary[]> {
  const { data, error } = await db()
    .from("trades")
    .select("id, status, created_at, extracted")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("list trades", error);
  return (data ?? []).map((r) => {
    const e = r.extracted as ExtractedTrade;
    return { id: r.id, status: r.status, created_at: r.created_at, direction: e.direction, isin: e.isin, account_no: e.account_no, quantity: e.quantity };
  });
}
