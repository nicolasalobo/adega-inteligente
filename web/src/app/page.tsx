"use client";

import { Check, Grid2X2, Pencil, Plus, Search, Settings2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddBottleFlow } from "@/components/AddBottleFlow";
import { AppSidebar, type View } from "@/components/AppSidebar";
import { AuthScreen } from "@/components/AuthScreen";
import { CellarMap } from "@/components/CellarMap";
import { CellarStatsRow } from "@/components/CellarStatsRow";
import { ConnectionErrorScreen, ConnectionStateScreen } from "@/components/ConnectionScreens";
import { HistoryView } from "@/components/HistoryView";
import { PositionPanel } from "@/components/PositionPanel";
import { ReviewModal } from "@/components/ReviewModal";
import { ShelfEditor } from "@/components/ShelfEditor";
import { WineList } from "@/components/WineList";
import { useCellar } from "@/hooks/useCellar";
import { positionKey, type Bottle, type CellarState, type Shelf } from "@/lib/cellar";
import type { BarcodeAssociation, ShelfInput } from "@/lib/cellar-repository";
import { moveDestinationText, planMove } from "@/lib/move";
import type { PositionDraft } from "@/lib/shelf";
import { bottleCountsByWine, cellarStats, formatAverageRating, MAX_REMOVAL_REASON_LENGTH } from "@/lib/stats";
import { matchesSearch, type WineDraft } from "@/lib/wine";

