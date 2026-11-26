"use client";

import type { Bottle, CellarState, Wine } from "@/lib/cellar";
import { formatMovementPosition, movementTypeLabel, responsibleLabel, visibleMovements } from "@/lib/history";

/** Lista de movimentações, trocas e retiradas, com a avaliação da garrafa quando houver. */
export function HistoryView({
  cellar,
  wineById,
  search,
  currentUserId,
  currentEmail,
  onReview,
}: {
  cellar: CellarState;
  wineById: Map<string, Wine>;
  search: string;
  currentUserId: string | null;
  currentEmail: string;
  onReview: (bottle: Bottle) => void;
}) {
  const movements = visibleMovements(cellar.movements ?? [], wineById, search);
  const position = (shelfId: string | null, row: number | null, column: number | null) => formatMovementPosition(cellar.shelves, shelfId, row, column);
  return (
    <div className="history-list">
      {movements.map(m => {
        const wine = wineById.get(m.wineId);
        const review = (cellar.reviews ?? []).find(r => r.bottleId === m.bottleId);
        const responsible = responsibleLabel(m.actorId, currentUserId, currentEmail);
        return <article className="history-item" key={m.id}><div><strong>{wine?.name ?? "Vinho"}</strong><small>{wine?.producer} · {new Date(m.createdAt).toLocaleString("pt-BR")}</small><p>{movementTypeLabel(m.type)}: {position(m.fromShelfId, m.fromRow, m.fromColumn)}{m.type !== "remove" && <> → {position(m.toShelfId, m.toRow, m.toColumn)}</>}</p><p>Responsável: {responsible}</p>{m.reason && <p>Motivo: {m.reason}</p>}{review && <p>Avaliação: {review.rating ? `${review.rating} / 5` : "sem nota"}{review.comment && ` · ${review.comment}`}</p>}</div><button className="secondary-button" onClick={() => onReview({ id: m.bottleId, wineId: m.wineId, shelfId: m.fromShelfId, row: m.fromRow, column: m.fromColumn })}>{review ? "Editar avaliação" : "Avaliar"}</button></article>;
      })}
      {!movements.length && <div className="empty-list">Nenhuma movimentação encontrada.</div>}
    </div>
  );
}
