// Deterministic checks on an extracted trade. The model only proposes values; these decide.
import type { Check, CheckId, CheckStatus, ExtractedTrade, TradeField, TradeStatus } from "@/lib/types";
import { closestIsin, hasValidCheckDigit, isValidIsinFormat, normalizeIsin } from "@/lib/validation/isin";
import {
  findAccount,
  findAuthorisedCaller,
  findFund,
  normalizeName,
  type Register,
} from "@/lib/validation/register";

const REQUIRED: TradeField[] = ["direction", "isin", "account_no", "caller_name", "quantity"];
const RECOMMENDED: TradeField[] = ["quantity_type", "currency", "account_name"];

function check(
  id: CheckId,
  status: CheckStatus,
  field: TradeField | null,
  message: string,
  suggestion: string | null = null,
): Check {
  return { id, status, field, message, suggestion };
}

function dublinTime(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function formatQuantity(trade: ExtractedTrade): string {
  const n = trade.quantity ?? 0;
  if (trade.quantity_type === "cash" && trade.currency) {
    return `${new Intl.NumberFormat("en-IE", { style: "currency", currency: trade.currency, maximumFractionDigits: 2 }).format(n)} cash`;
  }
  const amount = new Intl.NumberFormat("en-IE").format(n);
  return trade.quantity_type === "units" ? `${amount} units` : amount;
}

/** Words treated as the same if equal or one is a prefix of the other ("pension" / "pensions"). */
function sameWord(a: string, b: string): boolean {
  return a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
}

/** Share of the shorter name's words that appear in the other name (0..1). */
function nameOverlap(a: string, b: string): number {
  const ta = [...new Set(normalizeName(a).split(" "))];
  const tb = [...new Set(normalizeName(b).split(" "))];
  const shared = ta.filter((t) => tb.some((u) => sameWord(t, u))).length;
  return shared / Math.min(ta.length, tb.length);
}

export function runChecks(trade: ExtractedTrade, register: Register, now: Date = new Date()): Check[] {
  const checks: Check[] = [];

  // Completeness
  const missing = REQUIRED.filter((f) => trade[f] === null || trade[f] === "");
  const missingRecommended = RECOMMENDED.filter((f) => trade[f] === null || trade[f] === "");
  if (missing.length > 0) {
    checks.push(check("fields_complete", "fail", missing[0], `Missing: ${missing.join(", ")}.`));
  } else if (missingRecommended.includes("quantity_type")) {
    checks.push(check("fields_complete", "warn", "quantity_type", "Units or cash amount not stated."));
  } else if (missingRecommended.length > 0) {
    checks.push(check("fields_complete", "warn", missingRecommended[0], `Not stated: ${missingRecommended.join(", ")}.`));
  } else {
    checks.push(check("fields_complete", "pass", null, "All required fields found."));
  }

  // ISIN
  const knownIsins = register.funds.map((f) => f.isin);
  const isin = trade.isin ? normalizeIsin(trade.isin) : null;
  const fund = isin ? findFund(register, isin) : undefined;
  if (!isin) {
    checks.push(check("isin_format", "fail", "isin", "No ISIN given."));
  } else if (!isValidIsinFormat(isin)) {
    checks.push(
      check("isin_format", "fail", "isin", `"${trade.isin}" is not a valid ISIN format (2 letters, 9 characters, 1 digit).`, closestIsin(isin, knownIsins)),
    );
  } else {
    checks.push(check("isin_format", "pass", "isin", "ISIN format is valid."));
    if (hasValidCheckDigit(isin)) {
      checks.push(check("isin_check_digit", "pass", "isin", "Check digit is correct."));
    } else {
      checks.push(
        check("isin_check_digit", "fail", "isin", `Check digit is wrong: ${isin} is not a valid ISIN.`, closestIsin(isin, knownIsins)),
      );
    }
    if (fund) {
      checks.push(check("isin_in_register", "pass", "isin", `${fund.name} is in the fund register.`));
    } else {
      const suggestion = closestIsin(isin, knownIsins);
      const suggestedFund = suggestion ? findFund(register, suggestion) : undefined;
      checks.push(
        check(
          "isin_in_register",
          "fail",
          "isin",
          suggestedFund
            ? `ISIN not found in the fund register. Did you mean ${suggestion} (${suggestedFund.name})?`
            : "ISIN not found in the fund register.",
          suggestion,
        ),
      );
    }
  }

  // Account and caller
  const account = trade.account_no ? findAccount(register, trade.account_no) : undefined;
  if (!trade.account_no) {
    checks.push(check("account_exists", "fail", "account_no", "No account number given."));
  } else if (!account) {
    checks.push(check("account_exists", "fail", "account_no", `Account ${trade.account_no} is not in the register.`));
  } else {
    checks.push(check("account_exists", "pass", "account_no", `Account ${account.account_no} exists.`));

    if (!trade.account_name) {
      checks.push(check("account_name_match", "warn", "account_name", "Account name not stated; confirm it on the callback.", account.account_name));
    } else if (normalizeName(trade.account_name) === normalizeName(account.account_name)) {
      checks.push(check("account_name_match", "pass", "account_name", "Account name matches the register."));
    } else if (nameOverlap(trade.account_name, account.account_name) >= 0.5) {
      checks.push(
        check("account_name_match", "warn", "account_name", `Close to the register name "${account.account_name}".`, account.account_name),
      );
    } else {
      checks.push(
        check("account_name_match", "fail", "account_name", `"${trade.account_name}" does not match account ${account.account_no} ("${account.account_name}").`),
      );
    }

    if (!trade.caller_name) {
      checks.push(check("caller_authorised", "fail", "caller_name", "Caller not identified."));
    } else if (findAuthorisedCaller(register, account.account_no, trade.caller_name)) {
      checks.push(
        check("caller_authorised", "pass", "caller_name", `${trade.caller_name} is an authorised signatory on account ${account.account_no}.`),
      );
    } else {
      checks.push(
        check("caller_authorised", "fail", "caller_name", `${trade.caller_name} is not an authorised signatory on account ${account.account_no}.`),
      );
    }
  }

  // Currency vs share classes
  if (fund) {
    const classes = fund.share_class_currencies;
    const currency = trade.currency?.toUpperCase() ?? null;
    if (!currency) {
      checks.push(check("currency_share_class", "warn", "currency", `Currency not stated; this fund has ${classes.join("/")} share classes.`, classes[0]));
    } else if (classes.includes(currency)) {
      checks.push(check("currency_share_class", "pass", "currency", `${currency} share class exists for this fund.`));
    } else {
      const only = classes.length === 1 ? `a ${classes[0]} share class only` : `${classes.join("/")} share classes`;
      checks.push(check("currency_share_class", "warn", "currency", `This fund has ${only}; the caller asked for ${currency}.`, classes[0]));
    }
  }

  // Quantity
  if (trade.quantity !== null) {
    if (trade.quantity <= 0) {
      checks.push(check("quantity_unambiguous", "fail", "quantity", "Quantity must be greater than zero."));
    } else if (!trade.quantity_type) {
      const n = new Intl.NumberFormat("en-IE").format(trade.quantity);
      const money = trade.currency ? ` or ${new Intl.NumberFormat("en-IE", { style: "currency", currency: trade.currency.toUpperCase(), maximumFractionDigits: 0 }).format(trade.quantity)}` : " or a cash amount";
      checks.push(check("quantity_unambiguous", "warn", "quantity", `${n}: ${n} units${money}?`));
    } else {
      checks.push(check("quantity_unambiguous", "pass", "quantity", `${formatQuantity(trade)}.`));
    }
  }

  // Dealing cut-off (late trades are dealt next dealing day, so warn rather than fail)
  if (fund) {
    const time = dublinTime(now);
    if (time < fund.cutoff_time) {
      checks.push(check("before_cutoff", "pass", null, `Before today's ${fund.cutoff_time} dealing cut-off.`));
    } else {
      checks.push(check("before_cutoff", "warn", null, `After today's ${fund.cutoff_time} cut-off (now ${time}); deals at the next dealing point.`));
    }
  }

  return checks;
}

export function canProceed(checks: Check[]): boolean {
  return checks.every((c) => c.status !== "fail");
}

export function statusFromChecks(checks: Check[]): TradeStatus {
  return checks.every((c) => c.status === "pass") ? "awaiting_callback" : "needs_review";
}
