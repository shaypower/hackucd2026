import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSeedSql } from "@/lib/db/seed";

describe("supabase/seed.sql", () => {
  it("is up to date with the demo register (run `npm run db:seed:gen` if this fails)", () => {
    const onDisk = readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
    expect(onDisk).toBe(buildSeedSql());
  });

});
