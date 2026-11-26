import type { Bottle, CellarState, Shelf } from "@/lib/cellar";
import type { MoveTarget } from "@/lib/move";
import type { PositionDraft } from "@/lib/shelf";
import type { WineDraft } from "@/lib/wine";

export type BarcodeSourceProvider = "user" | "open_food_facts" | "wineapi" | "web";
export type BarcodeAssociation = { ean13: string; sourceProvider: BarcodeSourceProvider; sourceUrl: string | null };

/**
 * Como o estado da adega muda depois de uma operação. É uma função do estado atual
 * para poder ser passada direto ao `setState` do React (atualização funcional).
 */
export type CellarUpdate = (current: CellarState) => CellarState;

export type ShelfInput = Omit<Shelf, "id">;

/**
 * Interface única de acesso aos dados da adega.
 * Implementações: Neon (`lib/neon/neon-repository.ts`) e demonstração local no navegador (`lib/local/local-repository.ts`).
 * Erros são lançados como `Error` com mensagem pronta para mostrar à pessoa.
 */
export interface CellarRepository {
  addBottles(draft: WineDraft, shelf: Shelf, positions: PositionDraft[], barcode?: BarcodeAssociation | null): Promise<CellarUpdate>;
  addShelf(shelf: ShelfInput): Promise<{ update: CellarUpdate; shelf: Shelf }>;
  updateShelf(shelfId: string, shelf: ShelfInput): Promise<CellarUpdate>;
  moveBottle(bottle: Bottle, target: MoveTarget, occupant?: Bottle): Promise<CellarUpdate>;
  removeBottle(bottle: Bottle, reason: string): Promise<CellarUpdate>;
  saveReview(bottle: Bottle, rating: number, comment: string): Promise<CellarUpdate>;
}
