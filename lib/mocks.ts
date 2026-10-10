// Mock data for building and testing components without the backend (see /dev/gallery).
// Funds use real public ISINs; accounts, people and phone numbers are fictional.
// Every evidence quote is an exact substring of its transcript (checked in mocks.test.ts).
import type { SampleTranscript } from "@/components/trade/types";
import type {
  AuditEvent,
  CallbackResult,
  Contact,
  ExtractedTrade,
  FieldDiff,
  Subscription,
  Trade,
  UiError,
} from "@/lib/types";
import { TRADE_FIELDS } from "@/lib/types";

// ---------- Transcripts ----------

export const transcriptClean = `Agent: Dealing desk, Aoife speaking.
Caller: Hi Aoife, it's Mark Doyle from Harbourview Pension Trustees, account number 40012.
Agent: Thanks Mark, what would you like to do today?
Caller: I'd like to subscribe for 5,000 units in the iShares Core MSCI World, ISIN IE00B4L5Y983, in the US dollar share class.
Agent: So that's a subscription of 5,000 units in IE00B4L5Y983, USD, for account 40012. Correct?
Caller: Correct.`;

export const transcriptAmbiguous = `Agent: Dealing desk, Aoife speaking.
Caller: Hello, Sinead Walsh here for Northwall Charitable Fund, account 40027.
Caller: I want to redeem five thousand from the Vanguard FTSE All-World, that's I-E zero zero B-K five B-Q-T eight zero.
Caller: Pay it out in euro please.
Agent: Noted, I'll get that processed.`;

export const transcriptFraud = `Agent: Dealing desk, Aoife speaking.
Caller: Hi, this is John Kelly calling about account 40012, Harbourview Pension Trustees.
Caller: Please subscribe 250,000 euro into IE00B4L5Y984 today, it's urgent.
Agent: Can I take a number to call you back on?
Caller: Just use this number, I'm travelling.`;

export const transcriptShay = `Agent: Good afternoon, dealing desk, Aoife speaking.
Caller: Hi Aoife, it's Shay Power, calling about the University of Limerick Investment Group account, account number 40058.
Agent: Thanks Shay, what can I do for you?
Caller: I'd like to subscribe for 2,500 units in the Vanguard S&P 500, ISIN IE00B3XXRP09, US dollar share class please.
Agent: So that's a subscription of 2,500 units in IE00B3XXRP09, US dollars, for account 40058. Correct?
Caller: That's correct, thanks.`;

export const callbackTranscriptHersh = `Agent: Hi Hersh, it's the dealing desk calling back to confirm an instruction on account 40058.
Caller: Go ahead.
Agent: Can you tell me the instruction you placed today?
Caller: Yes, Hersh Singh speaking. Subscribe 2,500 units of IE00B3XXRP09, the Vanguard S&P 500, US dollar share class, for University of Limerick Investment Group, account 40058.`;

export const transcriptUnreadable = `Agent: Dealing desk...
Caller: [inaudible] ...account... [line breaks up] ...the usual...
Agent: Sorry, you're breaking up.`;

export const callbackTranscriptMatch = `Agent: Hi Mark, it's the dealing desk calling back to confirm an instruction on account 40012.
Caller: Go ahead.
Agent: Can you confirm the trade for me?
Caller: Yes, Mark Doyle speaking. Subscribe 5,000 units of IE00B4L5Y983, the iShares Core MSCI World, US dollar class, for Harbourview Pension Trustees.`;

export const callbackTranscriptMismatch = `Agent: Hi Mark, it's the dealing desk calling back to confirm an instruction on account 40012.
Caller: Go ahead.
Agent: Can you confirm the trade for me?
Caller: Yes, Mark Doyle speaking. Subscribe 500 units of IE00B4L5Y983, the iShares Core MSCI World, US dollar class, for Harbourview Pension Trustees.`;

