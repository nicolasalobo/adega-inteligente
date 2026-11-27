import type {
  IdentificationCandidate,
  IdentificationSource,
  OpenFoodFactsProduct,
  WebSearchResult,
  WineApiWineCandidate,
} from "@/lib/identification/contracts";
import type { ExistingWineAssociation, IdentificationProviders } from "@/lib/identification/service";
import type { AuthenticatedNeonRequest } from "@/lib/neon/server-auth";

function serverFeatureEnabled(name: string) {
  return process.env[name]?.toLowerCase() === "true";
}

export function getIdentificationCapabilities() {
  return {
    wineApi: Boolean(process.env.WINEAPI_API_KEY) && serverFeatureEnabled("ENABLE_WINEAPI_IDENTIFICATION"),
    webSearch: Boolean(process.env.BRAVE_SEARCH_API_KEY) && serverFeatureEnabled("ENABLE_EXTERNAL_WEB_SEARCH"),
    ai: Boolean(process.env.OPENAI_API_KEY) && serverFeatureEnabled("ENABLE_OPENAI_IDENTIFICATION"),
    photo: Boolean(process.env.OPENAI_API_KEY) && serverFeatureEnabled("ENABLE_OPENAI_IDENTIFICATION"),
  };
}

export async function consumeIdentificationQuota(
  request: AuthenticatedNeonRequest,
  type: "barcode" | "photo" | "ai",
) {
  const functionName = type === "photo"
    ? "consume_photo_identification_quota"
    : type === "ai"
      ? "consume_ai_identification_quota"
      : "consume_barcode_identification_quota";
  const { data, error } = await request.client.rpc(functionName);
  if (error) throw new Error("O limite de consultas não pôde ser verificado. Tente novamente mais tarde.");
  return data === true;
}

/** A conta logada enxerga a própria adega? Se não, o banco não reconheceu o login (RLS filtra tudo). */
export async function canSeeOwnCellar(request: AuthenticatedNeonRequest) {
  const { data, error } = await request.client.from("cellars").select("id").limit(1);
  return !error && Array.isArray(data) && data.length > 0;
}

export async function findUserBarcodeAssociations(
  request: AuthenticatedNeonRequest,
  ean13: string,
): Promise<ExistingWineAssociation[]> {
  const { data: associations, error } = await request.client
    .from("wine_barcodes")
    .select("wine_id")
    .eq("ean13", ean13)
    .limit(20);
  if (error) throw error;
  const wineIds = [...new Set((associations ?? []).map((row: { wine_id: string }) => row.wine_id))];
  if (!wineIds.length) return [];

  const { data: wines, error: wineError } = await request.client
    .from("wines")
    .select("id,name,producer,vintage,country,region,grapes")
    .in("id", wineIds);
  if (wineError) throw wineError;
  return (wines ?? []) as ExistingWineAssociation[];
}