export default function Home() {
  const [view, setView] = useState<View>("map");
  const [activeShelfId, setActiveShelfId] = useState("shelf-main");
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showAddBottle, setShowAddBottle] = useState(false);
  const [preferredPositionKey, setPreferredPositionKey] = useState<string | null>(null);
  const [showAddShelf, setShowAddShelf] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [toast, setToast] = useState("");
  const [reviewingBottle, setReviewingBottle] = useState<Bottle | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const showFirstShelf = useCallback((next: CellarState) => {
    setActiveShelfId(next.shelves[0]?.id ?? "");
    setSelectedPosition(null);
  }, []);
  const store = useCellar(showFirstShelf);
  const { cellar, dataMode, neonClient } = store;
  const isRemote = dataMode === "remote";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape") {
        setShowAddBottle(false);
        setShowAddShelf(false);
        setEditingShelf(null);
        setReviewingBottle(null);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const activeShelf = cellar.shelves.find((shelf) => shelf.id === activeShelfId) ?? cellar.shelves[0];
  const wineById = useMemo(() => new Map(cellar.wines.map((wine) => [wine.id, wine] as const)), [cellar.wines]);
  const bottleByPosition = useMemo(() => {
    const positions = new Map<string, Bottle>();
    cellar.bottles.forEach((bottle) => {
      positions.set(positionKey(bottle.shelfId, bottle.row, bottle.column), bottle);
    });
    return positions;
  }, [cellar.bottles]);
  const stats = cellarStats(cellar);
  const bottleCounts = bottleCountsByWine(cellar.bottles);
  const selectedBottle = selectedPosition ? bottleByPosition.get(selectedPosition) : undefined;
  const selectedWine = selectedBottle ? wineById.get(selectedBottle.wineId) : undefined;
  const averageLabel = (wineId: string) => formatAverageRating(cellar.reviews ?? [], wineId);
  const displayedWines = cellar.wines
    .filter((wine) => matchesSearch(wine, search))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

  async function addBottles(draft: WineDraft, shelf: Shelf, positions: PositionDraft[], barcode?: BarcodeAssociation | null) {
    await store.addBottles(draft, shelf, positions, barcode);
    setActiveShelfId(shelf.id);
    setSelectedPosition(positions[0]?.key ?? null);
    setShowAddBottle(false);
    setPreferredPositionKey(null);
    setToast(`${positions.length} ${positions.length === 1 ? "garrafa adicionada" : "garrafas adicionadas"} à adega`);
  }

  async function addShelf(input: ShelfInput) {
    const shelf = await store.addShelf(input);
    setActiveShelfId(shelf.id);
    setView("map");
    setSelectedPosition(null);
    setShowAddShelf(false);
    setToast("Prateleira criada");
  }

  async function updateShelf(shelfId: string, input: ShelfInput) {
    await store.updateShelf(shelfId, input);
    setEditingShelf(null);
    setToast("Prateleira atualizada");
  }

  async function moveBottle(bottle: Bottle) {
    const shelf = cellar.shelves.find((item) => item.id === bottle.shelfId);
    if (!shelf) return;
    const destination = window.prompt(`Mover ${wineById.get(bottle.wineId)?.name ?? "garrafa"}. Informe destino como prateleira/linha/coluna. Prateleiras: ${cellar.shelves.map((item) => item.name).join(", ")}`, moveDestinationText(shelf, bottle));
    if (!destination) return;
    const plan = planMove(cellar, bottle, shelf, destination);
    if (!plan.ok) { setToast(plan.message); return; }
    if (plan.occupant && !window.confirm("Esta posição está ocupada. Deseja trocar as duas garrafas?")) return;
    try {
      await store.moveBottle(bottle, plan.target, plan.occupant);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível mover a garrafa.");
      return;
    }
    setActiveShelfId(plan.target.shelf.id);
    setSelectedPosition(positionKey(plan.target.shelf.id, plan.target.row, plan.target.column));
    setToast("Garrafa movida; movimentação registrada.");
  }

  async function removeBottle(bottle: Bottle) {
    const reason = window.prompt("Motivo da retirada (opcional):");
    if (reason === null) return;
    if (reason.length > MAX_REMOVAL_REASON_LENGTH) { setToast("O motivo deve ter no máximo 2000 caracteres."); return; }
    if (!window.confirm("Confirmar a retirada desta garrafa da adega?")) return;
    try {
      await store.removeBottle(bottle, reason);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível retirar a garrafa.");
      return;
    }
    setSelectedPosition(null);
    setToast("Retirada registrada; posição liberada.");
  }

  async function saveReview(bottle: Bottle, rating: number, comment: string) {
    await store.saveReview(bottle, rating, comment);
    setToast("Avaliação salva para esta garrafa.");
    setReviewingBottle(null);
  }

  function resetExample() {
    if (!window.confirm("Restaurar os vinhos de exemplo vai substituir os dados desta demonstração neste navegador. Quer continuar?")) return;
    store.resetExample();
    setSearch("");
    setToast("Exemplo restaurado neste navegador");
  }

  async function signOut() {
    try {
      await store.signOut();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível sair da conta. Tente novamente.");
    }
  }

  function openLocalDemo() {
    store.openLocalDemo();
    setToast("Demonstração local aberta neste navegador");
  }

  function openBottleModal(positionKeyToPreselect: string | null = null) {
    setPreferredPositionKey(positionKeyToPreselect);
    setShowAddBottle(true);
  }

  function selectShelf(shelfId: string) {
    setActiveShelfId(shelfId);
    setSelectedPosition(null);
  }

  if (dataMode === "checking" || (dataMode === "local" && !store.hydrated)) return <ConnectionStateScreen title="Abrindo sua adega" message="Estamos carregando suas prateleiras." />;
  if (dataMode === "signed-out" && neonClient) {
    return <AuthScreen client={neonClient} onAuthenticated={(user) => store.loadRemoteCellar(neonClient, user)} />;
  }
  if (dataMode === "error") return <ConnectionErrorScreen message={store.connectionError} onOpenDemo={openLocalDemo} />;
  if (!activeShelf) return null;

  return (
    <div className="app-shell">
      <AppSidebar
        cellar={cellar}
        view={view}
        activeShelfId={activeShelfId}
        isRemote={isRemote}
        onSelectView={setView}
        onSelectShelf={(shelfId) => { selectShelf(shelfId); setView("map"); }}
        onAddShelf={() => setShowAddShelf(true)}
        onResetExample={resetExample}
      />

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumbs"><span>Minha adega</span><span className="breadcrumb-slash">/</span><strong>{view === "map" ? "Mapa" : view === "history" ? "Histórico" : "Vinhos"}</strong></div>
          <div className="topbar-right">
            <span className="topbar-note"><span className="status-pulse" /> {isRemote ? "Sincronizado com sua conta" : "Seus dados estão neste dispositivo"}</span>
            <button className="profile-button" aria-label={isRemote ? `Sair da conta ${store.accountEmail}` : "Perfil da demonstração local"} title={isRemote ? "Sair da conta" : "Demonstração local"} onClick={() => { if (isRemote) void signOut(); }}>{isRemote ? (store.accountEmail[0]?.toLocaleUpperCase("pt-BR") ?? "V") : "N"}</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SUA COLEÇÃO, BEM CUIDADA</div>
              <h1>{view === "map" ? "A adega, do seu jeito." : view === "history" ? "Histórico da adega." : "Seus vinhos."}</h1>
              <p>{view === "map" ? "Cada garrafa no seu lugar. Cada história à mão." : "Um olhar claro sobre tudo o que você guardou."}</p>
            </div>
            <button className="primary-button" onClick={() => openBottleModal()}><Plus size={17} /> Registrar vinho</button>
          </section>

          <CellarStatsRow stats={stats} />

          <section className="workspace-card">
            <div className="workspace-toolbar">
              <div className="section-title-wrap">
                <div className="section-icon"><Grid2X2 size={18} /></div>
                <div><h2>{view === "map" ? "Mapa de posições" : view === "history" ? "Movimentações" : "Sua coleção de vinhos"}</h2><p>{view === "map" ? "Escolha uma prateleira para ver cada garrafa." : view === "history" ? "Movimentos e retiradas registrados." : `${displayedWines.length} rótulos cadastrados.`}</p></div>
              </div>
              <div className="toolbar-actions">
                <label className="search-box">
                  <Search size={16} />
                  <input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na adega" aria-label="Buscar vinho na adega" id="cellar-search" />
                  {search && <button type="button" className="search-clear" onClick={() => setSearch("")} aria-label="Limpar busca"><X size={14} /></button>}
                  {!search && <kbd>Ctrl K</kbd>}
                </label>
                {view === "map" && <>
                  <button className="secondary-button" onClick={() => setEditingShelf(activeShelf)}><Pencil size={15} /> Editar prateleira</button>
                  <button className="secondary-button" onClick={() => setShowAddShelf(true)}><Settings2 size={16} /> Nova prateleira</button>
                </>}
              </div>
            </div>

            {view === "map" ? (
              <CellarMap
                cellar={cellar}
                shelf={activeShelf}
                bottleByPosition={bottleByPosition}
                wineById={wineById}
                search={search}
                selectedPosition={selectedPosition}
                onSelectShelf={selectShelf}
                onSelectPosition={setSelectedPosition}
                panel={<PositionPanel
                  shelf={activeShelf}
                  selectedPosition={selectedPosition}
                  bottle={selectedBottle}
                  wine={selectedWine}
                  averageLabel={selectedWine ? averageLabel(selectedWine.id) : ""}
                  isRemote={isRemote}
                  onClose={() => setSelectedPosition(null)}
                  onReview={setReviewingBottle}
                  onMove={(bottle) => void moveBottle(bottle)}
                  onRemove={(bottle) => void removeBottle(bottle)}
                  onAddHere={openBottleModal}
                />}
              />
            ) : view === "history" ? (
              <HistoryView cellar={cellar} wineById={wineById} search={search} currentUserId={store.accountUserId} currentEmail={store.accountEmail} onReview={setReviewingBottle} />
            ) : (
              <WineList
                cellar={cellar}
                wines={displayedWines}
                bottleCounts={bottleCounts}
                averageLabel={averageLabel}
                onOpenBottle={(bottle) => {
                  setActiveShelfId(bottle.shelfId);
                  setSelectedPosition(positionKey(bottle.shelfId, bottle.row, bottle.column));
                  setView("map");
                }}
                onAddWine={() => openBottleModal()}
              />
            )}
          </section>

          <footer className="page-footer"><span>Feito para cuidar bem do que vale a pena guardar.</span><span>Adega pessoal <i>·</i> primeira versão</span></footer>
        </div>
      </main>

      {showAddBottle && <AddBottleFlow shelves={cellar.shelves} wines={cellar.wines} bottles={cellar.bottles} neonClient={neonClient} canIdentify={isRemote} initialShelfId={activeShelf.id} initialPositionKey={preferredPositionKey} onClose={() => { setShowAddBottle(false); setPreferredPositionKey(null); }} onSave={addBottles} />}
      {showAddShelf && <ShelfEditor onClose={() => setShowAddShelf(false)} onSave={addShelf} />}
      {reviewingBottle && <ReviewModal bottleName={wineById.get(reviewingBottle.wineId)?.name ?? "Garrafa"} review={(cellar.reviews ?? []).find(item => item.bottleId === reviewingBottle.id)} onClose={() => setReviewingBottle(null)} onSave={(rating, comment) => saveReview(reviewingBottle, rating, comment)} />}
      {editingShelf && <ShelfEditor key={editingShelf.id} shelf={editingShelf} onClose={() => setEditingShelf(null)} onSave={(shelf) => updateShelf(editingShelf.id, shelf)} />}
      {toast && <div className="toast-message" role="status"><span><Check size={15} /></span>{toast}</div>}
    </div>
  );
}
