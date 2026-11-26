import type { Movement, Shelf, Wine } from "@/lib/cellar";
import { matchesSearch } from "@/lib/wine";

/** Movimentações cujo vinho ainda existe e combina com a busca. */
export function visibleMovements(movements: Movement[], wineById: Map<string, Wine>, search: string) {
  return movements.filter((movement) => {
    const wine = wineById.get(movement.wineId);
    return wine && matchesSearch(wine, search);
  });
}

export function movementTypeLabel(type: Movement["type"]) {
  return type === "remove" ? "Retirada" : type === "swap" ? "Troca" : "Movimentação";
}

/** Ex.: "Adega principal · L2 / C5", ou "—" quando não há posição (destino de uma retirada). */
export function formatMovementPosition(shelves: Shelf[], shelfId: string | null, row: number | null, column: number | null) {
  return shelfId ? `${shelves.find((shelf) => shelf.id === shelfId)?.name ?? "Prateleira"} · L${row} / C${column}` : "—";
}

/** Quem fez a movimentação, do ponto de vista da conta conectada. */
export function responsibleLabel(actorId: string | null, currentUserId: string | null, currentEmail: string) {
  if (!actorId) return "Demonstração local";
  return actorId === currentUserId ? (currentEmail || "Você") : "Outro responsável";
}
