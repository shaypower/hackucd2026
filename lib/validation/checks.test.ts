import { describe, expect, it } from "vitest";
import { mockTradeClean, mockTradeFailures, mockTradeWarnings } from "@/lib/mocks";
import type { Check, CheckId, ExtractedTrade } from "@/lib/types";
import { canProceed, runChecks, statusFromChecks } from "@/lib/validation/checks";
import { demoRegister } from "@/lib/validation/demo-register";
import { nominatedContact } from "@/lib/validation/register";

// 10:00 in Dublin (IST, UTC+1) on a weekday, before the 17:30 cut-off.
const MORNING = new Date("2026-10-07T09:00:00Z");
const AFTERNOON = new Date("2026-10-07T17:00:00Z"); // 18:00 Dublin, after the 17:30 cut-off

const clean = mockTradeClean.extracted;

function byId(checks: Check[], id: CheckId): Check | undefined {
  return checks.find((c) => c.id === id);
}

function run(overrides: Partial<ExtractedTrade>, now = MORNING): Check[] {
  return runChecks({ ...clean, ...overrides }, demoRegister, now);
}

describe("ordinary input", () => {
  it("a clean trade passes every check and can go to callback", () => {
    const checks = run({});
    expect(checks.filter((c) => c.status !== "pass")).toEqual([]);
    expect(canProceed(checks)).toBe(true);
    expect(statusFromChecks(checks)).toBe("awaiting_callback");
  });

  it("accepts a spaced, lowercase ISIN", () => {
    expect(byId(run({ isin: "ie00 b4l5 y983" }), "isin_in_register")?.status).toBe("pass");
  });

  it("matches account names that differ only in spacing (speech-to-text)", () => {
    const checks = runChecks(
      { ...clean, account_no: "40031", account_name: "Oak Park Family Office", caller_name: "Peter Quinn" },
      demoRegister,
      MORNING,
    );
    expect(byId(checks, "account_name_match")?.status).toBe("pass");
  });

  it("matches account and caller names regardless of case and punctuation", () => {
    const checks = run({ account_name: "harbourview pension trustees.", caller_name: "MARK DOYLE" });
    expect(byId(checks, "account_name_match")?.status).toBe("pass");
    expect(byId(checks, "caller_authorised")?.status).toBe("pass");
  });
});

describe("boundary input", () => {
  it("warns when units vs cash is not stated", () => {
    const checks = run({ quantity_type: null });
    expect(byId(checks, "quantity_unambiguous")?.status).toBe("warn");
    expect(byId(checks, "fields_complete")).toMatchObject({ status: "warn", field: "quantity_type" });
    expect(canProceed(checks)).toBe(true);
    expect(statusFromChecks(checks)).toBe("needs_review");
  });

  it("warns and suggests a share class when the currency doesn't exist for the fund", () => {
    expect(byId(run({ currency: "GBP" }), "currency_share_class")).toMatchObject({ status: "warn", suggestion: "USD" });
  });

  it("warns when the currency is missing", () => {
    expect(byId(run({ currency: null }), "currency_share_class")?.status).toBe("warn");
  });

  it("warns on a near-miss account name and suggests the register name", () => {
    expect(byId(run({ account_name: "Harbourview Pensions" }), "account_name_match")).toMatchObject({
      status: "warn",
      suggestion: "Harbourview Pension Trustees",
    });
  });

  it("warns after the dealing cut-off", () => {
    expect(byId(run({}, AFTERNOON), "before_cutoff")?.status).toBe("warn");
  });

  it("shows cash amounts with the currency", () => {
    expect(byId(run({ quantity: 250000, quantity_type: "cash", currency: "EUR" }), "quantity_unambiguous")?.message).toContain("€250,000");
  });
});

