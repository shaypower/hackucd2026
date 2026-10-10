// The transfer agent's register: funds, accounts and who may instruct on each account.
// Validation takes it as a plain object so it can be tested without a database; the DB layer loads it.
import type { Contact } from "@/lib/types";

export interface Fund {
  isin: string;
  name: string;
  share_class_currencies: string[]; // ISO 4217
  cutoff_time: string; // "HH:MM", Europe/Dublin
}

export interface Account {
  account_no: string;
  account_name: string;
}

export interface AuthorisedCaller {
  account_no: string;
  name: string;
  phone: string;
  is_nominated_callback: boolean;
}

export interface Register {
  funds: Fund[];
  accounts: Account[];
  callers: AuthorisedCaller[];
}

/** Lowercase, strip punctuation, collapse whitespace: "Harbourview  Pension Trustees." → "harbourview pension trustees". */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFund(register: Register, isin: string): Fund | undefined {
  return register.funds.find((f) => f.isin === isin);
}

export function findAccount(register: Register, accountNo: string): Account | undefined {
  return register.accounts.find((a) => a.account_no === accountNo.trim());
}

export function findAuthorisedCaller(
  register: Register,
  accountNo: string,
  callerName: string,
): AuthorisedCaller | undefined {
  const name = normalizeName(callerName);
  return register.callers.find((c) => c.account_no === accountNo.trim() && normalizeName(c.name) === name);
}

/** The contact to call back. Always from the register, never a number given during the call. */
export function nominatedContact(register: Register, accountNo: string): Contact | null {
  const caller = register.callers.find((c) => c.account_no === accountNo.trim() && c.is_nominated_callback);
  return caller ? { name: caller.name, phone: caller.phone, account_no: caller.account_no } : null;
}
