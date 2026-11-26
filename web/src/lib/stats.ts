import type { Bottle, CellarState, Review } from "@/lib/cellar";

export type CellarStats = {
  bottleCount: number;
  labelCount: number;
  shelfCount: number;
  totalCapacity: number;
  freePositions: number;
  occupiedPercent: number;
};

/** Garrafas ativas por vinho (wineId → quantidade). */
export function bottleCountsByWine(bottles: Bottle[]) {
  const counts = new Map<string, number>();
  bottles.forEach((bottle) => counts.set(bottle.wineId, (counts.get(bottle.wineId) ?? 0) + 1));
  return counts;
}

export function bottlesOnShelf(bottles: Bottle[], shelfId: string) {
  return bottles.filter((bottle) => bottle.shelfId === shelfId);
}

/** Números do resumo da adega. "Rótulos" conta só vinhos com pelo menos uma garrafa na adega. */
export function cellarStats(cellar: CellarState): CellarStats {
  const totalCapacity = cellar.shelves.reduce((sum, shelf) => sum + shelf.rows * shelf.columns, 0);
  const bottleCount = cellar.bottles.length;
  return {
    bottleCount,
    labelCount: bottleCountsByWine(cellar.bottles).size,
    shelfCount: cellar.shelves.length,
    totalCapacity,
    freePositions: totalCapacity - bottleCount,
    occupiedPercent: totalCapacity ? Math.round((bottleCount / totalCapacity) * 100) : 0,
  };
}

/** Média das notas de um vinho (só avaliações com nota). Null se ainda não há notas. */
export function averageRating(reviews: Review[], wineId: string) {
  const ratings = reviews
    .filter((review) => review.wineId === wineId && review.rating !== null)
    .map((review) => review.rating as number);
  if (!ratings.length) return null;
  return { average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length, count: ratings.length };
}

/** Ex.: "4,5 / 5 · 2 avaliações" ou "Ainda sem notas". */
export function formatAverageRating(reviews: Review[], wineId: string) {
  const result = averageRating(reviews, wineId);
  if (!result) return "Ainda sem notas";
  const average = result.average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${average} / 5 · ${result.count} ${result.count === 1 ? "avaliação" : "avaliações"}`;
}

/** Retorna a mensagem de erro, ou null se a avaliação é válida. */
export function validateReview(rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "A nota deve ser de 1 a 5 estrelas.";
  if (comment.length > 2000) return "O comentário deve ter no máximo 2000 caracteres.";
  return null;
}

export const MAX_REMOVAL_REASON_LENGTH = 2000;
