import { normalizeEan13 } from "@/lib/identification/ean13";
import type {
  IdentificationCandidate,
  IdentificationResponse,
  IdentificationSource,
  OpenFoodFactsProduct,
  WebSearchResult,
  WineApiWineCandidate,
} from "@/lib/identification/contracts";

export type ExistingWineAssociation = {
  id: string;
  name: string;
  producer: string;
  vintage: string | null;
  country: string | null;
  region: string | null;
  grapes: string[] | null;
};

export type IdentificationProviders = {
  findAssociations: (ean13: string) => Promise<ExistingWineAssociation[]>;
  openFoodFacts: (ean13: string) => Promise<OpenFoodFactsProduct | null>;
  wineApi: (query: string) => Promise<WineApiWineCandidate[]>;
  webSearch: (ean13: string, productName: string) => Promise<WebSearchResult[]>;
  resolveWithAi: (candidates: IdentificationCandidate[]) => Promise<{ candidateId: string | null; rationale: string }>;
};

export type IdentificationOptions = {
  allowWineApi: boolean;
  allowWebSearch: boolean;
  allowAiResolution: boolean;
};

const openFoodFactsSource = (ean13: string): IdentificationSource => ({
  id: "open_food_facts",
  label: "Open Food Facts (dados comunitários; revisar)",
  url: `https://world.openfoodfacts.org/product/${ean13}`,
});

const wineApiSource: IdentificationSource = {
  id: "wineapi",
  label: "WineAPI (resultado de catálogo; revisar)",
  url: "https://wineapi.io/docs/",
};

function uniqueSources(sources: IdentificationSource[]) {
  const byId = new Map(sources.map((source) => [`${source.id}:${source.url ?? ""}`, source]));
  return [...byId.values()];
}

function wineApiName(value: WineApiWineCandidate["winery"] | WineApiWineCandidate["region"]) {
  return typeof value === "string" ? value : value?.name ?? "";
}

function candidateFromWineApi(wine: WineApiWineCandidate): IdentificationCandidate {
  const region = wineApiName(wine.region);
  const country = wine.country ?? (typeof wine.region === "object" ? wine.region?.country : "") ?? "";
  const grapes = Array.isArray(wine.grapes)
    ? wine.grapes.map((grape) => typeof grape === "string" ? grape : grape?.name ?? "").filter(Boolean).join(", ")
    : "";

  return {
    id: `wineapi:${wine.id}`,
    name: wine.name,
    producer: wineApiName(wine.winery),
    // WineAPI candidates are suggestions. A barcode alone never confirms a vintage.
    vintage: wine.vintage == null ? "" : String(wine.vintage),
    country,
    region,
    grape: grapes,
    volume: "",
    productType: wine.type ?? "",
    sources: [wineApiSource],
    fieldsToReview: ["identidade do rótulo", "safra", "volume", "uva(s)", "origem"],
    confidence: "medium",
  };
}

function candidateFromOpenFoodFacts(ean13: string, product: OpenFoodFactsProduct): IdentificationCandidate | null {
  const name = product.product_name?.trim() ?? "";
  const producer = product.brands?.split(/[,;]/)[0]?.trim() ?? "";
  if (!name && !producer) return null;

  return {
    id: `openfoodfacts:${ean13}`,
    name,
    producer,
    vintage: "",
    // `countries` means markets where sold in OFF, so only explicit origin fields are shown.
    country: product.origins?.trim() || product.manufacturing_places?.trim() || "",
    region: "",
    grape: "",
    volume: product.quantity?.trim() ?? "",
    productType: product.categories?.trim() || product.product_type?.trim() || "",
    sources: [openFoodFactsSource(ean13)],
    fieldsToReview: ["identidade do rótulo", "produtor", "safra", "país", "região", "uva(s)"],
    confidence: "low",
  };
}

function candidateFromWeb(result: WebSearchResult, index: number): IdentificationCandidate {
  return {
    id: `web:${index}`,
    name: result.title,
    producer: "",
    vintage: "",
    country: "",
    region: "",
    grape: "",
    volume: "",
    productType: result.description,
    sources: [{ id: "web", label: "Resultado de pesquisa externa; confirme na fonte", url: result.url }],
    fieldsToReview: ["identidade do rótulo", "produtor", "safra", "país", "região", "uva(s)", "volume"],
    confidence: "low",
  };
}

/**
 * Provider order is deliberate and injected so the whole waterfall can be tested without API keys.
 * External data is returned as candidates with provenance; this function never writes to inventory.
 */
