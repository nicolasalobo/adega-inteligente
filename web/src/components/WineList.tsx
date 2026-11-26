"use client";

import { MapPin, Plus, Wine } from "lucide-react";
import type { CellarState, Wine as WineRecord } from "@/lib/cellar";
import { bottleLocations, type BottleLocation, type FilterOption } from "@/lib/find";

function FilterChips({ label, allLabel, options, selected, onSelect }: {
  label: string;
  allLabel: string;
  options: FilterOption[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="filter-row" role="group" aria-label={`Filtrar por ${label.toLocaleLowerCase("pt-BR")}`}>
      <span className="filter-row-label">{label}</span>
      <div className="filter-chips">
        <button type="button" className={selected === null ? "filter-chip active" : "filter-chip"} aria-pressed={selected === null} onClick={() => onSelect(null)}>{allLabel}</button>
        {options.map((option) => (
          <button key={option.key} type="button" className={selected === option.key ? "filter-chip active" : "filter-chip"} aria-pressed={selected === option.key} onClick={() => onSelect(selected === option.key ? null : option.key)}>
            {option.label} <small>{option.bottleCount}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Encontrar vinho: filtros rápidos e, para cada vinho, onde está cada garrafa. Tocar na localização abre o mapa. */
export function WineList({
  cellar,
  wines,
  countryOptions,
  grapeOptions,
  countryFilter,
  grapeFilter,
  onCountryFilter,
  onGrapeFilter,
  averageLabel,
  onOpenLocation,
  onAddWine,
}: {
  cellar: CellarState;
  wines: WineRecord[];
  countryOptions: FilterOption[];
  grapeOptions: FilterOption[];
  countryFilter: string | null;
  grapeFilter: string | null;
  onCountryFilter: (key: string | null) => void;
  onGrapeFilter: (key: string | null) => void;
  averageLabel: (wineId: string) => string;
  onOpenLocation: (location: BottleLocation) => void;
  onAddWine: () => void;
}) {
  return (
    <div className="wine-list-view">
      <div className="wine-filters">
        <FilterChips label="País" allLabel="Todos" options={countryOptions} selected={countryFilter} onSelect={onCountryFilter} />
        <FilterChips label="Uva" allLabel="Todas" options={grapeOptions} selected={grapeFilter} onSelect={onGrapeFilter} />
      </div>
      <div className="wine-list-head"><span>RÓTULO</span><span>ORIGEM</span><span>SAFRA</span><span>GARRAFAS</span><span>ONDE ESTÁ</span></div>
      {wines.length ? wines.map((wine) => {
        const locations = bottleLocations(cellar, wine.id);
        return <article key={wine.id} className="wine-list-row">
          <span className="wine-name-cell"><span className="wine-list-icon"><Wine size={17} /></span><span><strong>{wine.name}</strong><small>{wine.producer}</small></span></span>
          <span className="wine-origin-cell">{wine.region || wine.country || "—"}</span>
          <span className="wine-vintage-cell">{wine.vintage || "Sem safra"}</span>
          <span className="wine-count-cell">{locations.length} <small>garrafas · {averageLabel(wine.id)}</small></span>
          <span className="wine-locations">
            {locations.length ? locations.map((location) => (
              <button key={location.key} type="button" className="location-chip" onClick={() => onOpenLocation(location)} aria-label={`Abrir no mapa: ${location.label}`}>
                <MapPin size={12} /> {location.label}
              </button>
            )) : <small className="no-bottles">Nenhuma garrafa na adega</small>}
          </span>
        </article>;
      }) : <div className="empty-list"><Wine size={25} /><strong>Nenhum vinho encontrado</strong><span>Tente outra busca ou registre um novo rótulo.</span></div>}
      <button className="list-add-row" onClick={onAddWine}><Plus size={16} /> Cadastrar vinho manualmente</button>
    </div>
  );
}
