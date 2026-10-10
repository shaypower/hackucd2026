// Loads the register (funds, accounts, authorised callers) for validation.
import "server-only";
import { db } from "@/lib/db/client";
import type { Register } from "@/lib/validation/register";

export async function loadRegister(): Promise<Register> {
  const [funds, accounts, callers] = await Promise.all([
    db().from("funds").select("isin, name, share_class_currencies, cutoff_time"),
    db().from("accounts").select("account_no, account_name"),
    db().from("authorised_callers").select("account_no, name, phone, is_nominated_callback"),
  ]);
  const error = funds.error ?? accounts.error ?? callers.error;
  if (error) throw new Error(`Failed to load register: ${error.message}`);

  return {
    // Postgres returns time as "HH:MM:SS"; the validator compares "HH:MM".
    funds: (funds.data ?? []).map((f) => ({ ...f, cutoff_time: String(f.cutoff_time).slice(0, 5) })),
    accounts: accounts.data ?? [],
    callers: callers.data ?? [],
  };
}