describe("failure input", () => {
  it("fails a wrong check digit and suggests the nearest register ISIN", () => {
    const checks = run({ isin: "IE00B4L5Y984" });
    expect(byId(checks, "isin_check_digit")).toMatchObject({ status: "fail", suggestion: "IE00B4L5Y983" });
    expect(byId(checks, "isin_in_register")).toMatchObject({ status: "fail", suggestion: "IE00B4L5Y983" });
    expect(canProceed(checks)).toBe(false);
  });

  it("fails a malformed ISIN", () => {
    expect(byId(run({ isin: "IE00B4L5" }), "isin_format")?.status).toBe("fail");
  });

  it("fails a valid ISIN that isn't in the register", () => {
    const checks = run({ isin: "US0378331005" });
    expect(byId(checks, "isin_check_digit")?.status).toBe("pass");
    expect(byId(checks, "isin_in_register")).toMatchObject({ status: "fail", suggestion: null });
  });

  it("fails an unknown account", () => {
    expect(byId(run({ account_no: "99999" }), "account_exists")?.status).toBe("fail");
  });

  it("fails an account name that belongs to a different client", () => {
    expect(byId(run({ account_name: "Oakpark Family Office" }), "account_name_match")?.status).toBe("fail");
  });

  it("fails a caller who is not an authorised signatory", () => {
    expect(byId(run({ caller_name: "John Kelly" }), "caller_authorised")?.status).toBe("fail");
  });

  it("fails an authorised caller instructing on someone else's account", () => {
    expect(byId(run({ account_no: "40027", account_name: "Northwall Charitable Fund" }), "caller_authorised")?.status).toBe("fail");
  });

  it("fails missing required fields and names them", () => {
    const checks = run({ isin: null, quantity: null });
    expect(byId(checks, "fields_complete")).toMatchObject({ status: "fail", message: "Missing: isin, quantity." });
    expect(byId(checks, "isin_format")?.status).toBe("fail");
  });

  it("fails a zero or negative quantity", () => {
    expect(byId(run({ quantity: 0 }), "quantity_unambiguous")?.status).toBe("fail");
  });

  it("handles an empty extraction without throwing", () => {
    const empty: ExtractedTrade = {
      direction: null, isin: null, fund_name: null, account_no: null, account_name: null,
      caller_name: null, currency: null, quantity: null, quantity_type: null, evidence: [],
    };
    const checks = runChecks(empty, demoRegister, MORNING);
    expect(canProceed(checks)).toBe(false);
  });
});

describe("agrees with the mock trades", () => {
  const nonPass = (checks: Check[]) =>
    checks.filter((c) => c.status !== "pass").map((c) => `${c.id}:${c.status}`).sort();

  it.each([mockTradeClean, mockTradeWarnings, mockTradeFailures].map((t) => [t.id, t]))(
    "%s gets the same warnings and failures",
    (_, trade) => {
      expect(nonPass(runChecks(trade.extracted, demoRegister, MORNING))).toEqual(nonPass(trade.checks));
    },
  );
});

describe("nominatedContact", () => {
  it("returns the register's nominated contact, not any other signatory", () => {
    expect(nominatedContact(demoRegister, "40012")).toEqual({ name: "Mark Doyle", phone: "+353 1 555 0142", account_no: "40012" });
  });

  it("returns null for an unknown account", () => {
    expect(nominatedContact(demoRegister, "99999")).toBeNull();
  });
});

describe("demo client: Shay Power instructs, Hersh Singh confirms", () => {
  const shay: ExtractedTrade = {
    direction: "subscribe", isin: "IE0031442068", fund_name: "iShares Core S&P 500", account_no: "40058",
    account_name: "University of Limerick Investment Group", caller_name: "Shay Power", currency: "USD",
    quantity: 2500, quantity_type: "units", evidence: [],
  };

  it("Shay's instruction passes every check", () => {
    expect(runChecks(shay, demoRegister, MORNING).filter((c) => c.status !== "pass")).toEqual([]);
  });

  it("the callback goes to Hersh, not to Shay", () => {
    expect(nominatedContact(demoRegister, "40058")?.name).toBe("Hersh Singh");
  });

  it("Hersh can also instruct; an outsider can't", () => {
    expect(byId(runChecks({ ...shay, caller_name: "Hersh Singh" }, demoRegister, MORNING), "caller_authorised")?.status).toBe("pass");
    expect(byId(runChecks({ ...shay, caller_name: "John Kelly" }, demoRegister, MORNING), "caller_authorised")?.status).toBe("fail");
  });
});
