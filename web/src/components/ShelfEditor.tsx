"use client";

import { Check, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Shelf, ShelfAxis, WineCriterion } from "@/lib/cellar";
import type { ShelfInput } from "@/lib/cellar-repository";
import { criterionNames, parseRuleValues, requiredRuleValueCount } from "@/lib/shelf";
import { cleanText } from "@/lib/wine";

/** Criar ou editar uma prateleira: nome, tamanho e organização (livre ou por regra). */
export function ShelfEditor({ onClose, onSave, shelf }: { onClose: () => void; onSave: (shelf: ShelfInput) => void | Promise<void>; shelf?: Shelf }) {
  const [name, setName] = useState(shelf?.name ?? "");
  const [rows, setRows] = useState(shelf?.rows ?? 5);
  const [columns, setColumns] = useState(shelf?.columns ?? 8);
  const [organization, setOrganization] = useState<Shelf["organization"]>(shelf?.organization ?? "free");
  const [criterion, setCriterion] = useState<WineCriterion>(shelf?.rule?.criterion ?? "country");
  const [axis, setAxis] = useState<ShelfAxis>(shelf?.rule?.axis ?? "row");
  const [valueInput, setValueInput] = useState(shelf?.rule?.values.join(", ") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ruleValues = parseRuleValues(valueInput);
  const requiredValues = requiredRuleValueCount(axis, rows, columns);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organization === "structured" && ruleValues.length !== requiredValues) {
      setError(`Informe exatamente ${requiredValues} categorias, separadas por vírgula.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: cleanText(name),
        rows,
        columns,
        organization,
        ...(organization === "structured" ? { rule: { criterion, axis, values: ruleValues } } : {}),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível criar a prateleira.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card shelf-modal" role="dialog" aria-modal="true" aria-labelledby="add-shelf-title">
        <div className="modal-heading"><div><span className="modal-kicker">CONFIGURAÇÃO DA ADEGA</span><h2 id="add-shelf-title">{shelf ? "Editar prateleira" : "Nova prateleira"}</h2><p>{shelf ? "Ajuste o tamanho e a organização desta prateleira." : "Defina o tamanho e como quer organizar os vinhos."}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field full"><span>Nome da prateleira <i>*</i></span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Parede norte" required /></label>
            <label className="field"><span>Linhas</span><select value={rows} onChange={(event) => setRows(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? "linha" : "linhas"}</option>)}</select></label>
            <label className="field"><span>Colunas</span><select value={columns} onChange={(event) => setColumns(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? "coluna" : "colunas"}</option>)}</select></label>
          </div>
          <div className="organization-options">
            <button type="button" className={organization === "free" ? "organization-option active" : "organization-option"} onClick={() => { setOrganization("free"); setError(""); }}><span className="organization-radio" /><span><strong>Organização livre</strong><small>Qualquer vinho pode ocupar qualquer posição.</small></span></button>
            <button type="button" className={organization === "structured" ? "organization-option active" : "organization-option"} onClick={() => { setOrganization("structured"); setError(""); }}><span className="organization-radio" /><span><strong>Organizar por critério</strong><small>Associe cada linha ou coluna a uma categoria.</small></span></button>
          </div>
          {organization === "structured" && <div className="structured-fields">
            <div className="form-grid">
              <label className="field"><span>Critério</span><select value={criterion} onChange={(event) => setCriterion(event.target.value as WineCriterion)}>{Object.entries(criterionNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field"><span>Organizar por</span><select value={axis} onChange={(event) => { setAxis(event.target.value as ShelfAxis); setError(""); }}><option value="row">Linhas</option><option value="column">Colunas</option></select></label>
              <label className="field full"><span>Valores na ordem da prateleira <i>*</i></span><input value={valueInput} onChange={(event) => { setValueInput(event.target.value); setError(""); }} placeholder={axis === "row" ? "Brasil, França, Itália, Chile, Portugal" : "Brasil, França, Itália, Chile, Portugal, Espanha, Argentina, EUA"} required /><small className="field-help">Separe por vírgula. Para {rows} linhas, informe {rows} valores.</small></label>
            </div>
            <div className="rule-preview"><span>PRÉVIA</span>{Array.from({ length: requiredValues }, (_, index) => <i key={index} style={{ background: `hsl(${13 + index * 24} 24% ${83 - (index % 3) * 4}%)` }}>{ruleValues[index] || `${axis === "row" ? "Linha" : "Coluna"} ${index + 1}`}</i>)}</div>
          </div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="text-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={!name.trim() || saving}>{saving ? "Salvando…" : shelf ? <><Check size={16} /> Salvar alterações</> : <><Plus size={16} /> Criar prateleira</>}</button></div>
        </form>
      </section>
    </div>
  );
}
