import type { Bottle, CellarState, Shelf, Wine } from "../../src/lib/cellar";

export function wine(overrides: Partial<Wine> = {}): Wine {
  return { id: "w1", name: "Malbec Reserva", producer: "Bodega del Valle", vintage: "2020", country: "Argentina", region: "Mendoza", grape: "Malbec", customValue: "", ...overrides };
}

export function bottle(overrides: Partial<Bottle> = {}): Bottle {
  return { id: "b1", wineId: "w1", shelfId: "s1", row: 1, column: 1, ...overrides };
}

export const freeShelf: Shelf = { id: "s1", name: "Adega principal", rows: 2, columns: 3, organization: "free" };

/** 2 linhas × 3 colunas, uma coluna por país. */
export const countryColumnsShelf: Shelf = {
  id: "s2",
  name: "Por país",
  rows: 2,
  columns: 3,
  organization: "structured",
  rule: { criterion: "country", axis: "column", values: ["Brasil", "Argentina", "França"] },
};

export function cellar(overrides: Partial<CellarState> = {}): CellarState {
  return { shelves: [freeShelf, countryColumnsShelf], wines: [wine()], bottles: [], movements: [], reviews: [], ...overrides };
}

let counter = 0;
export const fixedContext = { newId: () => `id-${++counter}`, now: () => "2026-11-26T12:00:00.000Z" };
export function resetIds() { counter = 0; }
