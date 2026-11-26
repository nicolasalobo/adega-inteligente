import type { Wine } from "@/lib/cellar";
import type { IdentificationCandidate } from "@/lib/identification/contracts";

/** Ficha de vinho ainda não salva (sem id). */
export type WineDraft = Omit<Wine, "id">;

export const blankWine: WineDraft = {
  name: "",
  producer: "",
  vintage: "",
  country: "",
  region: "",
  grape: "",
  customValue: "",
};

/** Apara as pontas e junta espaços repetidos. Não muda maiúsculas/minúsculas. */
export function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function comparable(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

/** Mesmo vinho = mesmo nome, produtor e safra, ignorando espaços nas pontas e maiúsculas. */
export function sameWine(first: Wine, second: WineDraft) {
  return (
    comparable(first.name) === comparable(second.name) &&
    comparable(first.producer) === comparable(second.producer) &&
    comparable(first.vintage) === comparable(second.vintage)
  );
}

export function findDuplicateWine(wines: Wine[], draft: WineDraft) {
  return wines.find((wine) => sameWine(wine, draft));
}

/** Texto comparável na busca: sem acentos, sem espaços nas pontas e em minúsculas ("França " → "franca"). */
export function normalizeForSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("pt-BR");
}

/**
 * Busca em nome, produtor, safra, país, região e uva, sem diferenciar maiúsculas nem acentos
 * ("Franca" encontra "França"). Busca vazia aceita tudo.
 */
export function matchesSearch(wine: Wine, query: string) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  const searchable = normalizeForSearch([wine.name, wine.producer, wine.vintage, wine.country, wine.region, wine.grape].join(" "));
  return searchable.includes(normalizedQuery);
}

/** Limpa todos os campos de texto da ficha antes de salvar. */
export function cleanWineDraft(draft: WineDraft): WineDraft {
  return {
    name: cleanText(draft.name),
    producer: cleanText(draft.producer),
    vintage: cleanText(draft.vintage),
    country: cleanText(draft.country),
    region: cleanText(draft.region),
    grape: cleanText(draft.grape),
    customValue: cleanText(draft.customValue ?? ""),
  };
}

/** "Malbec, Syrah / Merlot" → ["Malbec", "Syrah", "Merlot"]. */
export function splitGrapes(value: string) {
  return value.split(/[,;/]/).map((grape) => cleanText(grape)).filter(Boolean);
}

/** Formato que a RPC `register_wine_bottles` espera em `p_wine`. */
export function wineRpcPayload(draft: WineDraft) {
  return {
    name: cleanText(draft.name),
    producer: cleanText(draft.producer),
    vintage: cleanText(draft.vintage),
    country: cleanText(draft.country),
    region: cleanText(draft.region),
    grapes: splitGrapes(draft.grape),
    custom_value: cleanText(draft.customValue ?? ""),
  };
}

/**
 * Vinho usado para validar a regra da prateleira durante o cadastro:
 * campos preenchidos na ficha têm prioridade; os vazios vêm da ficha já existente, se houver.
 */
export function mergeDraftWithExisting(draft: WineDraft, existing?: Wine): Wine {
  return {
    id: existing?.id ?? "draft",
    name: draft.name || existing?.name || "",
    producer: draft.producer || existing?.producer || "",
    vintage: draft.vintage || existing?.vintage || "",
    country: draft.country || existing?.country || "",
    region: draft.region || existing?.region || "",
    grape: draft.grape || existing?.grape || "",
    customValue: draft.customValue || existing?.customValue || "",
  };
}

/** Ficha a partir de um candidato do EAN/foto. Tudo continua editável e sujeito a revisão. */
export function draftFromIdentificationCandidate(candidate: IdentificationCandidate): WineDraft {
  return {
    ...blankWine,
    name: candidate.name,
    producer: candidate.producer,
    vintage: candidate.vintage,
    country: candidate.country,
    region: candidate.region,
    grape: candidate.grape,
  };
}
