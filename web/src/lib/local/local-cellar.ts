import type { Bottle, CellarState, Movement, Shelf, Wine } from "@/lib/cellar";
import type { MoveTarget } from "@/lib/move";
import type { PositionDraft } from "@/lib/shelf";
import { cleanWineDraft, findDuplicateWine, type WineDraft } from "@/lib/wine";

/**
 * Operações da demonstração local, como funções puras sobre o estado.
 * `newId` e `now` são parâmetros para os testes poderem fixar os valores.
 */
export type LocalContext = { newId: () => string; now: () => string };

export const defaultLocalContext: LocalContext = {
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

/** Adiciona garrafas; reaproveita a ficha se já existir o mesmo vinho. */
export function addBottlesLocally(state: CellarState, draft: WineDraft, shelf: Shelf, positions: PositionDraft[], context = defaultLocalContext): CellarState {
  const existingWine = findDuplicateWine(state.wines, draft);
  const wine: Wine = existingWine ?? { id: context.newId(), ...cleanWineDraft(draft) };
  const newBottles: Bottle[] = positions.map((position) => ({
    id: context.newId(),
    wineId: wine.id,
    shelfId: shelf.id,
    row: position.row,
    column: position.column,
  }));
  return {
    ...state,
    wines: existingWine ? state.wines : [...state.wines, wine],
    bottles: [...state.bottles, ...newBottles],
  };
}

export function addShelfLocally(state: CellarState, shelf: Shelf): CellarState {
  return { ...state, shelves: [...state.shelves, shelf] };
}

export function replaceShelfLocally(state: CellarState, shelf: Shelf): CellarState {
  return { ...state, shelves: state.shelves.map((item) => item.id === shelf.id ? shelf : item) };
}

function movementRecord(bottle: Bottle, type: Movement["type"], to: { shelfId: string; row: number; column: number } | null, reason: string | null, id: string, createdAt: string): Movement {
  return {
    id,
    bottleId: bottle.id,
    wineId: bottle.wineId,
    type,
    fromShelfId: bottle.shelfId,
    fromRow: bottle.row,
    fromColumn: bottle.column,
    toShelfId: to?.shelfId ?? null,
    toRow: to?.row ?? null,
    toColumn: to?.column ?? null,
    reason,
    actorId: null,
    createdAt,
  };
}

/** Move a garrafa; se houver ocupante, troca as duas e registra dois eventos "swap". */
export function moveBottleLocally(state: CellarState, bottle: Bottle, target: MoveTarget, occupant: Bottle | undefined, context = defaultLocalContext): CellarState {
  const now = context.now();
  const destination = { shelfId: target.shelf.id, row: target.row, column: target.column };
  const origin = { shelfId: bottle.shelfId, row: bottle.row, column: bottle.column };
  const events = [
    movementRecord(bottle, occupant ? "swap" : "move", destination, null, context.newId(), now),
    ...(occupant ? [movementRecord(occupant, "swap", origin, null, context.newId(), now)] : []),
  ];
  return {
    ...state,
    bottles: state.bottles.map((item) =>
      item.id === bottle.id ? { ...item, ...destination }
        : item.id === occupant?.id ? { ...item, ...origin }
          : item,
    ),
    movements: [...events, ...(state.movements ?? [])],
  };
}

/** Retira a garrafa (libera a posição) e registra o motivo, se houver. */
export function removeBottleLocally(state: CellarState, bottle: Bottle, reason: string, context = defaultLocalContext): CellarState {
  return {
    ...state,
    bottles: state.bottles.filter((item) => item.id !== bottle.id),
    movements: [movementRecord(bottle, "remove", null, reason.trim() || null, context.newId(), context.now()), ...(state.movements ?? [])],
  };
}

/** Uma avaliação por garrafa: salvar de novo substitui a anterior. */
export function saveReviewLocally(state: CellarState, bottle: Bottle, rating: number, comment: string): CellarState {
  return {
    ...state,
    reviews: [
      ...(state.reviews ?? []).filter((item) => item.bottleId !== bottle.id),
      { bottleId: bottle.id, wineId: bottle.wineId, rating, comment: comment.trim() || null },
    ],
  };
}
