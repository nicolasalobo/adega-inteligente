import { blankWine, type WineDraft } from "@/lib/wine";

export type WineApiReference = string | { id?: string; name?: string; country?: string } | null;

/** Resultado da busca em `/api/wineapi/search`. */
export type WineCatalogCandidate = {
  id: string;
  name: string;
  vintage: string | number | null;
  type: string | null;
  winery: WineApiReference;
  region: WineApiReference;
  country: string | null;
};

/** Ficha completa em `/api/wineapi/wines/[id]`. */
export type WineCatalogDetail = {
  error?: string;
  name?: string;
  vintage?: string | number | null;
  winery?: WineApiReference;
  region?: WineApiReference;
  country?: string | null;
  grapes?: Array<string | { name?: string }> | null;
};

export function catalogReferenceName(value: WineApiReference | undefined) {
  return typeof value === "string" ? value : value?.name ?? "";
}

/** "Região · País" do candidato, sem partes vazias. */
export function catalogCandidateLocation(candidate: WineCatalogCandidate) {
  return [catalogReferenceName(candidate.region), candidate.country].filter(Boolean).join(" · ");
}

/**
 * Monta a ficha a partir da WineAPI. Dados da ficha completa têm prioridade sobre os do resultado da busca.
 * Campo que a WineAPI não informa fica vazio para a pessoa preencher.
 */
export function draftFromCatalog(detail: WineCatalogDetail, candidate: WineCatalogCandidate): WineDraft {
  const regionCountry = typeof detail.region === "object" && detail.region ? detail.region.country : "";
  const grapes = Array.isArray(detail.grapes)
    ? detail.grapes.map((grape) => typeof grape === "string" ? grape : grape.name ?? "").filter(Boolean).join(", ")
    : "";
  return {
    ...blankWine,
    name: detail.name ?? candidate.name,
    producer: catalogReferenceName(detail.winery) || catalogReferenceName(candidate.winery),
    vintage: detail.vintage == null ? (candidate.vintage == null ? "" : String(candidate.vintage)) : String(detail.vintage),
    country: detail.country ?? regionCountry ?? candidate.country ?? "",
    region: catalogReferenceName(detail.region) || catalogReferenceName(candidate.region),
    grape: grapes,
  };
}

export async function searchWineCatalog(accessToken: string, query: string) {
  const response = await fetch(`/api/wineapi/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json() as { results?: WineCatalogCandidate[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Não foi possível pesquisar vinhos.");
  return data.results ?? [];
}

export async function fetchWineCatalogDetail(accessToken: string, id: string) {
  const response = await fetch(`/api/wineapi/wines/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json() as WineCatalogDetail;
  if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dados desse vinho.");
  return data;
}
