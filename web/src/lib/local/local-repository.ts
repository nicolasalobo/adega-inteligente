import { STORAGE_KEY, type CellarState } from "@/lib/cellar";
import type { CellarRepository } from "@/lib/cellar-repository";
import {
  addBottlesLocally,
  addShelfLocally,
  defaultLocalContext,
  moveBottleLocally,
  removeBottleLocally,
  replaceShelfLocally,
  saveReviewLocally,
} from "@/lib/local/local-cellar";

/** Demonstração local: os dados ficam no estado do React e são salvos no localStorage pelo `useCellar`. */
export function createLocalRepository(context = defaultLocalContext): CellarRepository {
  return {
    async addBottles(draft, shelf, positions) {
      return (current) => addBottlesLocally(current, draft, shelf, positions, context);
    },
    async addShelf(input) {
      const shelf = { ...input, id: context.newId() };
      return { shelf, update: (current) => addShelfLocally(current, shelf) };
    },
    async updateShelf(shelfId, input) {
      const shelf = { ...input, id: shelfId };
      return (current) => replaceShelfLocally(current, shelf);
    },
    async moveBottle(bottle, target, occupant) {
      return (current) => moveBottleLocally(current, bottle, target, occupant, context);
    },
    async removeBottle(bottle, reason) {
      return (current) => removeBottleLocally(current, bottle, reason, context);
    },
    async saveReview(bottle, rating, comment) {
      return (current) => saveReviewLocally(current, bottle, rating, comment);
    },
  };
}

/** Adega salva neste navegador, ou null se não houver uma válida (nesse caso o que estiver salvo é apagado). */
export function readStoredCellar(): CellarState | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<CellarState>;
    if (
      Array.isArray(parsed.shelves) && parsed.shelves.length > 0 &&
      Array.isArray(parsed.wines) &&
      Array.isArray(parsed.bottles)
    ) {
      return parsed as CellarState;
    }
  } catch {
    // Invalid or unavailable browser storage falls back to the example cellar.
  }

  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled in this browser. */ }
  return null;
}

export function writeStoredCellar(cellar: CellarState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cellar)); } catch { /* Keep the demo usable when storage is unavailable. */ }
}
