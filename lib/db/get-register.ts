// Register for validation: the Supabase tables once they're seeded, otherwise the built-in demo register.
import "server-only";
import { loadRegister } from "@/lib/db/register";
import type { RegisterSource } from "@/lib/types";
import { demoRegister } from "@/lib/validation/demo-register";
import type { Register } from "@/lib/validation/register";

export async function getRegister(): Promise<{ register: Register; source: RegisterSource }> {
  try {
    const register = await loadRegister();
    if (register.funds.length > 0) return { register, source: "database" };
  } catch (error) {
    console.warn("Register not available from the database; using the demo register.", (error as Error).message);
  }
  return { register: demoRegister, source: "demo" };
}