export const openFoodFactsLookup = async (ean13: string): Promise<OpenFoodFactsProduct | null> => {
  const url = new URL(`https://world.openfoodfacts.org/api/v3/product/${ean13}.json`);
  url.searchParams.set("fields", "code,product_name,brands,categories,product_type,quantity,origins,manufacturing_places");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AdegaInteligente/2.0 (+https://github.com/nicolasalobo/adega-inteligente)",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Food Facts respondeu ${response.status}.`);
  const payload = await response.json() as { status?: number; product?: OpenFoodFactsProduct };
  return payload.status === 1 && payload.product ? payload.product : null;
};

export const wineApiSearch = async (query: string): Promise<WineApiWineCandidate[]> => {
  const apiKey = process.env.WINEAPI_API_KEY;
  if (!apiKey || !serverFeatureEnabled("ENABLE_WINEAPI_IDENTIFICATION")) return [];
  const url = new URL("https://api.wineapi.io/wines/search");
  url.searchParams.set("q", query.slice(0, 160));
  url.searchParams.set("limit", "5");
  const response = await fetch(url, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`WineAPI respondeu ${response.status}.`);
  const data = await response.json() as { results?: WineApiWineCandidate[] };
  return (data.results ?? []).slice(0, 5);
};

export const braveWebSearch = async (ean13: string, productName: string): Promise<WebSearchResult[]> => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey || !serverFeatureEnabled("ENABLE_EXTERNAL_WEB_SEARCH")) return [];
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", `${ean13} ${productName} vinho`);
  url.searchParams.set("count", "5");
  const response = await fetch(url, {
    headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Brave Search respondeu ${response.status}.`);
  const data = await response.json() as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
  return (data.web?.results ?? [])
    .filter((result): result is { title: string; url: string; description: string } => Boolean(result.title && result.url?.startsWith("https://")))
    .slice(0, 5)
    .map((result) => ({ title: result.title, url: result.url, description: result.description ?? "" }));
};

const candidateSchema = {
  type: "object",
  properties: {
    candidate_id: { type: ["string", "null"] },
    rationale: { type: "string" },
  },
  required: ["candidate_id", "rationale"],
  additionalProperties: false,
};

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("") ?? "";
}

async function openAiStructured<T>(input: unknown, schemaName: string, schema: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !serverFeatureEnabled("ENABLE_OPENAI_IDENTIFICATION")) throw new Error("Análise por IA desabilitada.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_IDENTIFICATION_MODEL || "gpt-4.1-mini",
      store: false,
      max_output_tokens: 350,
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`OpenAI respondeu ${response.status}.`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  return JSON.parse(outputText(payload)) as T;
}

export async function resolveIdentificationWithAi(candidates: IdentificationCandidate[]) {
  const prompt = [
    "Compare apenas estes candidatos e suas fontes para decidir se algum corresponde ao produto identificado.",
    "Não acrescente, corrija ou infira campos. Não use a safra para afirmar a correspondência do EAN.",
    "Retorne candidate_id null se houver dúvida ou evidência insuficiente. Rationale deve ser breve e baseada nos dados recebidos.",
    JSON.stringify(candidates.map(({ id, name, producer, vintage, country, region, grape, volume, sources }) => ({ id, name, producer, vintage, country, region, grape, volume, sources }))),
  ].join("\n");
  const result = await openAiStructured<{ candidate_id: string | null; rationale: string }>(
    [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    "barcode_candidate_selection",
    candidateSchema,
  );
  return { candidateId: result.candidate_id, rationale: result.rationale };
}

export function createIdentificationProviders(request: AuthenticatedNeonRequest): IdentificationProviders {
  return {
    findAssociations: (ean13) => findUserBarcodeAssociations(request, ean13),
    openFoodFacts: openFoodFactsLookup,
    wineApi: wineApiSearch,
    webSearch: braveWebSearch,
    resolveWithAi: async (candidates) => {
      if (!await consumeIdentificationQuota(request, "ai")) throw new Error("AI_RATE_LIMIT");
      return resolveIdentificationWithAi(candidates);
    },
  };
}

const photoSchema = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    producer: { type: ["string", "null"] },
    vintage: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    region: { type: ["string", "null"] },
    grape: { type: ["string", "null"] },
    volume: { type: ["string", "null"] },
    visible_text: { type: "string" },
  },
  required: ["name", "producer", "vintage", "country", "region", "grape", "volume", "visible_text"],
  additionalProperties: false,
};

export type PhotoLabelAnalysis = {
  candidate: IdentificationCandidate;
  visibleText: string;
  sources: IdentificationSource[];
  warnings: string[];
};

export async function analyzeLabelPhoto(imageDataUrl: string): Promise<PhotoLabelAnalysis> {
  const systemPrompt = "Leia somente texto visível na fotografia. Para cada campo não claramente legível, retorne null. Não complete dados por conhecimento geral. Safra deve ser transcrição literal, nunca deduzida de código. visible_text deve conter trechos literais que sustentem os campos preenchidos. Tudo exige revisão humana.";
  const result = await openAiStructured<{
    name: string | null; producer: string | null; vintage: string | null; country: string | null;
    region: string | null; grape: string | null; volume: string | null; visible_text: string;
  }>([
    { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
    { role: "user", content: [
      { type: "input_text", text: "Extraia os campos legíveis do rótulo e a evidência textual visível." },
      { type: "input_image", image_url: imageDataUrl, detail: "low" },
    ] },
  ], "wine_label_reading", photoSchema);

  const visibleText = result.visible_text.slice(0, 1000);
  const evidence = visibleText.toLocaleLowerCase("pt-BR");
  const readField = (value: string | null) => {
    const clean = value?.trim() ?? "";
    return clean && evidence.includes(clean.toLocaleLowerCase("pt-BR")) ? clean : "";
  };
  const candidate: IdentificationCandidate = {
    id: `photo:${crypto.randomUUID()}`,
    name: readField(result.name),
    producer: readField(result.producer),
    vintage: readField(result.vintage),
    country: readField(result.country),
    region: readField(result.region),
    grape: readField(result.grape),
    volume: readField(result.volume),
    productType: "",
    sources: [{ id: "photo", label: "Leitura assistida por IA da fotografia; revisar", url: null }],
    fieldsToReview: ["todos os campos extraídos da foto"],
    confidence: "low",
  };
  return {
    candidate,
    visibleText,
    sources: candidate.sources,
    warnings: ["A foto não é uma fonte independente de verificação. Confirme a transcrição no rótulo; campos sem evidência textual foram omitidos."],
  };
}
