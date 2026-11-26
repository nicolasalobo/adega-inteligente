import type { Bottle, CellarState, Shelf, Wine } from "@/lib/cellar";
import { positionKey } from "@/lib/cellar";
import { matchesSearch, normalizeForSearch, splitGrapes } from "@/lib/wine";

/** Filtros da tela "Encontrar vinho". `country` e `grape` são chaves normalizadas (ver `normalizeForSearch`). */
export type WineFilters = { query: string; country: string | null; grape: string | null };

export const noFilters: WineFilters = { query: "", country: null, grape: null };

export type FilterOption = { key: string; label: string; bottleCount: number };

export type BottleLocation = { bottle: Bottle; shelf: Shelf; key: string; label: string };

/** Ex.: "Adega principal · Linha 4 · Coluna 7". */
export function formatBottleLocation(shelf: Shelf, bottle: Bottle) {
  return `${shelf.name} · Linha ${bottle.row} · Coluna ${bottle.column}`;
}

export function wineMatchesFilters(wine: Wine, filters: WineFilters) {
  if (!matchesSearch(wine, filters.query)) return false;
  if (filters.country && normalizeForSearch(wine.country) !== filters.country) return false;
  if (filters.grape && !splitGrapes(wine.grape).some((grape) => normalizeForSearch(grape) === filters.grape)) return false;
  return true;
}

/** Vinhos que passam na busca e nos filtros, em ordem alfabética. */
export function findWines(wines: Wine[], filters: WineFilters) {
  return wines
    .filter((wine) => wineMatchesFilters(wine, filters))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

/**
 * Opções dos filtros rápidos: só países e uvas de vinhos com garrafa na adega,
 * com a quantidade de garrafas, do maior para o menor. "frança" e "França" contam juntos.
 */
export function filterOptions(cellar: CellarState) {
  const wineById = new Map(cellar.wines.map((wine) => [wine.id, wine] as const));
  const countries = new Map<string, FilterOption>();
  const grapes = new Map<string, FilterOption>();
  const add = (options: Map<string, FilterOption>, label: string) => {
    const key = normalizeForSearch(label);
    if (!key) return;
    const option = options.get(key) ?? { key, label: label.trim(), bottleCount: 0 };
    option.bottleCount += 1;
    options.set(key, option);
  };
  cellar.bottles.forEach((bottle) => {
    const wine = wineById.get(bottle.wineId);
    if (!wine) return;
    add(countries, wine.country);
    new Set(splitGrapes(wine.grape)).forEach((grape) => add(grapes, grape));
  });
  const sorted = (options: Map<string, FilterOption>) =>
    [...options.values()].sort((a, b) => b.bottleCount - a.bottleCount || a.label.localeCompare(b.label, "pt-BR"));
  return { countries: sorted(countries), grapes: sorted(grapes) };
}

/** Onde está cada garrafa do vinho, na ordem das prateleiras, linha e coluna. */
export function bottleLocations(cellar: CellarState, wineId: string): BottleLocation[] {
  const shelfOrder = new Map(cellar.shelves.map((shelf, index) => [shelf.id, index] as const));
  const shelfById = new Map(cellar.shelves.map((shelf) => [shelf.id, shelf] as const));
  return cellar.bottles
    .filter((bottle) => bottle.wineId === wineId && shelfById.has(bottle.shelfId))
    .sort((a, b) => (shelfOrder.get(a.shelfId)! - shelfOrder.get(b.shelfId)!) || a.row - b.row || a.column - b.column)
    .map((bottle) => {
      const shelf = shelfById.get(bottle.shelfId)!;
      return { bottle, shelf, key: positionKey(bottle.shelfId, bottle.row, bottle.column), label: formatBottleLocation(shelf, bottle) };
    });
}
