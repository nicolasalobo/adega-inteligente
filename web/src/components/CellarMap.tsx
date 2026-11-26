"use client";

import { Leaf, Sparkles, Wine } from "lucide-react";
import type { ReactNode } from "react";
import { criterionLabel, positionKey, type Bottle, type CellarState, type Shelf, type Wine as WineRecord } from "@/lib/cellar";
import { criterionNames } from "@/lib/shelf";
import { bottlesOnShelf } from "@/lib/stats";
import { matchesSearch } from "@/lib/wine";

/** Mapa da prateleira ativa: abas das prateleiras, grid de posições e o painel de detalhes (`panel`). */
export function CellarMap({
  cellar,
  shelf,
  bottleByPosition,
  wineById,
  search,
  selectedPosition,
  onSelectShelf,
  onSelectPosition,
  panel,
}: {
  cellar: CellarState;
  shelf: Shelf;
  bottleByPosition: Map<string, Bottle>;
  wineById: Map<string, WineRecord>;
  search: string;
  selectedPosition: string | null;
  onSelectShelf: (shelfId: string) => void;
  onSelectPosition: (positionKey: string) => void;
  panel: ReactNode;
}) {
  const shelfBottleCount = bottlesOnShelf(cellar.bottles, shelf.id).length;
  return (
    <div className="map-layout">
      <div className="map-main">
        <div className="shelf-tabs" aria-label="Selecione a prateleira">
          {cellar.shelves.map((item) => {
            const count = bottlesOnShelf(cellar.bottles, item.id).length;
            return <button key={item.id} aria-pressed={shelf.id === item.id} className={shelf.id === item.id ? "shelf-tab active" : "shelf-tab"} onClick={() => onSelectShelf(item.id)}>
              <span>{item.name}</span><small>{count}/{item.rows * item.columns}</small>
            </button>;
          })}
        </div>

        <div className="shelf-caption-row">
          <div className="shelf-caption"><span className="shelf-number">{String(cellar.shelves.indexOf(shelf) + 1).padStart(2, "0")}</span><div><strong>{shelf.name}</strong><small>{shelf.rows} linhas <span>·</span> {shelf.columns} colunas <span>·</span> {shelf.organization === "free" ? "organização livre" : `por ${shelf.rule ? criterionLabel(shelf.rule.criterion) : "critério"}`}</small></div></div>
          <span className="capacity-pill"><span className="capacity-dot" /> {shelfBottleCount} de {shelf.rows * shelf.columns} posições</span>
        </div>

        {shelf.rule && <div className="rule-note"><Leaf size={15} /><span>Organizada por <strong>{criterionNames[shelf.rule.criterion].toLocaleLowerCase("pt-BR")}</strong> nas {shelf.rule.axis === "row" ? "linhas" : "colunas"}.</span><span className="rule-values">{shelf.rule.values.join(" · ")}</span></div>}

        <div className="rack-outer">
          <div className="rack-heading"><span>PRATELEIRA</span><span>POSIÇÃO FÍSICA</span></div>
          <div className="rack-body">
            <div className="rack-row-numbers" style={{ gridTemplateRows: `repeat(${shelf.rows}, minmax(25px, 1fr))` }} aria-hidden="true">{Array.from({ length: shelf.rows }, (_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}</div>
            <div className="rack-content">
              <div className="shelf-grid" style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: shelf.rows * shelf.columns }, (_, index) => {
                  const row = Math.floor(index / shelf.columns) + 1;
                  const column = (index % shelf.columns) + 1;
                  const key = positionKey(shelf.id, row, column);
                  const bottle = bottleByPosition.get(key);
                  const wine = bottle ? wineById.get(bottle.wineId) : undefined;
                  const matches = !search || (wine ? matchesSearch(wine, search) : false);
                  const isSelected = selectedPosition === key;
                  return <button
                    key={key}
                    data-position-key={key}
                    className={`shelf-cell ${bottle ? "occupied" : "empty"} ${isSelected ? "selected" : ""} ${search && !matches ? "dimmed" : ""}`}
                    aria-label={`${shelf.name}, linha ${row}, coluna ${column}${wine ? `, ${wine.name} de ${wine.producer}` : ", posição livre"}`}
                    title={wine ? `${wine.name} · ${wine.producer} · L${row} C${column}` : `Livre · L${row} C${column}`}
                    onClick={() => onSelectPosition(key)}
                  >
                    {bottle ? <span className="cell-bottle"><Wine size={15} strokeWidth={1.8} /></span> : <span className="cell-empty-mark" />}
                    <span className="cell-index">{String(column).padStart(2, "0")}</span>
                  </button>;
                })}
              </div>
              <div className="rack-column-numbers" style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))` }} aria-hidden="true">
                {Array.from({ length: shelf.columns }, (_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}
              </div>
            </div>
          </div>
          <div className="rack-footer"><span><span className="legend-dot filled" /> Ocupada</span><span><span className="legend-dot vacant" /> Livre</span><span className="rack-footer-hint">Clique em uma posição para ver detalhes</span></div>
        </div>

        <div className="map-footnote"><Sparkles size={15} /><span>As posições são numeradas por linha e coluna para você encontrar cada garrafa com facilidade.</span></div>
      </div>

      {panel}
    </div>
  );
}
