"use client";

import { BottleWine, Grid2X2, Plus, Wine, X } from "lucide-react";
import type { Bottle, Shelf, Wine as WineRecord } from "@/lib/cellar";

/** Painel ao lado do mapa: detalhes da posição escolhida (garrafa ou espaço livre). */
export function PositionPanel({
  shelf,
  selectedPosition,
  bottle,
  wine,
  averageLabel,
  isRemote,
  onClose,
  onReview,
  onMove,
  onRemove,
  onAddHere,
}: {
  shelf: Shelf;
  selectedPosition: string | null;
  bottle?: Bottle;
  wine?: WineRecord;
  averageLabel: string;
  isRemote: boolean;
  onClose: () => void;
  onReview: (bottle: Bottle) => void;
  onMove: (bottle: Bottle) => void;
  onRemove: (bottle: Bottle) => void;
  onAddHere: (positionKey: string) => void;
}) {
  return (
    <aside className="position-panel">
      <div className="panel-topline"><span>DETALHES DA POSIÇÃO</span>{selectedPosition && <button className="icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={15} /></button>}</div>
      {!selectedPosition ? (
        <div className="empty-selection"><span className="selection-illustration"><Grid2X2 size={23} /></span><h3>Escolha um espaço</h3><p>Toque em qualquer posição do mapa para ver a garrafa ou descobrir se ela está livre.</p><div className="selection-tip"><span>↳</span> Cada espaço tem um endereço único</div></div>
      ) : bottle && wine ? (
        <div className="position-details">
          <div className="position-number"><span className="position-number-icon"><Wine size={19} /></span><span>{shelf.name}<strong>Linha {String(bottle.row).padStart(2, "0")} <i>·</i> Coluna {String(bottle.column).padStart(2, "0")}</strong></span></div>
          <div className="detail-bottle-illustration"><div className="bottle-glow" /><BottleWine size={49} strokeWidth={1.15} /><span>EM SUA COLEÇÃO</span></div>
          <div className="detail-wine-title"><h3>{wine.name}</h3><p>{wine.producer}</p></div>
          <div className="wine-facts">
            {wine.vintage && <div><span>Safra</span><strong>{wine.vintage}</strong></div>}
            {wine.country && <div><span>País</span><strong>{wine.country}</strong></div>}
            {wine.region && <div><span>Região</span><strong>{wine.region}</strong></div>}
            {wine.grape && <div><span>Uva(s)</span><strong>{wine.grape}</strong></div>}
          </div>
          <div className="position-status">Média do vinho: {averageLabel}</div>
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => onReview(bottle)}>Avaliar garrafa</button>
            <button className="secondary-button" onClick={() => onMove(bottle)}>Mover</button>
            <button className="text-button" onClick={() => onRemove(bottle)}>Retirar</button>
          </div>
        </div>
      ) : (
        <div className="position-details vacant-details">
          <div className="position-number"><span className="position-number-icon vacant-icon"><Grid2X2 size={18} /></span><span>{shelf.name}<strong>Linha {selectedPosition.split(":")[1]} <i>·</i> Coluna {selectedPosition.split(":")[2]}</strong></span></div>
          <span className="free-badge"><span className="capacity-dot" /> POSIÇÃO LIVRE</span>
          <h3>Um espaço esperando por um vinho.</h3>
          <p>Registre uma garrafa e escolha exatamente onde ela vai ficar.</p>
          <button className="outline-add-button" onClick={() => onAddHere(selectedPosition)}><Plus size={16} /> Adicionar garrafa aqui</button>
        </div>
      )}
      <div className="panel-bottom"><div className="wine-rule" /><div><strong>Seu mapa, suas regras.</strong><p>{isRemote ? "As alterações são salvas na sua conta." : "Os dados de exemplo podem ser substituídos pelos da sua coleção."}</p></div></div>
    </aside>
  );
}
