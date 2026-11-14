import { createClient } from "@neon/neon-js/supabase";

const databaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;

export const hasNeonConfig = Boolean(databaseUrl);

export function createNeonBrowserClient() {
  if (!databaseUrl) {
    throw new Error("Configure NEXT_PUBLIC_NEON_DATABASE_URL para conectar ao Neon.");
  }

  return createClient(databaseUrl);
}

export type NeonBrowserClient = ReturnType<typeof createNeonBrowserClient>;
