import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = resolve(projectDirectory, ".env.local");

function loadLocalEnv() {
  let source;
  try {
    source = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of source.split(/\r?\n/)) {
    const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;

    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    process.env[match[1]] = value;
  }
}

export function getNeonDatabaseUrl() {
  loadLocalEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Defina DATABASE_URL no ambiente ou em web/.env.local usando Connect no painel Neon.");
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL não é uma connection string válida.");
  }

  if (url.protocol !== "postgresql:" || !url.hostname.endsWith(".neon.tech")) {
    throw new Error("DATABASE_URL precisa apontar para uma connection string PostgreSQL do Neon.");
  }
  if (url.hostname.includes("-pooler")) {
    throw new Error("Use a connection string direta (sem -pooler) para migrations e seed.");
  }

  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
