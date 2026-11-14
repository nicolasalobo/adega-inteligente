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
  const [shelfResult, wineResult, bottleResult] = await Promise.all([
    client.from("shelves").select("*").eq("cellar_id", cellarId).order("created_at"),
    client.from("wines").select("*").eq("cellar_id", cellarId).order("created_at", { ascending: false }),
    client.from("bottles").select("id,wine_id,shelf_id,row_number,column_number").eq("cellar_id", cellarId).eq("status", "active"),
  ]);

  if (shelfResult.error) throw shelfResult.error;
  if (wineResult.error) throw wineResult.error;
  if (bottleResult.error) throw bottleResult.error;

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
  const bottles: Bottle[] = ((bottleResult.data ?? []) as BottleRow[]).map((row) => ({
    id: row.id,
    wineId: row.wine_id,
    shelfId: row.shelf_id,
    row: row.row_number,
    column: row.column_number,
  }));

  return { shelves, wines, bottles };
}
