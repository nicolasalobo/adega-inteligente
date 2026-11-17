import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Client } from "pg";
import { getNeonDatabaseUrl } from "./neon-env.mjs";

const wines = {
  malbec: {
    name: "Malbec de altitude",
    producer: "Serra Clara",
    vintage: "2021",
    country: "Brasil",
    region: "Campanha Gaúcha",
    grapes: ["Malbec"],
  },
  cabernetFranc: {
    name: "Cabernet Franc Reserva",
    producer: "Casa do Vale",
    vintage: "2020",
    country: "Brasil",
    region: "Serra Gaúcha",
    grapes: ["Cabernet Franc"],
  },
  pinotNoir: {
    name: "Pinot Noir",
    producer: "Domaine des Pins",
    vintage: "2019",
    country: "França",
    region: "Borgonha",
    grapes: ["Pinot Noir"],
  },
  crianza: {
    name: "Crianza",
    producer: "Bodega del Camino",
    vintage: "2018",
    country: "Espanha",
    region: "Rioja",
    grapes: ["Tempranillo"],
  },
  chardonnay: {
    name: "Chardonnay de barrica",
    producer: "Monte das Nuvens",
    vintage: "2022",
    country: "Brasil",
    region: "Serra da Mantiqueira",
    grapes: ["Chardonnay"],
  },
  syrah: {
    name: "Syrah Reserva",
    producer: "Viña del Horizonte",
    vintage: "2020",
    country: "Chile",
    region: "Vale do Colchagua",
    grapes: ["Syrah"],
  },
  blend: {
    name: "Corte da Casa",
    producer: "Adega do Ipê",
    vintage: "2017",
    country: "Portugal",
    region: "Alentejo",
    grapes: ["Aragonez", "Alicante Bouschet"],
  },
};

const mainShelfSequence = [
  "malbec", "cabernetFranc", "pinotNoir", "crianza", "syrah",
  "malbec", "blend", "pinotNoir", "cabernetFranc", "chardonnay",
  "crianza", "malbec", "syrah", "blend", "cabernetFranc",
  "pinotNoir", "chardonnay", "malbec", "crianza", "syrah",
  "blend", "cabernetFranc",
];

const secondShelfPositions = [
  { wine: "chardonnay", row: 1, column: 1 },
  { wine: "pinotNoir", row: 1, column: 2 },
  { wine: "chardonnay", row: 1, column: 3 },
  { wine: "malbec", row: 1, column: 4 },
];

async function askForEmail() {
  const input = createInterface({ input: stdin, output: stdout });
  try {
    return (await input.question("E-mail da conta criada no Neon Auth: ")).trim();
  } finally {
    input.close();
  }
}

async function getOrCreateCellar(client, userId) {
  const result = await client.query(`
    insert into public.cellars (owner_id, name)
    values ($1, 'Minha adega')
    on conflict (owner_id) do update set name = public.cellars.name
    returning id
  `, [userId]);
  return result.rows[0].id;
}

async function getOrCreateShelf(client, cellarId, { name, rows, columns }) {
  const existing = await client.query(`
    select id, row_count, column_count
    from public.shelves
    where cellar_id = $1 and name = $2 and organization = 'free'
    order by created_at
    limit 1
  `, [cellarId, name]);

  if (existing.rows[0]) {
    const shelf = existing.rows[0];
    if (shelf.row_count < rows || shelf.column_count < columns) {
      await client.query(`
        update public.shelves
        set row_count = greatest(row_count, $2), column_count = greatest(column_count, $3)
        where id = $1
      `, [shelf.id, rows, columns]);
    }
    return shelf.id;
  }

  const created = await client.query(`
    insert into public.shelves (cellar_id, name, row_count, column_count, organization)
    values ($1, $2, $3, $4, 'free')
    returning id
  `, [cellarId, name, rows, columns]);
  return created.rows[0].id;
}

async function getOrCreateWine(client, cellarId, wine) {
  const values = [
    cellarId,
    wine.name,
    wine.producer,
    wine.vintage,
    wine.country,
    wine.region,
    wine.grapes,
  ];
  const created = await client.query(`
    insert into public.wines (cellar_id, name, producer, vintage, country, region, grapes)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (cellar_id, name_key, producer_key, vintage_key) do nothing
    returning id
  `, values);

  if (created.rows[0]) return created.rows[0].id;

  const existing = await client.query(`
    select id from public.wines
    where cellar_id = $1
      and name_key = lower(btrim($2))
      and producer_key = lower(btrim($3))
      and vintage_key = coalesce($4, '')
    limit 1
  `, [cellarId, wine.name, wine.producer, wine.vintage]);
  if (!existing.rows[0]) throw new Error(`Não foi possível localizar o vinho "${wine.name}".`);
  return existing.rows[0].id;
}

async function addBottle(client, cellarId, shelfId, wineId, { row, column }) {
  await client.query(`
    insert into public.bottles (cellar_id, wine_id, shelf_id, row_number, column_number)
    values ($1, $2, $3, $4, $5)
  `, [cellarId, wineId, shelfId, row, column]);
}

async function main() {
  const connectionString = getNeonDatabaseUrl();
  const email = process.env.NEON_DEV_USER_EMAIL?.trim() || await askForEmail();
  if (!email) throw new Error("Informe o e-mail usado para criar a conta no Neon Auth.");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("begin");
    const userResult = await client.query(`
      select id from neon_auth."user" where lower(email) = lower($1) limit 1
    `, [email]);
    const user = userResult.rows[0];
    if (!user) throw new Error("Não encontrei essa conta em neon_auth. Crie a conta no app e tente novamente.");

    const cellarId = await getOrCreateCellar(client, user.id);
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [cellarId]);
    const existingBottles = await client.query(
      "select 1 from public.bottles where cellar_id = $1 limit 1",
      [cellarId],
    );
    if (existingBottles.rowCount) {
      await client.query("commit");
      console.log("A adega já contém garrafas; nenhum dado foi alterado.");
      return;
    }

    const mainShelfId = await getOrCreateShelf(client, cellarId, {
      name: "Adega principal",
      rows: 5,
      columns: 10,
    });
    const secondShelfId = await getOrCreateShelf(client, cellarId, {
      name: "Brancos & especiais",
      rows: 3,
      columns: 8,
    });

    const wineIds = new Map();
    for (const [key, wine] of Object.entries(wines)) {
      wineIds.set(key, await getOrCreateWine(client, cellarId, wine));
    }

    for (const [index, key] of mainShelfSequence.entries()) {
      await addBottle(client, cellarId, mainShelfId, wineIds.get(key), {
        row: Math.floor(index / 10) + 1,
        column: (index % 10) + 1,
      });
    }
    for (const position of secondShelfPositions) {
      await addBottle(client, cellarId, secondShelfId, wineIds.get(position.wine), position);
    }

    await client.query("commit");
    console.log("Seed aplicada: 7 rótulos e 26 garrafas em duas prateleiras.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Não foi possível preparar os dados de demonstração do Neon.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
