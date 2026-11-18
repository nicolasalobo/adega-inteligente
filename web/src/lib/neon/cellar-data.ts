import type { Bottle, CellarState, Shelf, Wine } from "@/lib/cellar";
import type { NeonBrowserClient } from "@/lib/neon/client";

type ShelfRow = {
  id: string;
  name: string;
  row_count: number;
  column_count: number;
  organization: "free" | "structured";
  rule_criterion: "country" | "region" | "grape" | "vintage" | "custom" | null;
  rule_axis: "row" | "column" | null;
  rule_values: string[] | null;
};

type WineRow = {
  id: string;
  name: string;
  producer: string;
  vintage: string | null;
  country: string | null;
  region: string | null;
  grapes: string[];
  custom_value: string | null;
};

type BottleRow = {
  id: string;
  wine_id: string;
  shelf_id: string;
  row_number: number;
  column_number: number;
  status: string;
};

export function shelfFromDatabase(row: ShelfRow): Shelf {
  return {
    id: row.id,
    name: row.name,
    rows: row.row_count,
    columns: row.column_count,
    organization: row.organization,
    ...(row.organization === "structured" && row.rule_criterion && row.rule_axis
      ? { rule: { criterion: row.rule_criterion, axis: row.rule_axis, values: row.rule_values ?? [] } }
      : {}),
  };
}

export async function fetchCellarInventory(client: NeonBrowserClient, cellarId: string): Promise<CellarState> {
  const [shelfResult, wineResult, bottleResult, movementResult, reviewResult] = await Promise.all([
    client.from("shelves").select("*").eq("cellar_id", cellarId).order("created_at"),
    client.from("wines").select("*").eq("cellar_id", cellarId).order("created_at", { ascending: false }),
    client.from("bottles").select("id,wine_id,shelf_id,row_number,column_number,status").eq("cellar_id", cellarId),
    client.from("bottle_movements").select("*").eq("cellar_id", cellarId).order("created_at", { ascending: false }),
    client.from("bottle_reviews").select("*").eq("cellar_id", cellarId),
  ]);

  if (shelfResult.error) throw shelfResult.error;
  if (wineResult.error) throw wineResult.error;
  if (bottleResult.error) throw bottleResult.error;
  if (movementResult.error) throw movementResult.error;
  if (reviewResult.error) throw reviewResult.error;

  const shelves: Shelf[] = ((shelfResult.data ?? []) as ShelfRow[]).map(shelfFromDatabase);
  const wines: Wine[] = ((wineResult.data ?? []) as WineRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    producer: row.producer,
    vintage: row.vintage ?? "",
    country: row.country ?? "",
    region: row.region ?? "",
    grape: (row.grapes ?? []).join(", "),
    customValue: row.custom_value ?? "",
  }));
  const allBottles = (bottleResult.data ?? []) as BottleRow[];
  const wineByBottle = new Map(allBottles.map(b => [b.id, b.wine_id]));
  const bottles: Bottle[] = allBottles.filter(b => b.status === "active").map((row) => ({
    id: row.id,
    wineId: row.wine_id,
    shelfId: row.shelf_id,
    row: row.row_number,
    column: row.column_number,
  }));

  const movements = (movementResult.data ?? []).map(m => ({ id: m.id as string, bottleId: m.bottle_id as string, wineId: wineByBottle.get(m.bottle_id) ?? "", type: m.movement_type as "move" | "remove", fromShelfId: m.from_shelf_id as string, fromRow: m.from_row as number, fromColumn: m.from_column as number, toShelfId: m.to_shelf_id as string | null, toRow: m.to_row as number | null, toColumn: m.to_column as number | null, reason: m.reason as string | null, createdAt: m.created_at as string }));
  const reviews = (reviewResult.data ?? []).map(r => ({ bottleId: r.bottle_id as string, wineId: wineByBottle.get(r.bottle_id) ?? "", rating: r.rating as number | null, comment: r.comment as string | null }));
  return { shelves, wines, bottles, movements, reviews };
}
