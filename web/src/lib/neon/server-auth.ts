import { createClient } from "@neon/neon-js/supabase";

export type AuthenticatedNeonRequest = {
  userId: string;
  accessToken: string;
  client: ReturnType<typeof createClient>;
};

export async function getAuthenticatedNeonRequest(request: Request): Promise<AuthenticatedNeonRequest | null> {
  const databaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!databaseUrl || !accessToken) return null;

  try {
    const authClient = createClient(databaseUrl);
    const { data, error } = await authClient.auth.getClaims(accessToken);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== "string" || !userId) return null;

    const client = createClient(databaseUrl, {
      dataApi: { options: { global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: globalThis.fetch } } },
    });
    return { userId, accessToken, client };
  } catch {
    return null;
  }
}

export async function hasSignedInNeonUser(request: Request) {
  return Boolean(await getAuthenticatedNeonRequest(request));
}
