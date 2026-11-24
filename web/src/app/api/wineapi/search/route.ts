import { hasSignedInNeonUser } from "@/lib/neon/server-auth";

type WineApiSearchItem = {
  id: string;
  name: string;
  vintage: string | number | null;
  type: string | null;
  winery: string | { id?: string; name?: string } | null;
  region: string | { id?: string; name?: string; country?: string } | null;
  country: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  confidence: number | null;
};

function messageForStatus(status: number) {
  if (status === 401) return "A chave da WineAPI está ausente ou inválida.";
  if (status === 429) return "O limite diário da WineAPI foi atingido. Tente novamente amanhã.";
  if (status >= 500) return "A WineAPI está temporariamente indisponível. Tente novamente em instantes.";
  return "Não foi possível buscar vinhos na WineAPI.";
}

export async function GET(request: Request) {
  if (!(await hasSignedInNeonUser(request))) {
    return Response.json({ error: "O servidor não conseguiu validar a sessão da adega. Entre novamente e tente outra vez." }, { status: 401 });
  }

  const apiKey = process.env.WINEAPI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Configure WINEAPI_API_KEY no arquivo web/.env.local para ativar a busca." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ error: "Digite pelo menos 2 caracteres para pesquisar." }, { status: 400 });
  }

  const upstreamUrl = new URL("https://api.wineapi.io/wines/search");
  upstreamUrl.searchParams.set("q", query.slice(0, 160));
  upstreamUrl.searchParams.set("limit", "10");

  try {
    const response = await fetch(upstreamUrl, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return Response.json({ error: messageForStatus(response.status) }, { status: response.status });
    }

    const data = (await response.json()) as { results?: WineApiSearchItem[]; total?: number };
    return Response.json({ results: data.results ?? [], total: data.total ?? 0 });
  } catch {
    return Response.json(
      { error: "Não foi possível conectar à WineAPI. Confira sua conexão e tente novamente." },
      { status: 502 },
    );
  }
}

