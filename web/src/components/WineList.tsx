"use client";

import { ArrowUpRight, Plus, Wine } from "lucide-react";
import type { Bottle, CellarState, Wine as WineRecord } from "@/lib/cellar";

/** Lista dos vinhos da coleção; tocar em um vinho abre o mapa na primeira garrafa dele. */
export function WineList({
  cellar,
  wines,
  bottleCounts,
  averageLabel,
  onOpenBottle,
  onAddWine,
}: {
  cellar: CellarState;
  wines: WineRecord[];
  bottleCounts: Map<string, number>;
  averageLabel: (wineId: string) => string;
  onOpenBottle: (bottle: Bottle) => void;
  onAddWine: () => void;
}) {
  return (
    <div className="wine-list-view">
      <div className="wine-list-head"><span>RÓTULO</span><span>ORIGEM</span><span>SAFRA</span><span>GARRAFAS</span><span>POSIÇÃO</span></div>
      {wines.length ? wines.map((wine) => {
        const firstBottle = cellar.bottles.find((bottle) => bottle.wineId === wine.id);
        const shelf = cellar.shelves.find((item) => item.id === firstBottle?.shelfId);
        return <button key={wine.id} className="wine-list-row" onClick={() => { if (firstBottle) onOpenBottle(firstBottle); }}>
          <span className="wine-name-cell"><span className="wine-list-icon"><Wine size={17} /></span><span><strong>{wine.name}</strong><small>{wine.producer}</small></span></span>
          <span className="wine-origin-cell">{wine.region || wine.country || "—"}</span>
          <span className="wine-vintage-cell">{wine.vintage || "Sem safra"}</span>
          <span className="wine-count-cell">{bottleCounts.get(wine.id) ?? 0} <small>garrafas · {averageLabel(wine.id)}</small></span>
          <span className="wine-position-cell">{shelf ? <>{shelf.name}<small>L{firstBottle?.row} · C{firstBottle?.column}</small></> : "—"}<ArrowUpRight size={15} /></span>
        </button>;
      }) : <div className="empty-list"><Wine size={25} /><strong>Nenhum vinho encontrado</strong><span>Tente outra busca ou registre um novo rótulo.</span></div>}
      <button className="list-add-row" onClick={onAddWine}><Plus size={16} /> Cadastrar vinho manualmente</button>
    </div>
  );
}