export const mockSamples: SampleTranscript[] = [
  { id: "clean", label: "Clean subscription", transcript: transcriptClean },
  { id: "shay", label: "Shay Power (UL Investment Group)", transcript: transcriptShay },
  { id: "ambiguous", label: "Spoken ISIN, no units", transcript: transcriptAmbiguous },
  { id: "fraud", label: "Unauthorised caller, wrong ISIN", transcript: transcriptFraud },
  { id: "unreadable", label: "Unreadable call", transcript: transcriptUnreadable },
];

export const mockCallbackSamples: SampleTranscript[] = [
  { id: "cb-match", label: "Callback confirms", transcript: callbackTranscriptMatch },
  { id: "cb-mismatch", label: "Callback says 500 units", transcript: callbackTranscriptMismatch },
];

// ---------- Register ----------

export const mockContact: Contact = {
  name: "Mark Doyle",
  phone: "+353 1 555 0142",
  account_no: "40012",
};

// ---------- Extracted trades ----------

const extractedClean: ExtractedTrade = {
  direction: "subscribe",
  isin: "IE00B4L5Y983",
  fund_name: "iShares Core MSCI World",
  account_no: "40012",
  account_name: "Harbourview Pension Trustees",
  caller_name: "Mark Doyle",
  currency: "USD",
  quantity: 5000,
  quantity_type: "units",
  evidence: [
    { field: "direction", quote: "I'd like to subscribe" },
    { field: "isin", quote: "IE00B4L5Y983" },
    { field: "fund_name", quote: "iShares Core MSCI World" },
    { field: "account_no", quote: "account number 40012" },
    { field: "account_name", quote: "Harbourview Pension Trustees" },
    { field: "caller_name", quote: "Mark Doyle" },
    { field: "currency", quote: "US dollar share class" },
    { field: "quantity", quote: "5,000 units" },
    { field: "quantity_type", quote: "5,000 units" },
  ],
};

const extractedAmbiguous: ExtractedTrade = {
  direction: "redeem",
  isin: "IE00BK5BQT80",
  fund_name: "Vanguard FTSE All-World",
  account_no: "40027",
  account_name: "Northwall Charitable Fund",
  caller_name: "Sinead Walsh",
  currency: "EUR",
  quantity: 5000,
  quantity_type: null,
  evidence: [
    { field: "direction", quote: "I want to redeem" },
    { field: "isin", quote: "I-E zero zero B-K five B-Q-T eight zero" },
    { field: "fund_name", quote: "Vanguard FTSE All-World" },
    { field: "account_no", quote: "account 40027" },
    { field: "account_name", quote: "Northwall Charitable Fund" },
    { field: "caller_name", quote: "Sinead Walsh" },
    { field: "currency", quote: "in euro" },
    { field: "quantity", quote: "five thousand" },
  ],
};

const extractedFraud: ExtractedTrade = {
  direction: "subscribe",
  isin: "IE00B4L5Y984",
  fund_name: null,
  account_no: "40012",
  account_name: "Harbourview Pension Trustees",
  caller_name: "John Kelly",
  currency: "EUR",
  quantity: 250000,
  quantity_type: "cash",
  evidence: [
    { field: "direction", quote: "Please subscribe" },
    { field: "isin", quote: "IE00B4L5Y984" },
    { field: "account_no", quote: "account 40012" },
    { field: "account_name", quote: "Harbourview Pension Trustees" },
    { field: "caller_name", quote: "John Kelly" },
    { field: "currency", quote: "250,000 euro" },
    { field: "quantity", quote: "250,000 euro" },
    { field: "quantity_type", quote: "250,000 euro" },
  ],
};

// ---------- Trades ----------

