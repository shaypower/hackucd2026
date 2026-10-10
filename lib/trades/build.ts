// Turns an extracted trade into a checked Trade (not persisted yet).
import type { Contact, ExtractedTrade, Trade } from "@/lib/types";
import { runChecks, statusFromChecks } from "@/lib/validation/checks";
import { findAccount, nominatedContact, type Register } from "@/lib/validation/register";

export function callbackContact(extracted: ExtractedTrade, register: Register): Contact | null {
  const account = extracted.account_no ? findAccount(register, extracted.account_no) : undefined;
  return account ? nominatedContact(register, account.account_no) : null;
}

export function buildTrade(extracted: ExtractedTrade, transcript: string, register: Register, now = new Date()): Trade {
  const checks = runChecks(extracted, register, now);
  return {
    id: crypto.randomUUID(),
    status: statusFromChecks(checks),
    transcript,
    extracted,
    checks,
    nominated_callback: callbackContact(extracted, register),
    created_at: now.toISOString(),
  };
}