export async function identifyBarcode(
  input: string,
  providers: IdentificationProviders,
  options: IdentificationOptions,
): Promise<IdentificationResponse> {
  const ean13 = normalizeEan13(input);
  if (!ean13) throw new Error("Informe um EAN-13 válido, incluindo o dígito verificador.");

  const response: IdentificationResponse = {
    ean13,
    status: "not_found",
    candidates: [],
    sources: [],
    warnings: [],
    integrations: {
      openFoodFacts: "not_found",
      wineApi: options.allowWineApi ? "unavailable" : "disabled",
      webSearch: options.allowWebSearch ? "unavailable" : "disabled",
      ai: options.allowAiResolution ? "unavailable" : "disabled",
    },
  };

  try {
    const associations = await providers.findAssociations(ean13);
    if (associations.length) {
      const source: IdentificationSource = { id: "cellar", label: "Associação confirmada na sua adega", url: null };
      response.candidates = associations.map((wine) => ({
        id: `cellar:${wine.id}`,
        existingWineId: wine.id,
        name: wine.name,
        producer: wine.producer,
        vintage: wine.vintage ?? "",
        country: wine.country ?? "",
        region: wine.region ?? "",
        grape: (wine.grapes ?? []).join(", "),
        volume: "",
        productType: "",
        sources: [source],
        fieldsToReview: [],
        confidence: "high",
      }));
      response.sources = [source];
      response.status = associations.length > 1 ? "ambiguous" : "identified";
      return response;
    }
  } catch {
    response.warnings.push("Não foi possível consultar as associações da sua adega; os catálogos externos ainda serão consultados.");
  }

  let product: OpenFoodFactsProduct | null = null;
  try {
    product = await providers.openFoodFacts(ean13);
    response.integrations.openFoodFacts = product ? "found" : "not_found";
    const candidate = product && candidateFromOpenFoodFacts(ean13, product);
    if (candidate) response.candidates.push(candidate);
    if (product) response.sources.push(openFoodFactsSource(ean13));
  } catch {
    response.integrations.openFoodFacts = "unavailable";
    response.warnings.push("Open Food Facts está indisponível no momento.");
  }

  if (options.allowWineApi) {
    try {
      const query = [product?.brands, product?.product_name, ean13].filter(Boolean).join(" ").slice(0, 160);
      const wines = await providers.wineApi(query);
      response.integrations.wineApi = "used";
      const wineApiCandidates = wines.map(candidateFromWineApi);
      response.candidates.push(...wineApiCandidates);
      if (wineApiCandidates.length) response.sources.push(wineApiSource);
    } catch {
      response.integrations.wineApi = "unavailable";
      response.warnings.push("A WineAPI está indisponível; os resultados anteriores continuam disponíveis para revisão.");
    }
  }

  if (options.allowWebSearch && (response.candidates.length === 0 || response.candidates.length > 1)) {
    try {
      const searchResults = await providers.webSearch(ean13, product?.product_name ?? product?.brands ?? "");
      response.integrations.webSearch = "used";
      const webCandidates = searchResults.slice(0, 5).map(candidateFromWeb);
      response.candidates.push(...webCandidates);
      response.sources.push(...webCandidates.flatMap((candidate) => candidate.sources));
    } catch {
      response.integrations.webSearch = "unavailable";
      response.warnings.push("A pesquisa externa está indisponível; confira as fontes disponíveis ou use o cadastro manual.");
    }
  }

  if (options.allowAiResolution && response.candidates.length > 1) {
    try {
      const selection = await providers.resolveWithAi(response.candidates);
      const validId = response.candidates.some((candidate) => candidate.id === selection.candidateId)
        ? selection.candidateId
        : null;
      response.integrations.ai = "used";
      response.aiSelection = { candidateId: validId, rationale: selection.rationale.slice(0, 500) };
      if (!validId) response.warnings.push("A IA não conseguiu resolver a ambiguidade com segurança. Selecione um resultado ou preencha a ficha manualmente.");
      else response.warnings.push("A sugestão da IA não confirma nenhum campo. Revise a ficha e a fonte antes de salvar.");
    } catch (error) {
      response.integrations.ai = "unavailable";
      response.warnings.push(error instanceof Error && error.message === "AI_RATE_LIMIT"
        ? "Limite de 5 comparações por IA por hora atingido. Revise os candidatos manualmente."
        : "A análise por IA falhou; nenhum dado foi alterado. Selecione um candidato ou use o cadastro manual.");
    }
  }

  response.sources = uniqueSources(response.sources);
  response.status = response.candidates.length === 0
    ? "not_found"
    : response.candidates.length === 1
      ? "identified"
      : "ambiguous";
  if (response.candidates.some((candidate) => candidate.vintage)) {
    response.warnings.push("A safra exibida é apenas candidata: nenhum EAN-13 identifica a safra da garrafa com segurança.");
  }
  return response;
}
