"use client";

import { Check, Star, X } from "lucide-react";
import { useState, type FormEvent } from "react";

/** Avaliação de uma garrafa: nota de 1 a 5 (obrigatória dentro da avaliação) e comentário opcional. */
export function ReviewModal({
  bottleName,
  review,
  onClose,
  onSave,
}: {
  bottleName: string;
  review?: { rating: number | null; comment: string | null };
  onClose: () => void;
  onSave: (rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!rating) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setSaving(true);
    try {
      await onSave(rating, comment);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="modal-card review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="modal-heading"><div><span className="modal-kicker">SUA DEGUSTAÇÃO</span><h2 id="review-title">Avaliar garrafa</h2><p>{bottleName}</p></div><button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Fechar" disabled={saving}><X size={18} /></button></div>
        <form onSubmit={submit}>
          <fieldset className="review-rating">
            <legend>Nota <i>*</i></legend>
            <div className="review-stars" role="group" aria-label="Nota de 1 a 5 estrelas">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                return <button key={value} type="button" className={value <= rating ? "review-star selected" : "review-star"} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} aria-pressed={rating === value} onClick={() => setRating(value)} disabled={saving}><Star size={25} fill={value <= rating ? "currentColor" : "none"} /></button>;
              })}
            </div>
            <span className="review-rating-label" aria-live="polite">{rating ? `${rating} de 5 estrelas` : "Escolha uma nota"}</span>
          </fieldset>
          <label className="field full review-comment"><span>Comentário <small>opcional</small></span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} placeholder="O que achou deste vinho?" disabled={saving} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="text-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando…" : <><Check size={16} /> Salvar avaliação</>}</button></div>
        </form>
      </section>
    </div>
  );
}
