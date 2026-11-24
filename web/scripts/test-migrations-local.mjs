import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
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

  const migrationFiles = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const migration of migrationFiles) {
    docker(["exec", container, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-f", `/migrations/${migration}`]);
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

  const initialPositions = psql(`
    SELECT id, row_number, column_number FROM public.bottles
    WHERE cellar_id='${cellarOne}' AND wine_id='${wineOne}' ORDER BY row_number, column_number;
  `).stdout.split(/\r?\n/).filter(Boolean).map((line) => line.split("|"));
  assert.equal(initialPositions.length, 2, "phase 3 fixture must contain two bottles of one vintage");
  const firstBottle = initialPositions[0][0];
  const secondBottle = initialPositions[1][0];
  const secondVintageBottle = psql(`
    SELECT id FROM public.bottles WHERE cellar_id='${cellarOne}' AND wine_id='${wineOneOtherVintage}';
  `).stdout.trim();
  assert.match(secondVintageBottle, /^[0-9a-f-]{36}$/i, "second vintage must have its own bottle fixture");
  const authenticated = `BEGIN; SET LOCAL request.jwt.claim.sub='${accountOne}'; SET LOCAL ROLE authenticated; `;
  const moveBottle = (bottleId, shelfId, row, column) =>
    `SELECT public.move_bottle('${cellarOne}','${bottleId}','${shelfId}',${row},${column});`;

  assert.match(psql(`${authenticated}${moveBottle(firstBottle, shelfOne, 1, 1)} COMMIT;`, { expectedFailure: true }).stderr, /current position/);
  assert.match(psql(`${authenticated}${moveBottle(firstBottle, shelfOne, 1, 2)} COMMIT;`, { expectedFailure: true }).stderr, /duplicate key|unique/i);
  assert.match(psql(`${authenticated}${moveBottle(firstBottle, shelfOne, 3, 1)} COMMIT;`, { expectedFailure: true }).stderr, /outside the shelf dimensions/);

  psql(`${authenticated}${moveBottle(firstBottle, shelfOne, 2, 2)} COMMIT;`);
  psql(`${authenticated}SELECT public.swap_bottles('${cellarOne}','${firstBottle}','${secondBottle}'); COMMIT;`);
  const afterSwap = psql(`
    SELECT count(*) FILTER (WHERE status='active'), count(DISTINCT (shelf_id,row_number,column_number))
    FROM public.bottles WHERE cellar_id='${cellarOne}';
    SELECT count(*) FROM public.bottle_movements WHERE cellar_id='${cellarOne}' AND movement_type='swap';
  `).stdout.split(/\r?\n/).filter(Boolean);
  assert.deepEqual(afterSwap, ["3|3", "2"], "swap must preserve every bottle/position and write two explicit events");

  const structuredShelf = psql(`
    INSERT INTO public.shelves(cellar_id,name,row_count,column_count,organization,rule_criterion,rule_axis,rule_values)
    VALUES ('${cellarOne}','Uruguay only',1,1,'structured','country','row',ARRAY['Uruguay']) RETURNING id;
  `).stdout.trim();
  const structuredWine = psql(`
    INSERT INTO public.wines(cellar_id,name,producer,country) VALUES ('${cellarOne}','Structured test','Producer','Uruguay') RETURNING id;
  `).stdout.trim();
  const structuredBottle = psql(`
    INSERT INTO public.bottles(cellar_id,wine_id,shelf_id,row_number,column_number)
    VALUES ('${cellarOne}','${structuredWine}','${structuredShelf}',1,1) RETURNING id;
  `).stdout.trim();
  assert.match(psql(`${authenticated}${moveBottle(secondBottle, structuredShelf, 1, 1)} COMMIT;`, { expectedFailure: true }).stderr, /rule/);
  assert.match(psql(`${authenticated}SELECT public.swap_bottles('${cellarOne}','${secondBottle}','${structuredBottle}'); COMMIT;`, { expectedFailure: true }).stderr, /rule/);
  const afterRejectedSwap = psql(`
    SELECT count(*), count(DISTINCT (shelf_id,row_number,column_number)),
      (SELECT count(*) FROM public.bottle_movements WHERE cellar_id='${cellarOne}')
    FROM public.bottles WHERE cellar_id='${cellarOne}';
  `).stdout.trim();
  assert.equal(afterRejectedSwap, "4|4|3", "rejected structured swap must leave positions and history unchanged");

  psql(`${authenticated}SELECT public.remove_bottle('${cellarOne}','${firstBottle}','consumida'); COMMIT;`);
  psql(`${authenticated}
    INSERT INTO public.bottles(cellar_id,wine_id,shelf_id,row_number,column_number)
    VALUES ('${cellarOne}','${wineOne}','${shelfOne}',1,2);
    INSERT INTO public.bottle_reviews(cellar_id,bottle_id,rating,comment)
    VALUES ('${cellarOne}','${firstBottle}',4,'Muito bom'),('${cellarOne}','${secondBottle}',5,NULL),('${cellarOne}','${secondVintageBottle}',2,NULL);
    COMMIT;
  `);
  assert.match(psql(`${authenticated}INSERT INTO public.bottle_reviews(cellar_id,bottle_id,rating,comment) VALUES ('${cellarOne}','${secondBottle}',NULL,'somente comentário'); COMMIT;`, { expectedFailure: true }).stderr, /null value.*rating/i);
  const averages = psql(`
    SELECT w.vintage, avg(r.rating)::numeric FROM public.bottle_reviews r
    JOIN public.bottles b ON b.id=r.bottle_id JOIN public.wines w ON w.id=b.wine_id
    WHERE r.cellar_id='${cellarOne}' GROUP BY w.vintage ORDER BY w.vintage;
  `).stdout.split(/\r?\n/).filter(Boolean);
  const parsedAverages = averages.map((line) => {
    const [vintage, average] = line.split("|");
    return [vintage, Number(average)];
  });
  assert.deepEqual(parsedAverages, [["2020", 4.5], ["2021", 2]], "reviews must average by wine vintage");
  psql(`${authenticated}SELECT public.remove_bottle('${cellarOne}','${secondVintageBottle}',NULL); COMMIT;`);
  const optionalRemoval = psql(`
    SELECT b.status, b.removal_reason IS NULL,
      EXISTS (SELECT 1 FROM public.bottle_movements m WHERE m.bottle_id=b.id AND m.movement_type='remove' AND m.reason IS NULL AND m.actor_id='${accountOne}')
    FROM public.bottles b WHERE b.id='${secondVintageBottle}';
  `).stdout.trim();
  assert.equal(optionalRemoval, "removed|t|t", "removal reason must be optional while actor and history remain");
  const history = psql(`
    SELECT count(*), count(*) FILTER (WHERE movement_type='remove' AND reason='consumida' AND actor_id='${accountOne}')
    FROM public.bottle_movements WHERE cellar_id='${cellarOne}';
  `).stdout.trim();
  assert.equal(history, "5|1", "move, swap and removals must retain history and responsible user");
  assert.match(psql(`${authenticated}SELECT public.move_bottle('${cellarTwo}','${firstBottle}','${shelfTwo}',1,1); COMMIT;`, { expectedFailure: true }).stderr, /42501|Cellar not found/);
  const hiddenPhase3 = psql(`
    BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated;
    SELECT (SELECT count(*) FROM public.bottle_movements WHERE cellar_id='${cellarOne}') || '|' ||
      (SELECT count(*) FROM public.bottle_reviews WHERE cellar_id='${cellarOne}');
    COMMIT;
  `).stdout.trim();
  assert.equal(hiddenPhase3, "0|0", "another owner must not read movement history or reviews");
  assert.match(psql(`BEGIN; SET LOCAL request.jwt.claim.sub='${accountTwo}'; SET LOCAL ROLE authenticated; INSERT INTO public.bottle_reviews(cellar_id,bottle_id,rating) VALUES ('${cellarOne}','${secondBottle}',5); COMMIT;`, { expectedFailure: true }).stderr, /row-level security/i);

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

  console.log("Migrations 0001–0009 instaladas em PostgreSQL 16 descartável; EAN, RPC atômico, RLS, quotas, movimentos, trocas, retiradas, histórico e médias por safra aprovados. Neon Auth foi simulado localmente: isto não substitui a validação em branch Neon.");
} finally {
  docker(["rm", "--force", container], { allowFailure: true });
}
