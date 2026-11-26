"use client";

import { Archive, CircleHelp, Grid2X2, LayoutDashboard, Plus, Wine } from "lucide-react";
import type { CellarState } from "@/lib/cellar";
import { bottlesOnShelf } from "@/lib/stats";

export type View = "map" | "wines" | "history";

export function AppSidebar({
  cellar,
  view,
  activeShelfId,
  isRemote,
  onSelectView,
  onSelectShelf,
  onAddShelf,
  onResetExample,
}: {
  cellar: CellarState;
  view: View;
  activeShelfId: string;
  isRemote: boolean;
  onSelectView: (view: View) => void;
  onSelectShelf: (shelfId: string) => void;
  onAddShelf: () => void;
  onResetExample: () => void;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#inicio" aria-label="Adega, início">
        <span className="brand-mark"><Wine size={20} strokeWidth={1.7} /></span>
        <span className="brand-wordmark">ADEGA<span>pessoal</span></span>
      </a>

      <div className="sidebar-label">SUA COLEÇÃO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        <button aria-label="Mapa da adega" className={view === "map" ? "nav-item active" : "nav-item"} onClick={() => onSelectView("map")}>
          <LayoutDashboard size={18} /> <span>Mapa da adega</span>
        </button>
        <button aria-label="Meus vinhos" className={view === "wines" ? "nav-item active" : "nav-item"} onClick={() => onSelectView("wines")}>
          <Archive size={18} /> <span>Meus vinhos</span>
        </button>
        <button aria-label="Histórico" className={view === "history" ? "nav-item active" : "nav-item"} onClick={() => onSelectView("history")}><Archive size={18} /> <span>Histórico</span></button>
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-label shelf-label">PRATELEIRAS <span>{cellar.shelves.length}</span></div>
      <div className="sidebar-shelves">
        {cellar.shelves.map((shelf) => (
          <button
            key={shelf.id}
            className={activeShelfId === shelf.id ? "shelf-link selected" : "shelf-link"}
            onClick={() => onSelectShelf(shelf.id)}
          >
            <span className="shelf-link-icon"><Grid2X2 size={16} /></span>
            <span className="shelf-link-name">{shelf.name}</span>
            <span className="shelf-link-count">{bottlesOnShelf(cellar.bottles, shelf.id).length}</span>
          </button>
        ))}
        <button className="add-shelf-link" onClick={onAddShelf}><Plus size={15} /> Nova prateleira</button>
      </div>

      <div className="sidebar-spacer" />
      <div className="local-status">
        <span className="local-status-dot" />
        <div><strong>{isRemote ? "Conta conectada" : "Protótipo local"}</strong><small>{isRemote ? "Adega sincronizada" : "Salvo neste navegador"}</small></div>
        {!isRemote && <button className="help-button" aria-label="Sobre os dados locais" title="Os dados ainda não são sincronizados com uma conta ou servidor."><CircleHelp size={16} /></button>}
      </div>
      {!isRemote && <button className="reset-link" onClick={onResetExample}>Restaurar dados de exemplo</button>}
    </aside>
  );
}
