import { hasSignedInNeonUser } from "@/lib/neon/server-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function messageForStatus(status: number) {
  if (status === 401) return "A chave da WineAPI está ausente ou inválida.";
  if (status === 404) return "A ficha desse vinho não está disponível na WineAPI.";
  if (status === 429) return "O limite diário da WineAPI foi atingido. Tente novamente amanhã.";
  if (status >= 500) return "A WineAPI está temporariamente indisponível. Tente novamente em instantes.";
  return "Não foi possível carregar os detalhes desse vinho.";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasSignedInNeonUser(_request))) {
    return Response.json({ error: "O servidor não conseguiu validar a sessão da adega. Entre novamente e tente outra vez." }, { status: 401 });
  }

  const apiKey = process.env.WINEAPI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Configure WINEAPI_API_KEY no arquivo web/.env.local para ativar a busca." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return Response.json({ error: "Identificador de vinho inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.wineapi.io/wines/${encodeURIComponent(id)}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return Response.json({ error: messageForStatus(response.status) }, { status: response.status });
    }

    return Response.json(await response.json());
  } catch {
    return Response.json(
      { error: "Não foi possível conectar à WineAPI. Confira sua conexão e tente novamente." },
      { status: 502 },
    );
  }
}

