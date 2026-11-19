import { createClient as createNeonDataClient } from "@neon/neon-js";
import { createClient as createNeonAuthClient } from "@neon/neon-js/supabase";

function createAuthenticatedDataClient(databaseUrl: string, accessToken: string) {
  const endpoint = new URL(databaseUrl);
  const [endpointLabel, ...domainLabels] = endpoint.hostname.split(".");
  if (!endpointLabel || domainLabels.length < 2) throw new Error("URL de endpoint Neon inválida.");
  const port = endpoint.port ? `:${endpoint.port}` : "";
  const basePath = endpoint.pathname.replace(/\/+$/, "");
  const dataApiUrl = `${endpoint.protocol}//${endpointLabel}.apirest.${domainLabels.join(".")}${port}${basePath}/rest/v1`;

  return createNeonDataClient({
    dataApi: {
      url: dataApiUrl,
      getToken: async () => accessToken,
    },
  });
}

export type AuthenticatedNeonRequest = {
  userId: string;
  accessToken: string;
  client: ReturnType<typeof createAuthenticatedDataClient>;
};

export async function getAuthenticatedNeonRequest(request: Request): Promise<AuthenticatedNeonRequest | null> {
  const databaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!databaseUrl || !accessToken) return null;

  try {
    const authClient = createNeonAuthClient(databaseUrl);
    const { data, error } = await authClient.auth.getClaims(accessToken);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== "string" || !userId) return null;

    const client = createAuthenticatedDataClient(databaseUrl, accessToken);
    return { userId, accessToken, client };
  } catch {
    return null;
  }
}

export async function hasSignedInNeonUser(request: Request) {
  return Boolean(await getAuthenticatedNeonRequest(request));
}
