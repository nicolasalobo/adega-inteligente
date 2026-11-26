"use client";

import { ArrowDownRight, Check, Leaf, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { BarcodeIdentification } from "@/components/BarcodeIdentification";
import { criterionLabel, type Bottle, type Shelf, type Wine } from "@/lib/cellar";
import type { BarcodeAssociation } from "@/lib/cellar-repository";
import type { IdentificationCandidate } from "@/lib/identification/contracts";
import { requireAccessToken } from "@/lib/neon/cellar-data";
import type { NeonBrowserClient } from "@/lib/neon/client";
import {
  criterionNames,
  eligiblePositions as findEligiblePositions,
  isMissingRuleValue,
  isRuleField,
  occupiedPositionKeys,
  ruleValueAt,
  shelfPositions,
  type PositionDraft,
} from "@/lib/shelf";
import {
  catalogCandidateLocation,
  catalogReferenceName,
  draftFromCatalog,
  fetchWineCatalogDetail,
  searchWineCatalog,
  type WineCatalogCandidate,
} from "@/lib/wineapi-catalog";
import { blankWine, draftFromIdentificationCandidate, findDuplicateWine, mergeDraftWithExisting, type WineDraft } from "@/lib/wine";

/** Cadastro de garrafas: busca (EAN ou WineAPI) → revisão da ficha → posições → confirmação. */
export function AddBottleFlow({
  shelves,
  wines,
  bottles,
  neonClient,
  canIdentify,
  initialShelfId,
  initialPositionKey,
  onClose,
  onSave,
}: {
  shelves: Shelf[];
  wines: Wine[];
  bottles: Bottle[];
  neonClient: NeonBrowserClient | null;
  canIdentify: boolean;
  initialShelfId: string;
  initialPositionKey: string | null;
  onClose: () => void;
  onSave: (draft: WineDraft, shelf: Shelf, positions: PositionDraft[], barcode?: BarcodeAssociation | null) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<WineDraft>(blankWine);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<WineCatalogCandidate[]>([]);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [loadingCandidateId, setLoadingCandidateId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [shelfId, setShelfId] = useState(initialShelfId);
  const [quantity, setQuantity] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialPositionKey ? [initialPositionKey] : []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [barcodeAssociation, setBarcodeAssociation] = useState<BarcodeAssociation | null>(null);
  const [confirmBarcodeAssociation, setConfirmBarcodeAssociation] = useState(false);
  const shelf = shelves.find((item) => item.id === shelfId) ?? shelves[0];
  const reserved = useMemo(() => occupiedPositionKeys(bottles), [bottles]);
  const duplicateMatch = findDuplicateWine(wines, draft);
  const effectiveWine = mergeDraftWithExisting(draft, duplicateMatch);
  const positions = shelf ? shelfPositions(shelf) : [];
  const eligiblePositions = shelf ? findEligiblePositions(shelf, effectiveWine, reserved) : [];
  const eligibleSet = new Set(eligiblePositions.map((position) => position.key));
  const visibleSelectedKeys = selectedKeys.filter((key) => eligibleSet.has(key)).slice(0, quantity);

  const duplicateWine = Boolean(duplicateMatch);
  const canSave = Boolean(draft.name.trim() && draft.producer.trim() && visibleSelectedKeys.length === quantity);

  function updateDraft(field: keyof WineDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    const ruleField = shelf?.rule?.criterion === "custom" ? "customValue" : shelf?.rule?.criterion;
    if (field === ruleField) setSelectedKeys([]);
    setError("");
  }

  async function searchCatalog() {
    const query = catalogQuery.trim();
    if (query.length < 2) {
      setCatalogMessage("Digite pelo menos 2 caracteres para pesquisar.");
      setCatalogResults([]);
      return;
    }

    setSearchingCatalog(true);
    setCatalogMessage("");
    setCatalogResults([]);
    setSelectedCandidateId("");
    try {
      const accessToken = await requireAccessToken(neonClient, "Entre na sua conta da adega para pesquisar vinhos.");
      const results = await searchWineCatalog(accessToken, query);
      setCatalogResults(results);
      if (!results.length) setCatalogMessage("Nenhum resultado. Você pode preencher a ficha manualmente abaixo.");
    } catch (searchError) {
      setCatalogMessage(searchError instanceof Error ? searchError.message : "Falha ao pesquisar na WineAPI.");
    } finally {
      setSearchingCatalog(false);
    }
  }

  async function chooseCatalogCandidate(candidate: WineCatalogCandidate) {
    setLoadingCandidateId(candidate.id);
    setSelectedCandidateId(candidate.id);
    setCatalogMessage("");
    try {
      const accessToken = await requireAccessToken(neonClient, "Entre na sua conta da adega para carregar a ficha.");
      const detail = await fetchWineCatalogDetail(accessToken, candidate.id);
      const catalogDraft = draftFromCatalog(detail, candidate);
      setDraft(catalogDraft);
      setCatalogMessage(catalogDraft.grape
        ? "Ficha preenchida. Revise os campos antes de adicionar as garrafas."
        : "A WineAPI não informou a uva para este vinho. Revise os campos e preencha a uva manualmente, se souber.");
      setSelectedKeys([]);
    } catch (selectionError) {
      setCatalogMessage(selectionError instanceof Error ? selectionError.message : "Falha ao carregar a ficha do vinho.");
    } finally {
      setLoadingCandidateId("");
    }
  }

  function togglePosition(position: PositionDraft) {
    setSelectedKeys((current) => {
      const validSelection = current.filter((key) => eligibleSet.has(key)).slice(0, quantity);
      if (validSelection.includes(position.key)) return validSelection.filter((key) => key !== position.key);
      if (validSelection.length >= quantity) return validSelection;
      return [...validSelection, position.key];
    });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shelf) return;
    if (visibleSelectedKeys.length !== quantity) {
      setError(`Escolha ${quantity} ${quantity === 1 ? "posição livre" : "posições livres"} para continuar.`);
      return;
    }
    if (isMissingRuleValue(effectiveWine, shelf)) {
      setError(`Informe a ${criterionLabel(shelf.rule?.criterion ?? "custom")} usada nesta prateleira.`);
      return;
    }
    const selectedPositions = positions.filter((position) => visibleSelectedKeys.includes(position.key));
    setSaving(true);
    try {
      await onSave(draft, shelf, selectedPositions, confirmBarcodeAssociation ? barcodeAssociation : null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as garrafas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card add-bottle-modal" role="dialog" aria-modal="true" aria-labelledby="add-bottle-title">
        <div className="modal-heading"><div><span className="modal-kicker">BUSCA NO CATÁLOGO</span><h2 id="add-bottle-title">Adicionar à adega</h2><p>Pesquise o vinho ou preencha a ficha manualmente.</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        <form onSubmit={submit}>
          <BarcodeIdentification
            client={neonClient}
            canPersist={canIdentify}
            onAssociationChange={(association) => {
              setBarcodeAssociation(association);
              setConfirmBarcodeAssociation(Boolean(association));
            }}
            onSelect={(candidate: IdentificationCandidate) => {
              setDraft(draftFromIdentificationCandidate(candidate));
              setSelectedCandidateId("");
              setSelectedKeys([]);
              setCatalogMessage("Ficha preenchida com um candidato. Revise e corrija cada campo; a safra continua sem confirmação automática.");
            }}
          />
          {barcodeAssociation && <label className="barcode-association-confirm"><input type="checkbox" checked={confirmBarcodeAssociation} onChange={(event) => setConfirmBarcodeAssociation(event.target.checked)} /> Ao salvar, associar o EAN-13 {barcodeAssociation.ean13} a esta ficha revisada.</label>}
          <section className="catalog-search" aria-label="Buscar vinho no catálogo">
            <div className="catalog-search-row">
              <label className="field"><span>Nome, produtor ou safra</span><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchCatalog(); } }} placeholder="Ex.: Quara Estate Malbec 2016" /></label>
              <button type="button" className="secondary-button catalog-search-button" onClick={() => void searchCatalog()} disabled={searchingCatalog || loadingCandidateId !== ""}>
                {searchingCatalog ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />} Buscar
              </button>
            </div>
            {catalogMessage && <p className="catalog-message" role="status">{catalogMessage}</p>}
            {catalogResults.length > 0 && <>
              <div className="catalog-results-heading" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 2 }}><strong style={{ color: "#554b42", fontSize: 11, fontWeight: 650 }}>Resultados</strong><span style={{ color: "#9a9084", fontSize: 9 }}>{catalogResults.length} opções · selecione uma para carregar a ficha</span></div>
              <div className="catalog-results" role="list" aria-label="Resultados da WineAPI" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 9, maxHeight: 300, overflowY: "auto", padding: "1px 3px 3px 1px", alignContent: "start" }}>
                {catalogResults.map((candidate) => {
                  const location = catalogCandidateLocation(candidate);
                  const selected = selectedCandidateId === candidate.id;
                  const tagStyle = { padding: "3px 6px", border: "1px solid #eee8df", borderRadius: 20, background: "#fbfaf7", color: "#84796d", fontSize: 8, lineHeight: 1.2 };
                  return <button key={candidate.id} type="button" role="listitem" className={"catalog-result" + (selected ? " selected" : "")} onClick={() => void chooseCatalogCandidate(candidate)} disabled={loadingCandidateId !== ""} aria-label={"Selecionar " + candidate.name} style={{ display: "flex", width: "100%", minWidth: 0, minHeight: 92, boxSizing: "border-box", alignItems: "flex-start", justifyContent: "space-between", gap: 9, padding: 11, overflow: "hidden", border: selected ? "1px solid #9b7471" : "1px solid #e9e2d8", borderRadius: 9, background: selected ? "#faf4f0" : "#fffefa", textAlign: "left", cursor: "pointer" }}>
                    <span className="catalog-result-main" style={{ display: "grid", flex: "1 1 auto", gap: 5, minWidth: 0 }}>
                      <strong style={{ color: "#403832", fontSize: 11, fontWeight: 650, lineHeight: 1.4, overflowWrap: "anywhere" }}>{candidate.name}</strong>
                      <span className="catalog-result-winery" style={{ display: "block", overflow: "hidden", color: "#897d70", fontSize: 9, lineHeight: 1.35, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{catalogReferenceName(candidate.winery) || "Produtor não informado"}</span>
                      <span className="catalog-result-tags" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                        <span style={tagStyle}>{candidate.vintage == null ? "Safra não informada" : "Safra " + candidate.vintage}</span>
                        {location && <span style={tagStyle}>{location}</span>}
                        {candidate.type && <span style={tagStyle}>{candidate.type}</span>}
                      </span>
                    </span>
                    <span className="catalog-result-action" aria-hidden="true" style={{ display: "flex", flex: "0 0 auto", alignItems: "center", gap: 3, paddingTop: 2, color: "#8c6f58", fontSize: 8 }}>{loadingCandidateId === candidate.id ? <LoaderCircle size={16} className="spin" /> : selected ? <Check size={16} /> : <span>Ver ficha <ArrowDownRight size={14} /></span>}</span>
                  </button>;
                })}
              </div>
              <p className="catalog-results-note" style={{ margin: "-3px 0 0", color: "#9a9084", fontSize: 9, lineHeight: 1.45 }}>As uvas aparecem na ficha quando a WineAPI tem essa informação cadastrada.</p>
            </>}
          </section>
          <div className="catalog-review-label">Ficha do vinho <span>Confira e complete antes de salvar</span></div>
          <div className="form-grid">
            <label className="field full"><span>Nome do vinho <i>*</i></span><input autoFocus value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Ex.: Malbec Reserva" required /></label>
            <label className="field full"><span>Produtor <i>*</i></span><input value={draft.producer} onChange={(event) => updateDraft("producer", event.target.value)} placeholder="Ex.: Bodega del Valle" required /></label>
            <label className="field"><span>Safra{isRuleField(shelf, "vintage") && <i>*</i>}</span><input value={draft.vintage} onChange={(event) => updateDraft("vintage", event.target.value)} placeholder="Ex.: 2020" required={isRuleField(shelf, "vintage")} /></label>
            <label className="field"><span>País{isRuleField(shelf, "country") && <i>*</i>}</span><input value={draft.country} onChange={(event) => updateDraft("country", event.target.value)} placeholder="Ex.: Argentina" required={isRuleField(shelf, "country")} /></label>
            <label className="field"><span>Região{isRuleField(shelf, "region") && <i>*</i>}</span><input value={draft.region} onChange={(event) => updateDraft("region", event.target.value)} placeholder="Ex.: Mendoza" required={isRuleField(shelf, "region")} /></label>
            <label className="field"><span>Uva(s){isRuleField(shelf, "grape") && <i>*</i>}</span><input value={draft.grape} onChange={(event) => updateDraft("grape", event.target.value)} placeholder="Ex.: Malbec" required={isRuleField(shelf, "grape")} /></label>
            {shelf?.organization === "structured" && shelf.rule?.criterion === "custom" && <label className="field full"><span>{criterionNames.custom} <i>*</i></span><input value={draft.customValue ?? ""} onChange={(event) => updateDraft("customValue", event.target.value)} placeholder="Informe o valor desta categoria" required={isRuleField(shelf, "customValue")} /></label>}
            <label className="field"><span>Prateleira</span><select value={shelfId} onChange={(event) => { setShelfId(event.target.value); setSelectedKeys([]); }}>{shelves.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Quantidade</span><input type="number" min={1} max={shelf ? shelf.rows * shelf.columns : 1} step={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></label>
          </div>

          {duplicateWine && <div className="duplicate-note"><Check size={14} /> Este rótulo já existe na coleção; as novas unidades serão agrupadas na mesma ficha.</div>}

          {shelf?.organization === "structured" && shelf.rule && <div className="structured-hint"><Leaf size={14} /> Esta prateleira é organizada por {criterionLabel(shelf.rule.criterion)}. Preencha esse campo para mostrar as posições compatíveis.</div>}

          <div className="position-picker-heading"><div><strong>Escolha as posições</strong><span>{visibleSelectedKeys.length} de {quantity} selecionada(s)</span></div><small>{eligiblePositions.length} livre(s) compatível(is)</small></div>
          {quantity > eligiblePositions.length && <p className="picker-shortage">Há {eligiblePositions.length} {eligiblePositions.length === 1 ? "posição livre compatível" : "posições livres compatíveis"} nesta prateleira. Reduza a quantidade ou escolha outra prateleira.</p>}
          <div className="position-picker-scroll"><div className="position-picker-grid" style={{ gridTemplateColumns: `repeat(${shelf?.columns ?? 1}, minmax(28px, 1fr))` }}>
            {positions.map((position) => {
              const occupied = reserved.has(position.key);
              const eligible = eligibleSet.has(position.key);
              const selected = visibleSelectedKeys.includes(position.key);
              const axisValue = shelf ? ruleValueAt(shelf, position.row, position.column) : undefined;
              return <button key={position.key} type="button" disabled={!eligible} aria-pressed={selected} aria-label={`Linha ${position.row}, coluna ${position.column}${occupied ? ", ocupada" : !eligible ? ", incompatível com a regra da prateleira" : selected ? ", selecionada" : ", disponível"}`} className={`picker-cell ${occupied ? "occupied" : ""} ${selected ? "selected" : ""} ${!eligible && !occupied ? "incompatible" : ""}`} onClick={() => togglePosition(position)} title={occupied ? `Ocupada · linha ${position.row}, coluna ${position.column}` : `${axisValue ? `${axisValue} · ` : ""}Linha ${position.row}, coluna ${position.column}`}>
                {selected ? <Check size={13} /> : `${position.row}.${position.column}`}
              </button>;
            })}
          </div></div>
          <div className="picker-legend"><span><i className="legend-pick empty" /> Disponível</span><span><i className="legend-pick chosen" /> Escolhida</span><span><i className="legend-pick unavailable" /> Indisponível</span></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="text-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={!canSave || saving}>{saving ? "Salvando…" : <><Plus size={16} /> Adicionar {quantity === 1 ? "garrafa" : `${quantity} garrafas`}</>}</button></div>
        </form>
      </section>
    </div>
  );
}
