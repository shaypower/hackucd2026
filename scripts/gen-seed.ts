// Generates supabase/seed.sql from lib/validation/demo-register.ts (the single source of truth).
// Run: npm run db:seed:gen
import { writeFileSync } from "node:fs";
import { buildSeedSql } from "@/lib/db/seed";

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), buildSeedSql());
console.log("Wrote supabase/seed.sql");
