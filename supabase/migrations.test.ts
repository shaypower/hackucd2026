// Applies every migration plus the seed to an in-process Postgres (PGlite) and checks the schema
// enforces what the app relies on. No Docker or network needed.
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { demoRegister } from "@/lib/validation/demo-register";

const dir = new URL("./migrations/", import.meta.url);
const read = (url: URL) => readFileSync(url, "utf8");

let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  // Roles that exist on Supabase but not in plain Postgres.
  await pg.exec("create role anon nologin; create role authenticated nologin;");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(read(new URL(file, dir)));
  }
  const seed = read(new URL("./seed.sql", import.meta.url));
  await pg.exec(seed);
  await pg.exec(seed); // the seed must be re-runnable
}, 30_000);

async function count(table: string): Promise<number> {
  const { rows } = await pg.query<{ n: number }>(`select count(*)::int as n from public.${table}`);
  return rows[0].n;
}

describe("migrations + seed", () => {
  it("loads the demo register", async () => {
    expect(await count("funds")).toBe(demoRegister.funds.length);
    expect(await count("accounts")).toBe(demoRegister.accounts.length);
    expect(await count("authorised_callers")).toBe(demoRegister.callers.length);
    expect(await count("subscriptions")).toBe(1);
  });

  it("enables RLS on every table", async () => {
    const { rows } = await pg.query<{ relname: string }>(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("gives the anon role no access", async () => {
    await expect(pg.exec("set role anon; select * from public.funds;")).rejects.toThrow(/permission denied/);
    await pg.exec("reset role;");
  });

  it("rejects a malformed ISIN", async () => {
    await expect(
      pg.exec("insert into public.funds (isin, name, share_class_currencies) values ('IE00BAD', 'x', array['USD'])"),
    ).rejects.toThrow(/check constraint/);
  });

  it("allows only one nominated callback contact per account", async () => {
    await expect(
      pg.exec("insert into public.authorised_callers (account_no, name, phone, is_nominated_callback) values ('40012', 'X', '1', true)"),
    ).rejects.toThrow(/duplicate key/);
  });

  it("rejects an unknown trade status", async () => {
    await expect(
      pg.exec("insert into public.trades (status, transcript, extracted) values ('done', 't', '{}')"),
    ).rejects.toThrow(/check constraint/);
  });

  it("deleting a trade removes its callbacks and audit events", async () => {
    const { rows } = await pg.query<{ id: string }>(
      "insert into public.trades (status, transcript, extracted) values ('needs_review', 't', '{}') returning id",
    );
    const id = rows[0].id;
    await pg.query(
      "insert into public.callbacks (trade_id, transcript, extracted, fields, all_match) values ($1, 't', '{}', '[]', true)",
      [id],
    );
    await pg.query("insert into public.audit_events (trade_id, actor, type) values ($1, 'test', 'trade_created')", [id]);
    await pg.query("delete from public.trades where id = $1", [id]);
    expect(await count("callbacks")).toBe(0);
    expect(await count("audit_events")).toBe(0);
  });
});
