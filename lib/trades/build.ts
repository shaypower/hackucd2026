// Turns an extracted trade into a checked Trade (not persisted yet).
import type { Contact, ExtractedTrade, Trade } from "@/lib/types";
import { runChecks, statusFromChecks } from "@/lib/validation/checks";
import { findAccount, nominatedContact, type Register } from "@/lib/validation/register";

/** "+353870000123" -> "+353 87 ••• 0123" (the site is public, so never show the full demo number). */
export function maskPhone(n: string): string {
  const digits = n.replace(/[^\d+]/g, "");
  return digits.length > 8 ? `${digits.slice(0, 4)} ${digits.slice(4, 6)} ••• ${digits.slice(-4)}` : "••••";
}

export function callbackContact(extracted: ExtractedTrade, register: Register): Contact | null {
  const account = extracted.account_no ? findAccount(register, extracted.account_no) : undefined;
  const contact = account ? nominatedContact(register, account.account_no) : null;
  // Server-side only: in the demo, automated callbacks go to one real phone instead of the fictional register number.
  const demo = typeof process !== "undefined" ? process.env.DEMO_CALLBACK_NUMBER : undefined;
  return contact && demo ? { ...contact, dialled_phone: maskPhone(demo) } : contact;
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
