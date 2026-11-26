import {
  categoryForWine,
  positionKey,
  wineMatchesCategory,
  type Bottle,
  type Shelf,
  type ShelfAxis,
  type Wine,
  type WineCriterion,
} from "@/lib/cellar";

/** Uma posição física da prateleira: linha e coluna começam em 1. */
export type PositionDraft = { row: number; column: number; key: string };

export const criterionNames: Record<WineCriterion, string> = {
  country: "País",
  region: "Região",
  grape: "Uva",
  vintage: "Safra",
  custom: "Campo personalizado",
};

/** Todas as posições da prateleira, linha por linha, da esquerda para a direita. */
export function shelfPositions(shelf: Shelf): PositionDraft[] {
  return Array.from({ length: shelf.rows * shelf.columns }, (_, index) => {
    const row = Math.floor(index / shelf.columns) + 1;
    const column = (index % shelf.columns) + 1;
    return { row, column, key: positionKey(shelf.id, row, column) };
  });
}

/** Valor da regra (ex.: o país) para a linha ou coluna desta posição. */
export function ruleValueAt(shelf: Shelf, row: number, column: number) {
  const rule = shelf.rule;
  if (!rule) return undefined;
  return rule.values[(rule.axis === "row" ? row : column) - 1];
}

/** A garrafa deste vinho pode ficar nesta posição? Sem regra, qualquer vinho cabe. */
export function wineFitsPosition(wine: Wine | undefined, shelf: Shelf, row: number, column: number) {
  const rule = shelf.rule;
  return !rule || (!!wine && wineMatchesCategory(wine, rule.criterion, ruleValueAt(shelf, row, column) ?? ""));
}

/** Valor que o vinho tem no critério da regra da prateleira ("" se a prateleira não tem regra). */
export function wineRuleValue(wine: Wine, shelf: Shelf) {
  return shelf.rule ? categoryForWine(wine, shelf.rule.criterion) : "";
}

/** Prateleira organizada por regra, mas o vinho não tem o campo que a regra usa. */
export function isMissingRuleValue(wine: Wine, shelf: Shelf) {
  return shelf.organization === "structured" && !wineRuleValue(wine, shelf).trim();
}

/** Posições livres e compatíveis com a regra da prateleira para este vinho. */
export function eligiblePositions(shelf: Shelf, wine: Wine, occupiedKeys: Set<string>) {
  return shelfPositions(shelf).filter((position) => {
    if (occupiedKeys.has(position.key)) return false;
    if (shelf.organization !== "structured") return true;
    if (!shelf.rule || isMissingRuleValue(wine, shelf)) return false;
    return wineMatchesCategory(wine, shelf.rule.criterion, ruleValueAt(shelf, position.row, position.column) ?? "");
  });
}

export function occupiedPositionKeys(bottles: Bottle[]) {
  return new Set(bottles.map((bottle) => positionKey(bottle.shelfId, bottle.row, bottle.column)));
}

/** Campo da ficha usado pela regra desta prateleira, se houver. */
export function isRuleField(shelf: Shelf | undefined, field: "country" | "region" | "grape" | "vintage" | "customValue") {
  if (shelf?.organization !== "structured" || !shelf.rule) return false;
  return shelf.rule.criterion === (field === "customValue" ? "custom" : field);
}

/** Garrafa que ficaria fora do grid se a prateleira encolhesse para este tamanho. */
export function findOutOfBoundsBottle(bottles: Bottle[], shelfId: string, rows: number, columns: number) {
  return bottles.find((bottle) => bottle.shelfId === shelfId && (bottle.row > rows || bottle.column > columns));
}

/** "Brasil, França , , Itália" → ["Brasil", "França", "Itália"]. */
export function parseRuleValues(input: string) {
  return input.split(",").map((value) => value.trim()).filter(Boolean);
}

/** Quantos valores a regra precisa: um por linha ou um por coluna. */
export function requiredRuleValueCount(axis: ShelfAxis, rows: number, columns: number) {
  return axis === "row" ? rows : columns;
}
