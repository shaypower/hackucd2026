// Shared contracts between the API, the pages and the components.
// Owner: Dev A. Change only by adding optional/nullable fields, and tell the team.
import { z } from "zod";

// ---------- Trade fields ----------

export const Direction = z.enum(["subscribe", "redeem"]);
export type Direction = z.infer<typeof Direction>;

export const QuantityType = z.enum(["units", "cash"]);
export type QuantityType = z.infer<typeof QuantityType>;

export const TRADE_FIELDS = [
  "direction",
  "isin",
  "fund_name",
  "account_no",
  "account_name",
  "caller_name",
  "currency",
  "quantity",
  "quantity_type",
] as const;
export const TradeField = z.enum(TRADE_FIELDS);
export type TradeField = z.infer<typeof TradeField>;

// Where in the transcript a field value came from. `quote` is an exact substring of the transcript,
// so the UI can highlight it.
export const Evidence = z.object({
  field: TradeField,
  quote: z.string(),
});
export type Evidence = z.infer<typeof Evidence>;

// One trade as read from a call. Every field is nullable rather than optional, which keeps the schema
// usable with strict structured outputs: null means "not stated in the call".
export const ExtractedTrade = z.object({
  direction: Direction.nullable(),
  isin: z.string().nullable(),
  fund_name: z.string().nullable(),
  account_no: z.string().nullable(),
  account_name: z.string().nullable(),
  caller_name: z.string().nullable(),
  currency: z.string().nullable(), // ISO 4217, e.g. "EUR"
  quantity: z.number().nullable(),
  quantity_type: QuantityType.nullable(),
  evidence: z.array(Evidence),
});
export type ExtractedTrade = z.infer<typeof ExtractedTrade>;

// Full model output for one transcript (a call can contain several trades).
export const Extraction = z.object({
  trades: z.array(ExtractedTrade),
  unreadable_reason: z.string().nullable(),
});
export type Extraction = z.infer<typeof Extraction>;

// ---------- Checks (deterministic validation, never the model) ----------

export const CheckStatus = z.enum(["pass", "warn", "fail"]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export const CheckId = z.enum([
  "fields_complete",
  "isin_format",
  "isin_check_digit",
  "isin_in_register",
  "account_exists",
  "account_name_match",
  "caller_authorised",
  "currency_share_class",
  "quantity_unambiguous",
  "before_cutoff",
]);
export type CheckId = z.infer<typeof CheckId>;

export const Check = z.object({
  id: CheckId,
  status: CheckStatus,
  field: TradeField.nullable(), // field to flag in the UI, null for whole-trade checks
  message: z.string(),
  suggestion: z.string().nullable(), // e.g. the closest valid ISIN in the register
});
export type Check = z.infer<typeof Check>;

// ---------- Register ----------

export const Contact = z.object({
  name: z.string(),
  phone: z.string(), // as on the register
  account_no: z.string(),
  dialled_phone: z.string().optional(), // demo only: where automated callbacks actually go (masked)
});
export type Contact = z.infer<typeof Contact>;

// ---------- Trade lifecycle ----------

export const TradeStatus = z.enum([
  "needs_review", // at least one check is warn/fail
  "awaiting_callback", // checks pass, callback not done yet
  "callback_mismatch", // callback disagrees with the original
  "ready_to_approve", // callback matches
  "approved",
  "rejected",
]);
export type TradeStatus = z.infer<typeof TradeStatus>;

const Timestamp = z.iso.datetime({ offset: true });

export const Trade = z.object({
  id: z.string(),
  status: TradeStatus,
  transcript: z.string(),
  extracted: ExtractedTrade, // current values, including the agent's edits
  checks: z.array(Check),
  nominated_callback: Contact.nullable(), // from the register, never from the call
  created_at: Timestamp,
  channel: z.enum(["desk", "phone"]).optional(), // phone = call to the TelDeal line
  caller_id: z.string().nullable().optional(), // number the call came from (informational; can be spoofed)
  has_recording: z.boolean().optional(), // original call audio available at /api/trades/[id]/recording
});
export type Trade = z.infer<typeof Trade>;

const FieldValue = z.union([z.string(), z.number()]).nullable();

export const FieldDiff = z.object({
  field: TradeField,
  original: FieldValue,
  callback: FieldValue,
  match: z.boolean(),
});
export type FieldDiff = z.infer<typeof FieldDiff>;

export const CallbackResult = z.object({
  id: z.string(),
  trade_id: z.string(),
  transcript: z.string(),
  extracted: ExtractedTrade,
  fields: z.array(FieldDiff),
  all_match: z.boolean(),
  created_at: Timestamp,
});
export type CallbackResult = z.infer<typeof CallbackResult>;

export const AuditEventType = z.enum([
  "trade_created",
  "field_edited",
  "callback_recorded",
  "callback_call", // automated callback call placed / ended
  "approved",
  "rejected",
  "exported",
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

export const AuditEvent = z.object({
  id: z.string(),
  trade_id: z.string(),
  actor: z.string(),
  type: AuditEventType,
  payload: z.record(z.string(), z.unknown()),
  at: Timestamp,
});
export type AuditEvent = z.infer<typeof AuditEvent>;

// ---------- Billing ----------

export const SubscriptionStatus = z.enum(["inactive", "active", "past_due", "canceled"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const Subscription = z.object({
  desk_id: z.string(),
  status: SubscriptionStatus,
  current_period_end: Timestamp.nullable(),
});
export type Subscription = z.infer<typeof Subscription>;

// ---------- API ----------

export const CreateTradeRequest = z.object({
  transcript: z.string().trim().min(1).max(20_000),
});
export type CreateTradeRequest = z.infer<typeof CreateTradeRequest>;

export const EditFieldRequest = z.object({
  field: TradeField,
  value: z.string(), // the API parses numbers/enums per field
});
export type EditFieldRequest = z.infer<typeof EditFieldRequest>;

export const CallbackRequest = CreateTradeRequest;
export type CallbackRequest = CreateTradeRequest;

export const RegisterSource = z.enum(["database", "demo"]);
export type RegisterSource = z.infer<typeof RegisterSource>;

// POST /api/extract (stateless: trades are checked but not saved yet)
export const ExtractRequest = CreateTradeRequest;
export type ExtractRequest = CreateTradeRequest;

export const ExtractResponse = z.object({
  trades: z.array(Trade),
  unreadable_reason: z.string().nullable(),
  register_source: RegisterSource,
  model: z.string(),
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

// POST /api/transcribe (multipart "audio") -> transcript text
export const TranscribeResponse = z.object({ transcript: z.string(), model: z.string() });
export type TranscribeResponse = z.infer<typeof TranscribeResponse>;

// GET /api/trades/[id]
export const TradeDetail = z.object({
  trade: Trade,
  callback: CallbackResult.nullable(),
  audit: z.array(AuditEvent),
});
export type TradeDetail = z.infer<typeof TradeDetail>;

export const ApiErrorCode = z.enum([
  "bad_request",
  "not_found",
  "unreadable_transcript",
  "extraction_failed",
  "checks_failed",
  "callback_mismatch",
  "subscription_required",
  "conflict", // action not allowed in the trade's current state
  "upstream_error",
  "internal",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

// Every non-2xx response body: { error: { code, message, field? } }
export const ApiError = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    field: TradeField.nullable().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
export type UiError = ApiError["error"];
