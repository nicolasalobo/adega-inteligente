import { Archive, ArrowDownRight, ArrowUpRight, BottleWine, Grid2X2, Wine } from "lucide-react";
import type { CellarStats } from "@/lib/stats";

export function CellarStatsRow({ stats }: { stats: CellarStats }) {
  return (
    <section className="stats-row" aria-label="Resumo da coleção">
      <article className="stat-card">
        <span className="stat-icon burgundy"><BottleWine size={18} /></span>
        <div className="stat-copy"><span>Garrafas na adega</span><strong>{stats.bottleCount}</strong></div>
        <span className="stat-trend"><ArrowUpRight size={14} /> coleção</span>
      </article>
      <article className="stat-card">
        <span className="stat-icon olive"><Grid2X2 size={18} /></span>
        <div className="stat-copy"><span>Espaços ocupados</span><strong>{stats.occupiedPercent}<small>%</small></strong></div>
        <span className="stat-trend muted"><ArrowDownRight size={14} /> {stats.freePositions} livres</span>
      </article>
      <article className="stat-card">
        <span className="stat-icon sand"><Archive size={18} /></span>
        <div className="stat-copy"><span>Prateleiras</span><strong>{stats.shelfCount}</strong></div>
        <span className="stat-trend muted">{stats.totalCapacity} posições</span>
      </article>
      <article className="stat-card">
        <span className="stat-icon lavender"><Wine size={18} /></span>
        <div className="stat-copy"><span>Rótulos diferentes</span><strong>{stats.labelCount}</strong></div>
        <span className="stat-trend muted">na coleção</span>
      </article>
    </section>
  );
}
