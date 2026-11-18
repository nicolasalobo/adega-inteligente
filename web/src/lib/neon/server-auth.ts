import { createClient } from "@neon/neon-js/supabase";

export async function hasSignedInNeonUser(request: Request) {
  const databaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;
  if (!databaseUrl) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return false;

  try {
    const client = createClient(databaseUrl);
    const { data, error } = await client.auth.getClaims(accessToken);
    if (error) console.warn("WineAPI proxy session check failed:", error.message);
    return !error && Boolean(data.claims.sub);
  } catch {
    console.warn("WineAPI proxy session check failed with an unexpected error.");
    return false;
  }
}
