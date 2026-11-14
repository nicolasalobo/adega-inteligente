import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = resolve(projectDirectory, ".env.local");
const devEmail = "adega.dev@example.com";
const devPassword = "AdegaLocal2026!";

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

function runSupabase(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, ["supabase", ...args], {
    cwd: projectDirectory,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(details || `Supabase CLI exited with status ${result.status}.`);
  }

  return result.stdout ?? "";
}

function parseEnvOutput(output) {
  return Object.fromEntries(output.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return [];

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [[match[1], value]];
  }));
}

function getLocalCredentials() {
  const values = parseEnvOutput(runSupabase(["status", "--output", "env"]));
  const entries = Object.entries(values);
  const url = values.API_URL ?? values.PROJECT_URL ?? values.SUPABASE_URL ??
    entries.find(([, value]) => /^https?:\/\/(localhost|127\.0\.0\.1):54321\b/.test(value))?.[1];
  const publishableKey = entries.find(([name, value]) => /publishable/i.test(name) || value.startsWith("sb_publishable_"))?.[1]
    ?? values.ANON_KEY;
  const secretKey = entries.find(([name, value]) => /^(?:SUPABASE_)?(?:SECRET_KEY|SERVICE_ROLE_KEY)$/i.test(name) || value.startsWith("sb_secret_"))?.[1];

  if (!url || !publishableKey || !secretKey) {
    throw new Error(`Não encontrei todas as chaves locais no status do Supabase. Variáveis disponíveis: ${Object.keys(values).join(", ") || "nenhuma"}.`);
  }

  const parsedUrl = new URL(url);
  if (!(parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "[::1]" || parsedUrl.hostname === "::1") || parsedUrl.port !== "54321") {
    throw new Error("A seed só pode ser executada contra o Supabase local em localhost:54321.");
  }

  return { url, publishableKey, secretKey };
}

function writeLocalPublicConfig(url, publishableKey) {
  const previous = existsSync(localEnvPath) ? readFileSync(localEnvPath, "utf8") : "";
  const keys = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  const lines = previous.split(/\r?\n/).filter((line) => {
    const match = line.trim().match(/^([^#\s=]+)\s*=/);
    return !match || !keys.has(match[1]);
  });

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.push(
    `NEXT_PUBLIC_SUPABASE_URL=${JSON.stringify(url)}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${JSON.stringify(publishableKey)}`,
  );
  writeFileSync(localEnvPath, `${lines.join("\n")}\n`, "utf8");
}

function makeClient(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function getOrCreateDevUser(admin) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const existing = data.users.find((user) => user.email?.toLowerCase() === devEmail);
  if (existing) {
    const update = await admin.auth.admin.updateUserById(existing.id, {
      password: devPassword,
      email_confirm: true,
    });
    if (update.error) throw update.error;
    return update.data.user;
  }

  const created = await admin.auth.admin.createUser({
    email: devEmail,
    password: devPassword,
    email_confirm: true,
    user_metadata: { name: "Adega de demonstração" },
  });
  if (created.error) throw created.error;
  return created.data.user;
}

async function getOrCreateShelf(client, cellarId, existingShelves, { name, rows, columns }) {
  const shelf = existingShelves.find((item) =>
    item.name === name && item.organization === "free" &&
    item.row_count >= rows && item.column_count >= columns,
  );
  if (shelf) return shelf;

  const { data, error } = await client.from("shelves").insert({
    cellar_id: cellarId,
    name,
    row_count: rows,
    column_count: columns,
    organization: "free",
  }).select("id,name,row_count,column_count,organization").single();
  if (error) throw error;
  return data;
}

async function addWineBatch(client, cellarId, shelfId, wine, positions) {
  const { error } = await client.rpc("register_wine_bottles", {
    p_cellar_id: cellarId,
    p_shelf_id: shelfId,
    p_wine: { ...wine, custom_value: null },
    p_positions: positions.map(({ row, column }) => ({ row, column })),
  });
  if (error) throw error;
}

async function main() {
  const { url, publishableKey, secretKey } = getLocalCredentials();
  writeLocalPublicConfig(url, publishableKey);

  const admin = makeClient(url, secretKey);
  const user = await getOrCreateDevUser(admin);
  const client = makeClient(url, publishableKey);
  const signIn = await client.auth.signInWithPassword({ email: devEmail, password: devPassword });
  if (signIn.error) throw signIn.error;

  let { data: cellar, error } = await client.from("cellars")
    .select("id,name")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (!cellar) {
    const created = await client.from("cellars")
      .insert({ owner_id: user.id, name: "Minha adega" })
      .select("id,name")
      .single();
    if (created.error) throw created.error;
    cellar = created.data;
  }

  const existingBottles = await client.from("bottles")
    .select("id", { count: "exact", head: true })
    .eq("cellar_id", cellar.id);
  if (existingBottles.error) throw existingBottles.error;
  if ((existingBottles.count ?? 0) > 0) {
    console.log("A adega local já tem garrafas; mantive os dados e não reapliquei a seed.");
  } else {
    const shelvesResult = await client.from("shelves")
      .select("id,name,row_count,column_count,organization")
      .eq("cellar_id", cellar.id)
      .order("created_at");
    if (shelvesResult.error) throw shelvesResult.error;

    const mainShelf = await getOrCreateShelf(client, cellar.id, shelvesResult.data ?? [], {
      name: "Adega principal",
      rows: 5,
      columns: 10,
    });
    const secondShelf = await getOrCreateShelf(client, cellar.id, shelvesResult.data ?? [], {
      name: "Brancos & especiais",
      rows: 3,
      columns: 8,
    });

    const batches = new Map();
    mainShelfSequence.forEach((wineKey, index) => {
      const positions = batches.get(wineKey) ?? [];
      positions.push({ row: Math.floor(index / mainShelf.column_count) + 1, column: (index % mainShelf.column_count) + 1 });
      batches.set(wineKey, positions);
    });

    for (const [wineKey, positions] of batches) {
      await addWineBatch(client, cellar.id, mainShelf.id, wines[wineKey], positions);
    }

    const secondShelfBatches = new Map();
    for (const position of secondShelfPositions) {
      const positions = secondShelfBatches.get(position.wine) ?? [];
      positions.push({ row: position.row, column: position.column });
      secondShelfBatches.set(position.wine, positions);
    }
    for (const [wineKey, positions] of secondShelfBatches) {
      await addWineBatch(client, cellar.id, secondShelf.id, wines[wineKey], positions);
    }

    console.log("Seed aplicada: 7 rótulos e 26 garrafas em duas prateleiras.");
  }

  console.log(`Login local: ${devEmail}`);
  console.log(`Senha local: ${devPassword}`);
  console.log("A chave secreta foi usada apenas neste processo e não foi gravada em arquivo.");
}

main().catch((error) => {
  console.error("Não foi possível preparar a adega de desenvolvimento.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
