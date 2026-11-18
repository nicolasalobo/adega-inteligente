import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const container = `adega-phase2-pg-${randomUUID().slice(0, 8)}`;
const migrationDirectory = resolve("db/migrations");

function docker(args, { input, allowFailure = false } = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", input, windowsHide: true });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`docker ${args.join(" ")} falhou (${result.status}): ${result.stderr || result.stdout}`);
  }
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function psql(sql, { expectedFailure = false } = {}) {
  const result = docker([
    "exec", "-i", container, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres",
  ], { input: sql, allowFailure: expectedFailure });
  if (expectedFailure && result.status === 0) throw new Error("SQL deveria ter falhado, mas foi aceito.");
  return result;
}

try {
  docker([
    "run", "--detach", "--name", container,
    "--mount", `type=bind,source=${migrationDirectory},target=/migrations,readonly`,
    "--env", "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:16-alpine",
  ]);

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const probe = docker(["exec", container, "pg_isready", "-U", "postgres", "-d", "postgres"], { allowFailure: true });
    if (probe.status === 0) {
      const queryProbe = docker(["exec", container, "psql", "-X", "-q", "-t", "-U", "postgres", "-d", "postgres", "-c", "SELECT 1"], { allowFailure: true });
      if (queryProbe.status === 0 && queryProbe.stdout === "1") { ready = true; break; }
    }
    await delay(250);
  }
  assert.equal(ready, true, "PostgreSQL local de teste não ficou pronto");

  psql(`
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE anonymous NOLOGIN;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE SCHEMA neon_auth;
    CREATE TABLE neon_auth."user" (id uuid PRIMARY KEY, email text UNIQUE NOT NULL);
    GRANT USAGE ON SCHEMA auth, neon_auth, public TO authenticated, anonymous;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anonymous;
    GRANT SELECT ON neon_auth."user" TO authenticated;
  `);

  for (let number = 1; number <= 7; number += 1) {
    const migration = `/migrations/${String(number).padStart(4, "0")}_${[
      "cellar_inventory.sql", "shelf_updates.sql", "secure_inventory_rpc.sql", "qualify_inventory_rpc_cellar.sql",
      "bottle_history_reviews.sql", "phase3_validation.sql", "intelligent_wine_identification.sql",
    ][number - 1]}`;
    docker(["exec", container, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-f", migration]);
  }

  const eanChecks = psql(`
    SELECT public.is_valid_ean13('7892500022445') AND public.is_valid_ean13('8436559528924')
      AND NOT public.is_valid_ean13('7892500022444');
    SELECT count(*) = 8 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT relrowsecurity FROM pg_class WHERE oid = 'public.wine_barcodes'::regclass;
  `).stdout.split(/\r?\n/).filter(Boolean);
  assert.deepEqual(eanChecks, ["t", "t", "t"], "migration objects, EAN checksum and RLS were not installed");

  const accountOne = "10000000-0000-4000-8000-000000000001";
  const accountTwo = "20000000-0000-4000-8000-000000000002";
  const cellarOne = "30000000-0000-4000-8000-000000000001";
  const cellarTwo = "40000000-0000-4000-8000-000000000002";
  const shelfOne = "50000000-0000-4000-8000-000000000001";
  const shelfTwo = "60000000-0000-4000-8000-000000000002";
  psql(`
    INSERT INTO neon_auth."user" (id,email) VALUES
      ('${accountOne}','phase2-local-one@example.test'), ('${accountTwo}','phase2-local-two@example.test');
    INSERT INTO public.cellars (id,owner_id,name) VALUES
      ('${cellarOne}','${accountOne}','Local cellar one'), ('${cellarTwo}','${accountTwo}','Local cellar two');
    INSERT INTO public.shelves (id,cellar_id,name,row_count,column_count) VALUES
      ('${shelfOne}','${cellarOne}','Shelf one',2,2), ('${shelfTwo}','${cellarTwo}','Shelf two',2,2);
  `);

  function registerAs(userId, cellarId, shelfId, name, vintage = "2020", row = 1, column = 1, source = "user") {
    const result = psql(`
      BEGIN;
      SET LOCAL request.jwt.claim.sub = '${userId}';
      SET LOCAL ROLE authenticated;
      SELECT wine_id FROM public.register_wine_bottles_with_barcode(
        '${cellarId}','${shelfId}',
        jsonb_build_object('name','${name}','producer','Test producer','vintage','${vintage}','country','Chile','region','Rapel','grapes',jsonb_build_array('Carmenere')),
        '[{"row":${row},"column":${column}}]'::jsonb,
        '7892500022445','${source}','https://example.org/source'
      );
      COMMIT;
    `);
    return result.stdout.split(/\r?\n/).filter((line) => /^[0-9a-f-]{36}$/i.test(line)).at(-1);
  }

  const wineOne = registerAs(accountOne, cellarOne, shelfOne, "Panul local one");
  const wineTwo = registerAs(accountTwo, cellarTwo, shelfTwo, "Panul local two");
  const wineOneRetry = registerAs(accountOne, cellarOne, shelfOne, "Panul local one", "2020", 1, 2, "open_food_facts");
  const wineOneOtherVintage = registerAs(accountOne, cellarOne, shelfOne, "Panul local one", "2021", 2, 1, "user");
  assert.ok(wineOne && wineTwo, "authenticated atomic registration did not return wine IDs");
  assert.equal(wineOneRetry, wineOne, "same vintage registration should reuse its wine association");
  assert.notEqual(wineOneOtherVintage, wineOne, "separate vintages must remain separate wines");

  const visibleOne = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.wine_barcodes WHERE ean13='7892500022445'; COMMIT;`).stdout;
  const visibleTwo = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.wine_barcodes WHERE ean13='7892500022445'; COMMIT;`).stdout;
  const hiddenTwoFromOne = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.wine_barcodes WHERE wine_id='${wineTwo}'; COMMIT;`).stdout;
  const hiddenOneFromTwo = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.wine_barcodes WHERE wine_id='${wineOne}'; COMMIT;`).stdout;
  assert.equal(visibleOne, "2", "the same EAN may point to two user-confirmed vintages in one cellar");
  assert.equal(visibleTwo, "1", "the second account only sees its own barcode association");
  assert.equal(hiddenTwoFromOne, "0");
  assert.equal(hiddenOneFromTwo, "0");

  const invalidEan = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; SELECT * FROM public.register_wine_bottles_with_barcode('${cellarOne}','${shelfOne}','{"name":"Invalid","producer":"Invalid"}'::jsonb,'[{"row":1,"column":2}]'::jsonb,'7892500022444'); COMMIT;`, { expectedFailure: true });
  assert.match(invalidEan.stderr, /valid EAN-13/);
  const invalidPosition = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; SELECT * FROM public.register_wine_bottles_with_barcode('${cellarOne}','${shelfOne}','{"name":"Rollback","producer":"Invalid"}'::jsonb,'[{"row":9,"column":9}]'::jsonb,'7892500022445'); COMMIT;`, { expectedFailure: true });
  assert.match(invalidPosition.stderr, /outside the shelf dimensions/);

  const barcodeQuota = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; SELECT public.consume_barcode_identification_quota() FROM generate_series(1,31); COMMIT;`).stdout.split(/\r?\n/);
  assert.equal(barcodeQuota.filter((value) => value === "t").length, 30);
  assert.equal(barcodeQuota.at(-1), "f");
  const photoQuota = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated; SELECT public.consume_photo_identification_quota() FROM generate_series(1,6); COMMIT;`).stdout.split(/\r?\n/);
  assert.equal(photoQuota.filter((value) => value === "t").length, 5);
  assert.equal(photoQuota.at(-1), "f");
  const aiQuota = psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated; SELECT public.consume_ai_identification_quota() FROM generate_series(1,6); COMMIT;`).stdout.split(/\r?\n/);
  assert.equal(aiQuota.filter((value) => value === "t").length, 5);
  assert.equal(aiQuota.at(-1), "f");

  console.log("Migrations 0001–0007 instaladas em PostgreSQL 16 descartável; EAN, RPC atômico, RLS de associação entre duas contas e quotas 30/5/5 aprovados. Neon Auth foi simulado localmente: isto não substitui a validação em branch Neon.");
} finally {
  docker(["rm", "--force", container], { allowFailure: true });
}
