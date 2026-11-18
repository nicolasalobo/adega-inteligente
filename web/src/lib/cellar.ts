export type WineCriterion = "country" | "region" | "grape" | "vintage" | "custom";
export type ShelfAxis = "row" | "column";

export type Wine = {
  id: string;
  name: string;
  producer: string;
  vintage: string;
  country: string;
  region: string;
  grape: string;
  customValue?: string;
};

export type Shelf = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  organization: "free" | "structured";
  rule?: {
    criterion: WineCriterion;
    axis: ShelfAxis;
    values: string[];
  };
};

export type Bottle = {
  id: string;
  wineId: string;
  shelfId: string;
  row: number;
  column: number;
};

export type Movement = { id: string; bottleId: string; wineId: string; type: "move" | "remove"; fromShelfId: string; fromRow: number; fromColumn: number; toShelfId: string | null; toRow: number | null; toColumn: number | null; reason: string | null; createdAt: string };
export type Review = { bottleId: string; wineId: string; rating: number | null; comment: string | null };
export type CellarState = {
  movements?: Movement[];
  reviews?: Review[];
  shelves: Shelf[];
  wines: Wine[];
  bottles: Bottle[];
};

export const STORAGE_KEY = "adega-inteligente:local-prototype:v1";

const sampleWines: Wine[] = [
  {
    id: "wine-serra-malbec",
    name: "Malbec de altitude",
    producer: "Serra Clara",
    vintage: "2021",
    country: "Brasil",
    region: "Campanha Gaúcha",
    grape: "Malbec",
  },
  {
    id: "wine-cabernet-franc",
    name: "Cabernet Franc Reserva",
    producer: "Casa do Vale",
    vintage: "2020",
    country: "Brasil",
    region: "Serra Gaúcha",
    grape: "Cabernet Franc",
  },
  {
    id: "wine-pinot-noir",
    name: "Pinot Noir",
    producer: "Domaine des Pins",
    vintage: "2019",
    country: "França",
    region: "Borgonha",
    grape: "Pinot Noir",
  },
  {
    id: "wine-rioja",
    name: "Crianza",
    producer: "Bodega del Camino",
    vintage: "2018",
    country: "Espanha",
    region: "Rioja",
    grape: "Tempranillo",
  },
  {
    id: "wine-chardonnay",
    name: "Chardonnay de barrica",
    producer: "Monte das Nuvens",
    vintage: "2022",
    country: "Brasil",
    region: "Serra da Mantiqueira",
    grape: "Chardonnay",
  },
  {
    id: "wine-syrah",
    name: "Syrah Reserva",
    producer: "Viña del Horizonte",
    vintage: "2020",
    country: "Chile",
    region: "Vale do Colchagua",
    grape: "Syrah",
  },
  {
    id: "wine-blend",
    name: "Corte da Casa",
    producer: "Adega do Ipê",
    vintage: "2017",
    country: "Portugal",
    region: "Alentejo",
    grape: "Aragonez, Alicante Bouschet",
  },
];

export function createExampleCellar(): CellarState {
  const shelves: Shelf[] = [
    {
      id: "shelf-main",
      name: "Adega principal",
      rows: 5,
      columns: 10,
      organization: "free",
    },
    {
      id: "shelf-white",
      name: "Brancos & especiais",
      rows: 3,
      columns: 8,
      organization: "free",
    },
  ];

  const bottles: Bottle[] = [];
  const firstShelfWineIds = [
    sampleWines[0].id,
    sampleWines[1].id,
    sampleWines[2].id,
    sampleWines[3].id,
    sampleWines[5].id,
    sampleWines[0].id,
    sampleWines[6].id,
    sampleWines[2].id,
    sampleWines[1].id,
    sampleWines[4].id,
    sampleWines[3].id,
    sampleWines[0].id,
    sampleWines[5].id,
    sampleWines[6].id,
    sampleWines[1].id,
    sampleWines[2].id,
    sampleWines[4].id,
    sampleWines[0].id,
    sampleWines[3].id,
    sampleWines[5].id,
    sampleWines[6].id,
    sampleWines[1].id,
  ];

  firstShelfWineIds.forEach((wineId, index) => {
    bottles.push({
      id: `sample-bottle-main-${index + 1}`,
      wineId,
      shelfId: shelves[0].id,
      row: Math.floor(index / shelves[0].columns) + 1,
      column: (index % shelves[0].columns) + 1,
    });
  });

  [sampleWines[4].id, sampleWines[2].id, sampleWines[4].id, sampleWines[0].id].forEach(
    (wineId, index) => {
      bottles.push({
        id: `sample-bottle-white-${index + 1}`,
        wineId,
        shelfId: shelves[1].id,
        row: Math.floor(index / shelves[1].columns) + 1,
        column: (index % shelves[1].columns) + 1,
      });
    },
  );

  return { shelves, wines: sampleWines, bottles };
}

export function positionKey(shelfId: string, row: number, column: number) {
  return `${shelfId}:${row}:${column}`;
}

export function categoryForWine(wine: Wine, criterion: WineCriterion) {
  switch (criterion) {
    case "country":
      return wine.country;
    case "region":
      return wine.region;
    case "grape":
      return wine.grape;
    case "vintage":
      return wine.vintage;
    case "custom":
      return wine.customValue ?? "";
  }
}

export function wineMatchesCategory(wine: Wine, criterion: WineCriterion, value: string) {
  const normalizedValue = value.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedValue) return false;

  if (criterion === "grape") {
    return wine.grape
      .split(/[,;/]/)
      .map((grape) => grape.trim().toLocaleLowerCase("pt-BR"))
      .includes(normalizedValue);
  }

  return categoryForWine(wine, criterion).trim().toLocaleLowerCase("pt-BR") === normalizedValue;
}

export function criterionLabel(criterion: WineCriterion) {
  return {
    country: "país",
    region: "região",
    grape: "uva",
    vintage: "safra",
    custom: "categoria",
  }[criterion];
}