export const mockTradeClean: Trade = {
  id: "trd_0001",
  status: "awaiting_callback",
  transcript: transcriptClean,
  extracted: extractedClean,
  checks: [
    { id: "fields_complete", status: "pass", field: null, message: "All required fields found.", suggestion: null },
    { id: "isin_format", status: "pass", field: "isin", message: "ISIN format is valid.", suggestion: null },
    { id: "isin_check_digit", status: "pass", field: "isin", message: "Check digit is correct.", suggestion: null },
    { id: "isin_in_register", status: "pass", field: "isin", message: "iShares Core MSCI World UCITS ETF (Acc) is in the fund register.", suggestion: null },
    { id: "account_exists", status: "pass", field: "account_no", message: "Account 40012 exists.", suggestion: null },
    { id: "account_name_match", status: "pass", field: "account_name", message: "Account name matches the register.", suggestion: null },
    { id: "caller_authorised", status: "pass", field: "caller_name", message: "Mark Doyle is an authorised signatory on account 40012.", suggestion: null },
    { id: "currency_share_class", status: "pass", field: "currency", message: "USD share class exists for this fund.", suggestion: null },
    { id: "quantity_unambiguous", status: "pass", field: "quantity", message: "5,000 units.", suggestion: null },
    { id: "before_cutoff", status: "pass", field: null, message: "Before today's 17:30 dealing cut-off.", suggestion: null },
  ],
  nominated_callback: mockContact,
  created_at: "2026-10-10T10:02:11.000Z",
};

export const mockTradeWarnings: Trade = {
  id: "trd_0002",
  status: "needs_review",
  transcript: transcriptAmbiguous,
  extracted: extractedAmbiguous,
  checks: [
    { id: "fields_complete", status: "warn", field: "quantity_type", message: "Units or cash amount not stated.", suggestion: null },
    { id: "isin_format", status: "pass", field: "isin", message: "ISIN format is valid.", suggestion: null },
    { id: "isin_check_digit", status: "pass", field: "isin", message: "Check digit is correct.", suggestion: null },
    { id: "isin_in_register", status: "pass", field: "isin", message: "Vanguard FTSE All-World UCITS ETF (Acc) is in the fund register.", suggestion: null },
    { id: "account_exists", status: "pass", field: "account_no", message: "Account 40027 exists.", suggestion: null },
    { id: "account_name_match", status: "pass", field: "account_name", message: "Account name matches the register.", suggestion: null },
    { id: "caller_authorised", status: "pass", field: "caller_name", message: "Sinead Walsh is an authorised signatory on account 40027.", suggestion: null },
    { id: "currency_share_class", status: "warn", field: "currency", message: "This fund has a USD share class only; the caller asked for EUR.", suggestion: "USD" },
    { id: "quantity_unambiguous", status: "warn", field: "quantity", message: "\"Five thousand\": 5,000 units or €5,000?", suggestion: null },
    { id: "before_cutoff", status: "pass", field: null, message: "Before today's 17:30 dealing cut-off.", suggestion: null },
  ],
  nominated_callback: { name: "Sinead Walsh", phone: "+353 1 555 0177", account_no: "40027" },
  created_at: "2026-10-10T10:14:40.000Z",
};

export const mockTradeFailures: Trade = {
  id: "trd_0003",
  status: "needs_review",
  transcript: transcriptFraud,
  extracted: extractedFraud,
  checks: [
    { id: "fields_complete", status: "pass", field: null, message: "All required fields found.", suggestion: null },
    { id: "isin_format", status: "pass", field: "isin", message: "ISIN format is valid.", suggestion: null },
    { id: "isin_check_digit", status: "fail", field: "isin", message: "Check digit is wrong: IE00B4L5Y984 is not a valid ISIN.", suggestion: "IE00B4L5Y983" },
    { id: "isin_in_register", status: "fail", field: "isin", message: "ISIN not found in the fund register. Did you mean IE00B4L5Y983 (iShares Core MSCI World)?", suggestion: "IE00B4L5Y983" },
    { id: "account_exists", status: "pass", field: "account_no", message: "Account 40012 exists.", suggestion: null },
    { id: "account_name_match", status: "pass", field: "account_name", message: "Account name matches the register.", suggestion: null },
    { id: "caller_authorised", status: "fail", field: "caller_name", message: "John Kelly is not an authorised signatory on account 40012.", suggestion: null },
    { id: "quantity_unambiguous", status: "pass", field: "quantity", message: "€250,000 cash.", suggestion: null },
    { id: "before_cutoff", status: "pass", field: null, message: "Before today's 17:30 dealing cut-off.", suggestion: null },
  ],
  nominated_callback: mockContact,
  created_at: "2026-10-10T10:31:05.000Z",
};

