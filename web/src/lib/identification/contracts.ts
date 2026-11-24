export type IdentificationSource = {
  id: "cellar" | "open_food_facts" | "wineapi" | "web" | "photo";
  label: string;
  url: string | null;
};

export type IdentificationCandidate = {
  id: string;
  name: string;
  producer: string;
  vintage: string;
  country: string;
  region: string;
  grape: string;
  volume: string;
  productType: string;
  existingWineId?: string;
  sources: IdentificationSource[];
  fieldsToReview: string[];
  confidence: "high" | "medium" | "low";
};

export type IdentificationResponse = {
  ean13: string;
  status: "identified" | "ambiguous" | "not_found";
  candidates: IdentificationCandidate[];
  sources: IdentificationSource[];
  warnings: string[];
  integrations: {
    openFoodFacts: "found" | "not_found" | "unavailable";
    wineApi: "used" | "disabled" | "unavailable";
    webSearch: "used" | "disabled" | "unavailable";
    ai: "used" | "disabled" | "unavailable";
  };
  aiSelection?: { candidateId: string | null; rationale: string };
};

export type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  product_type?: string;
  origins?: string;
  manufacturing_places?: string;
};

export type WineApiWineCandidate = {
  id: string;
  name: string;
  vintage: string | number | null;
  type: string | null;
  winery: string | { id?: string; name?: string } | null;
  region: string | { id?: string; name?: string; country?: string } | null;
  country: string | null;
  grapes?: Array<string | { name?: string }> | null;
};

export type WebSearchResult = { title: string; url: string; description: string };
