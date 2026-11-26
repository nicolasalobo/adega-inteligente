import type { CellarRepository, ShelfInput } from "@/lib/cellar-repository";
import { fetchCellarInventory, shelfFromDatabase } from "@/lib/neon/cellar-data";
import type { NeonBrowserClient } from "@/lib/neon/client";
import { wineRpcPayload } from "@/lib/wine";

function shelfColumns(shelf: ShelfInput) {
  return {
    name: shelf.name,
    row_count: shelf.rows,
    column_count: shelf.columns,
    organization: shelf.organization,
    rule_criterion: shelf.rule?.criterion ?? null,
    rule_axis: shelf.rule?.axis ?? null,
    rule_values: shelf.rule?.values ?? null,
  };
}

/**
 * Adega na conta Neon. As regras (posição única, regra da prateleira, histórico) são garantidas pelas RPCs no banco.
 * Depois de cada escrita em garrafas, a adega é recarregada do banco.
 */
export function createNeonRepository(client: NeonBrowserClient, cellarId: string): CellarRepository {
  async function reload() {
    const inventory = await fetchCellarInventory(client, cellarId);
    return () => inventory;
  }

  return {
    async addBottles(draft, shelf, positions, barcode) {
      const rpc = barcode ? "register_wine_bottles_with_barcode" : "register_wine_bottles";
      const { error } = await client.rpc(rpc, {
        p_cellar_id: cellarId,
        p_shelf_id: shelf.id,
        p_wine: wineRpcPayload(draft),
        p_positions: positions.map(({ row, column }) => ({ row, column })),
        ...(barcode ? {
          p_ean13: barcode.ean13,
          p_source_provider: barcode.sourceProvider,
          p_source_url: barcode.sourceUrl,
        } : {}),
      });
      if (error) {
        if (error.code === "23505") throw new Error("Uma dessas posições acabou de ser ocupada. Escolha outras posições livres.");
        if (error.code === "23514") throw new Error("A prateleira rejeitou a posição ou a categoria do vinho. Confira os dados e tente de novo.");
        throw new Error(error.message || "Não foi possível salvar as garrafas.");
      }
      return reload();
    },

    async addShelf(input) {
      const { data, error } = await client.from("shelves").insert({ cellar_id: cellarId, ...shelfColumns(input) }).select("*").single();
      if (error) throw new Error(error.message || "Não foi possível criar a prateleira.");
      const shelf = shelfFromDatabase(data);
      return { shelf, update: (current) => ({ ...current, shelves: [...current.shelves, shelf] }) };
    },

    async updateShelf(shelfId, input) {
      const { data, error } = await client.from("shelves").update(shelfColumns(input)).eq("id", shelfId).select("*").single();
      if (error) throw new Error(error.message || "Não foi possível atualizar a prateleira.");
      const shelf = shelfFromDatabase(data);
      return (current) => ({ ...current, shelves: current.shelves.map((item) => item.id === shelfId ? shelf : item) });
    },

    async moveBottle(bottle, target, occupant) {
      const { error } = occupant
        ? await client.rpc("swap_bottles", { p_cellar_id: cellarId, p_first: bottle.id, p_second: occupant.id })
        : await client.rpc("move_bottle", { p_cellar_id: cellarId, p_bottle_id: bottle.id, p_shelf_id: target.shelf.id, p_row: target.row, p_column: target.column });
      if (error) throw new Error(error.code === "23505" ? "Essa posição já está ocupada." : error.message);
      return reload();
    },

    async removeBottle(bottle, reason) {
      const { error } = await client.rpc("remove_bottle", { p_cellar_id: cellarId, p_bottle_id: bottle.id, p_reason: reason || null });
      if (error) throw new Error(error.message);
      return reload();
    },

    async saveReview(bottle, rating, comment) {
      const { error } = await client.from("bottle_reviews").upsert(
        { cellar_id: cellarId, bottle_id: bottle.id, rating, comment: comment.trim() || null, updated_at: new Date().toISOString() },
        { onConflict: "bottle_id" },
      );
      if (error) throw new Error(error.message || "Não foi possível salvar a avaliação.");
      return reload();
    },
  };
}
