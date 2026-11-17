import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { getNeonDatabaseUrl } from "./neon-env.mjs";

const projectDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsDirectory = resolve(projectDirectory, "db", "migrations");

async function main() {
  const client = new Client({ connectionString: getNeonDatabaseUrl() });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      );
      alter table public.schema_migrations enable row level security;
      revoke all on public.schema_migrations from public, anonymous, authenticated;
    `);

    const migrationFiles = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        "select 1 from public.schema_migrations where version = $1",
        [file],
      );
      if (alreadyApplied.rowCount) {
        console.log(`Já aplicada: ${file}`);
        continue;
      }

      await client.query("begin");
      try {
        await client.query(readFileSync(resolve(migrationsDirectory, file), "utf8"));
        await client.query("insert into public.schema_migrations (version) values ($1)", [file]);
        await client.query("commit");
        console.log(`Aplicada: ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Não foi possível aplicar as migrations do Neon.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