// ---------- Callbacks ----------

function diff(original: ExtractedTrade, callback: ExtractedTrade): FieldDiff[] {
  return TRADE_FIELDS.map((field) => ({
    field,
    original: original[field],
    callback: callback[field],
    match: original[field] === callback[field],
  }));
}

const extractedCallbackMatch: ExtractedTrade = {
  ...extractedClean,
  evidence: [
    { field: "direction", quote: "Subscribe" },
    { field: "isin", quote: "IE00B4L5Y983" },
    { field: "fund_name", quote: "iShares Core MSCI World" },
    { field: "account_no", quote: "account 40012" },
    { field: "account_name", quote: "Harbourview Pension Trustees" },
    { field: "caller_name", quote: "Mark Doyle" },
    { field: "currency", quote: "US dollar class" },
    { field: "quantity", quote: "5,000 units" },
    { field: "quantity_type", quote: "5,000 units" },
  ],
};

const extractedCallbackMismatch: ExtractedTrade = {
  ...extractedCallbackMatch,
  quantity: 500,
  evidence: extractedCallbackMatch.evidence.map((e) =>
    e.field === "quantity" || e.field === "quantity_type" ? { ...e, quote: "500 units" } : e,
  ),
};

export const mockCallbackMatch: CallbackResult = {
  id: "cbk_0001",
  trade_id: mockTradeClean.id,
  transcript: callbackTranscriptMatch,
  extracted: extractedCallbackMatch,
  fields: diff(extractedClean, extractedCallbackMatch),
  all_match: true,
  created_at: "2026-10-10T10:09:30.000Z",
};

export const mockCallbackMismatch: CallbackResult = {
  id: "cbk_0002",
  trade_id: mockTradeClean.id,
  transcript: callbackTranscriptMismatch,
  extracted: extractedCallbackMismatch,
  fields: diff(extractedClean, extractedCallbackMismatch),
  all_match: false,
  created_at: "2026-10-10T10:09:30.000Z",
};

// ---------- Audit trail ----------

export const mockAuditEvents: AuditEvent[] = [
  { id: "evt_01", trade_id: "trd_0001", actor: "Aoife (TA desk)", type: "trade_created", payload: { checks_failed: 0, checks_warned: 0 }, at: "2026-10-10T10:02:11.000Z" },
  { id: "evt_02", trade_id: "trd_0001", actor: "Aoife (TA desk)", type: "field_edited", payload: { field: "account_name", from: "Harbourview Pensions", to: "Harbourview Pension Trustees" }, at: "2026-10-10T10:03:02.000Z" },
  { id: "evt_03", trade_id: "trd_0001", actor: "Aoife (TA desk)", type: "callback_recorded", payload: { contact: "Mark Doyle", all_match: true }, at: "2026-10-10T10:09:30.000Z" },
  { id: "evt_04", trade_id: "trd_0001", actor: "Aoife (TA desk)", type: "approved", payload: {}, at: "2026-10-10T10:10:02.000Z" },
  { id: "evt_05", trade_id: "trd_0001", actor: "Aoife (TA desk)", type: "exported", payload: { file: "trd_0001.xlsx" }, at: "2026-10-10T10:10:05.000Z" },
];

// ---------- Billing ----------

export const mockSubscriptionInactive: Subscription = {
  desk_id: "desk_demo",
  status: "inactive",
  current_period_end: null,
};

export const mockSubscriptionActive: Subscription = {
  desk_id: "desk_demo",
  status: "active",
  current_period_end: "2026-11-10T10:00:00.000Z",
};

// ---------- Errors ----------

export const mockErrorUnreadable: UiError = {
  code: "unreadable_transcript",
  message: "Couldn't find a trade in this transcript. Enter the details manually or try again.",
  field: null,
};

export const mockErrorUpstream: UiError = {
  code: "upstream_error",
  message: "The extraction service didn't respond. Your transcript is saved; try again in a moment.",
  field: null,
};

export const mockErrorSubscription: UiError = {
  code: "subscription_required",
  message: "An active desk subscription is needed to approve and export trades.",
  field: null,
};
