import type { Bottle, CellarState, Shelf } from "@/lib/cellar";
import { wineFitsPosition } from "@/lib/shelf";

export type MoveTarget = { shelf: Shelf; row: number; column: number };

export type MovePlan =
  | { ok: true; target: MoveTarget; occupant?: Bottle }
  | { ok: false; message: string };

/** Texto sugerido no campo de destino: "Prateleira/linha/coluna" da posição atual. */
export function moveDestinationText(shelf: Shelf, bottle: Bottle) {
  return `${shelf.name}/${bottle.row}/${bottle.column}`;
}

/** Lê "nome da prateleira/linha/coluna" (nome sem diferenciar maiúsculas). Retorna null se for inválido. */
export function parseMoveDestination(input: string, shelves: Shelf[]): MoveTarget | null {
  const [shelfName, rowText, columnText] = input.split("/").map((part) => part.trim());
  const shelf = shelves.find((item) => item.name.toLocaleLowerCase("pt-BR") === shelfName.toLocaleLowerCase("pt-BR"));
  const row = Number(rowText);
  const column = Number(columnText);
  if (!shelf || !Number.isInteger(row) || !Number.isInteger(column) || row < 1 || row > shelf.rows || column < 1 || column > shelf.columns) {
    return null;
  }
  return { shelf, row, column };
}

/**
 * Decide se a garrafa pode ir para o destino informado.
 * Se o destino estiver ocupado, vira uma troca: as duas garrafas precisam caber na posição da outra.
 */
export function planMove(cellar: CellarState, bottle: Bottle, sourceShelf: Shelf, destinationInput: string): MovePlan {
  const target = parseMoveDestination(destinationInput, cellar.shelves);
  if (!target) return { ok: false, message: "Destino inválido. Use nome da prateleira/linha/coluna." };
  if (target.shelf.id === bottle.shelfId && target.row === bottle.row && target.column === bottle.column) {
    return { ok: false, message: "A garrafa já está nessa posição." };
  }

  const findWine = (wineId: string) => cellar.wines.find((wine) => wine.id === wineId);
  const occupant = cellar.bottles.find((item) =>
    item.id !== bottle.id && item.shelfId === target.shelf.id && item.row === target.row && item.column === target.column,
  );
  const movingFits = wineFitsPosition(findWine(bottle.wineId), target.shelf, target.row, target.column);
  const occupantFits = !occupant || wineFitsPosition(findWine(occupant.wineId), sourceShelf, bottle.row, bottle.column);
  if (!movingFits || !occupantFits) return { ok: false, message: "A posição não aceita a categoria deste vinho." };

  return { ok: true, target, ...(occupant ? { occupant } : {}) };
}
