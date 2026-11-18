"use client";

import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BottleWine,
  Check,
  CircleHelp,
  Grid2X2,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Wine,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  categoryForWine,
  createExampleCellar,
  criterionLabel,
  positionKey,
  STORAGE_KEY,
  wineMatchesCategory,
  type Bottle,
  type CellarState,
  type Shelf,
  type ShelfAxis,
  type Wine as WineRecord,
  type WineCriterion,
} from "@/lib/cellar";
import { fetchCellarInventory, shelfFromDatabase } from "@/lib/neon/cellar-data";
import { createNeonBrowserClient, hasNeonConfig } from "@/lib/neon/client";

type View = "map" | "wines" | "history";
type DataMode = "checking" | "signed-out" | "local" | "remote" | "error";
type PositionDraft = { row: number; column: number; key: string };
type WineDraft = Omit<WineRecord, "id">;
type WineApiReference = string | { id?: string; name?: string; country?: string } | null;
type WineCatalogCandidate = {
  id: string;
  name: string;
  vintage: string | number | null;
  type: string | null;
  winery: WineApiReference;
  region: WineApiReference;
  country: string | null;
};

function catalogReferenceName(value: WineApiReference | undefined) {
  return typeof value === "string" ? value : value?.name ?? "";
}

const criterionNames: Record<WineCriterion, string> = {
  country: "País",
  region: "Região",
  grape: "Uva",
  vintage: "Safra",
  custom: "Campo personalizado",
};

const blankWine: WineDraft = {
  name: "",
  producer: "",
  vintage: "",
  country: "",
  region: "",
  grape: "",
  customValue: "",
};

function titleCase(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sameWine(first: WineRecord, second: WineDraft) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
  return (
    normalize(first.name) === normalize(second.name) &&
    normalize(first.producer) === normalize(second.producer) &&
    normalize(first.vintage) === normalize(second.vintage)
  );
}

function matchesSearch(wine: WineRecord, query: string) {
  if (!query.trim()) return true;
  const searchable = [wine.name, wine.producer, wine.vintage, wine.country, wine.region, wine.grape]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return searchable.includes(query.trim().toLocaleLowerCase("pt-BR"));
}

function readStoredCellar(): CellarState | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<CellarState>;
    if (
      Array.isArray(parsed.shelves) && parsed.shelves.length > 0 &&
      Array.isArray(parsed.wines) &&
      Array.isArray(parsed.bottles)
    ) {
      return parsed as CellarState;
    }
  } catch {
    // Invalid or unavailable browser storage falls back to the example cellar.
  }

  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled in this browser. */ }
  return null;
}

export default function Home() {
  const [cellar, setCellar] = useState<CellarState>(() => createExampleCellar());
  const [hydrated, setHydrated] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>(hasNeonConfig ? "checking" : "local");
  const [neonClient, setNeonClient] = useState<ReturnType<typeof createNeonBrowserClient> | null>(null);
  const [remoteCellarId, setRemoteCellarId] = useState<string | null>(null);
  const [remoteEmail, setRemoteEmail] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [view, setView] = useState<View>("map");
  const [activeShelfId, setActiveShelfId] = useState("shelf-main");
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showAddBottle, setShowAddBottle] = useState(false);
  const [preferredPositionKey, setPreferredPositionKey] = useState<string | null>(null);
  const [showAddShelf, setShowAddShelf] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [toast, setToast] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);

  const loadRemoteCellar = useCallback(async (
    client: ReturnType<typeof createNeonBrowserClient>,
    user: { id: string; email?: string | null },
  ) => {
    setDataMode("checking");
    setConnectionError("");
    try {
      const cellarResult = await client.from("cellars").select("id,name").maybeSingle();
      if (cellarResult.error) throw cellarResult.error;
      let remoteCellar = cellarResult.data;

      if (!remoteCellar) {
        const createCellarResult = await client
          .from("cellars")
          .insert({ owner_id: user.id, name: "Minha adega" })
          .select("id,name")
          .single();
        if (createCellarResult.error) throw createCellarResult.error;
        remoteCellar = createCellarResult.data;
      }

      const shelvesResult = await client.from("shelves").select("id").eq("cellar_id", remoteCellar.id).limit(1);
      if (shelvesResult.error) throw shelvesResult.error;
      if (!shelvesResult.data?.length) {
        const createShelfResult = await client.from("shelves").insert({
          cellar_id: remoteCellar.id,
          name: "Adega principal",
          row_count: 5,
          column_count: 10,
          organization: "free",
        });
        if (createShelfResult.error) throw createShelfResult.error;
      }

      const inventory = await fetchCellarInventory(client, remoteCellar.id);
      setCellar(inventory);
      setActiveShelfId(inventory.shelves[0]?.id ?? "");
      setRemoteCellarId(remoteCellar.id);
      setRemoteEmail(user.email ?? "");
      setSelectedPosition(null);
      setDataMode("remote");
      setHydrated(true);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Não foi possível carregar a adega.");
      setDataMode("error");
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hasNeonConfig) {
      const client = createNeonBrowserClient();
      void client.auth.getUser().then(({ data, error }) => {
        setNeonClient(client);
        if (error) {
          if (/no user session found/i.test(error.message)) {
            setDataMode("signed-out");
            setHydrated(true);
            return;
          }
          setConnectionError(error.message);
          setDataMode("error");
          setHydrated(true);
          return;
        }
        if (!data.user) {
          setDataMode("signed-out");
          setHydrated(true);
          return;
        }
        void loadRemoteCellar(client, data.user);
      }).catch((error: unknown) => {
        setConnectionError(error instanceof Error ? error.message : "Não foi possível conectar ao Neon.");
        setDataMode("error");
        setHydrated(true);
      });
      return;
    }

    const storedCellar = readStoredCellar();
    if (storedCellar) {
      // Reconcile the server-rendered demo with this browser's saved local cellar after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCellar(storedCellar);
      setActiveShelfId(storedCellar.shelves[0].id);
    }
    setDataMode("local");
    setHydrated(true);
  }, [loadRemoteCellar]);

  useEffect(() => {
    if (dataMode === "local" && hydrated) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cellar)); } catch { /* Keep the demo usable when storage is unavailable. */ }
    }
  }, [cellar, dataMode, hydrated]);

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

  const activeShelfBottles = cellar.bottles.filter((bottle) => bottle.shelfId === activeShelf?.id);
  const totalCapacity = cellar.shelves.reduce((sum, shelf) => sum + shelf.rows * shelf.columns, 0);
  const freePositions = totalCapacity - cellar.bottles.length;
  const occupiedPercent = totalCapacity ? Math.round((cellar.bottles.length / totalCapacity) * 100) : 0;
  const selectedBottle = selectedPosition ? bottleByPosition.get(selectedPosition) : undefined;
  const selectedWine = selectedBottle ? wineById.get(selectedBottle.wineId) : undefined;

  async function addBottle(draft: WineDraft, shelf: Shelf, positions: PositionDraft[]) {
    if (dataMode === "remote") {
      const client = neonClient;
      if (!client || !remoteCellarId) throw new Error("A conexão com a adega não está pronta. Tente novamente.");
      const { error } = await client.rpc("register_wine_bottles", {
        p_cellar_id: remoteCellarId,
        p_shelf_id: shelf.id,
        p_wine: {
          name: titleCase(draft.name),
          producer: titleCase(draft.producer),
          vintage: titleCase(draft.vintage),
          country: titleCase(draft.country),
          region: titleCase(draft.region),
          grapes: draft.grape.split(/[,;/]/).map((grape) => titleCase(grape)).filter(Boolean),
          custom_value: titleCase(draft.customValue ?? ""),
        },
        p_positions: positions.map(({ row, column }) => ({ row, column })),
      });

      if (error) {
        if (error.code === "23505") throw new Error("Uma dessas posições acabou de ser ocupada. Escolha outras posições livres.");
        if (error.code === "23514") throw new Error("A prateleira rejeitou a posição ou a categoria do vinho. Confira os dados e tente de novo.");
        throw new Error(error.message || "Não foi possível salvar as garrafas.");
      }

      const inventory = await fetchCellarInventory(client, remoteCellarId);
      setCellar(inventory);
      setActiveShelfId(shelf.id);
      setSelectedPosition(positions[0]?.key ?? null);
      setShowAddBottle(false);
      setPreferredPositionKey(null);
      setToast(`${positions.length} ${positions.length === 1 ? "garrafa adicionada" : "garrafas adicionadas"} à adega`);
      return;
    }

    const existingWine = cellar.wines.find((wine) => sameWine(wine, draft));
    const wine: WineRecord = existingWine ?? {
      id: crypto.randomUUID(),
      ...draft,
      name: titleCase(draft.name),
      producer: titleCase(draft.producer),
      vintage: titleCase(draft.vintage),
      country: titleCase(draft.country),
      region: titleCase(draft.region),
      grape: titleCase(draft.grape),
      customValue: titleCase(draft.customValue ?? ""),
    };
    const newBottles = positions.map((position) => ({
      id: crypto.randomUUID(),
      wineId: wine.id,
      shelfId: shelf.id,
      row: position.row,
      column: position.column,
    }));

    setCellar((current) => ({
      ...current,
      wines: existingWine ? current.wines : [...current.wines, wine],
      bottles: [...current.bottles, ...newBottles],
    }));
    setActiveShelfId(shelf.id);
    setSelectedPosition(positions[0]?.key ?? null);
    setShowAddBottle(false);
    setToast(`${positions.length} ${positions.length === 1 ? "garrafa adicionada" : "garrafas adicionadas"} à adega`);
  }

  async function addShelf(shelf: Omit<Shelf, "id">) {
    let newShelf: Shelf;
    if (dataMode === "remote") {
      const client = neonClient;
      if (!client || !remoteCellarId) throw new Error("A conexão com a adega não está pronta. Tente novamente.");
      const { data, error } = await client.from("shelves").insert({
        cellar_id: remoteCellarId,
        name: shelf.name,
        row_count: shelf.rows,
        column_count: shelf.columns,
        organization: shelf.organization,
        rule_criterion: shelf.rule?.criterion ?? null,
        rule_axis: shelf.rule?.axis ?? null,
        rule_values: shelf.rule?.values ?? null,
      }).select("*").single();
      if (error) throw new Error(error.message || "Não foi possível criar a prateleira.");
      newShelf = shelfFromDatabase(data);
    } else {
      newShelf = { ...shelf, id: crypto.randomUUID() };
    }
    setCellar((current) => ({ ...current, shelves: [...current.shelves, newShelf] }));
    setActiveShelfId(newShelf.id);
    setView("map");
    setSelectedPosition(null);
    setShowAddShelf(false);
    setToast("Prateleira criada");
  }

  async function updateShelf(shelfId: string, shelf: Omit<Shelf, "id">) {
    const outOfBoundsBottle = cellar.bottles.find((bottle) =>
      bottle.shelfId === shelfId && (bottle.row > shelf.rows || bottle.column > shelf.columns),
    );
    if (outOfBoundsBottle) {
      throw new Error("Mova as garrafas que estão fora do novo tamanho antes de reduzir a prateleira.");
    }

    let updatedShelf: Shelf;
    if (dataMode === "remote") {
      const client = neonClient;
      if (!client) throw new Error("A conexão com a adega não está pronta. Tente novamente.");
      const { data, error } = await client.from("shelves").update({
        name: shelf.name,
        row_count: shelf.rows,
        column_count: shelf.columns,
        organization: shelf.organization,
        rule_criterion: shelf.rule?.criterion ?? null,
        rule_axis: shelf.rule?.axis ?? null,
        rule_values: shelf.rule?.values ?? null,
      }).eq("id", shelfId).select("*").single();
      if (error) throw new Error(error.message || "Não foi possível atualizar a prateleira.");
      updatedShelf = shelfFromDatabase(data);
    } else {
      updatedShelf = { ...shelf, id: shelfId };
    }

    setCellar((current) => ({
      ...current,
      shelves: current.shelves.map((item) => item.id === shelfId ? updatedShelf : item),
    }));
    setEditingShelf(null);
    setToast("Prateleira atualizada");
  }

  async function moveBottle(bottle: Bottle) {
    const shelf = cellar.shelves.find((item) => item.id === bottle.shelfId);
    if (!shelf) return;
    const destination = window.prompt(`Mover ${wineById.get(bottle.wineId)?.name ?? "garrafa"}. Informe destino como prateleira/linha/coluna. Prateleiras: ${cellar.shelves.map((item) => item.name).join(", ")}`, `${shelf.name}/${bottle.row}/${bottle.column}`);
    if (!destination) return;
    const [shelfName, rowText, columnText] = destination.split("/").map((part) => part.trim());
    const targetShelf = cellar.shelves.find((item) => item.name.toLocaleLowerCase("pt-BR") === shelfName.toLocaleLowerCase("pt-BR"));
    const row = Number(rowText), column = Number(columnText);
    if (!targetShelf || !Number.isInteger(row) || !Number.isInteger(column) || row < 1 || row > targetShelf.rows || column < 1 || column > targetShelf.columns) {
      setToast("Destino inválido. Use nome da prateleira/linha/coluna."); return;
    }
    if (targetShelf.id === bottle.shelfId && row === bottle.row && column === bottle.column) { setToast("A garrafa já está nessa posição."); return; }
    const fits = (wineId: string, destinationShelf: Shelf, destinationRow: number, destinationColumn: number) => {
      const wine = wineById.get(wineId), rule = destinationShelf.rule;
      return !rule || (!!wine && wineMatchesCategory(wine, rule.criterion, rule.values[(rule.axis === "row" ? destinationRow : destinationColumn) - 1] ?? ""));
    };
    const occupant = cellar.bottles.find((item) => item.id !== bottle.id && item.shelfId === targetShelf.id && item.row === row && item.column === column);
    if (!fits(bottle.wineId, targetShelf, row, column) || (occupant && !fits(occupant.wineId, shelf, bottle.row, bottle.column))) { setToast("A posição não aceita a categoria deste vinho."); return; }
    if (occupant && !window.confirm("Esta posição está ocupada. Deseja trocar as duas garrafas?")) return;
    if (dataMode === "remote") {
      const { error } = occupant
        ? await neonClient!.rpc("swap_bottles", { p_cellar_id: remoteCellarId, p_first: bottle.id, p_second: occupant.id })
        : await neonClient!.rpc("move_bottle", { p_cellar_id: remoteCellarId, p_bottle_id: bottle.id, p_shelf_id: targetShelf.id, p_row: row, p_column: column });
      if (error) { setToast(error.code === "23505" ? "Essa posição já está ocupada." : error.message); return; }
      const updated = await fetchCellarInventory(neonClient!, remoteCellarId!);
      setCellar(updated);
    } else {
      const now = new Date().toISOString();
      const event = (item: Bottle, toShelfId: string, toRow: number, toColumn: number) => ({ id: crypto.randomUUID(), bottleId: item.id, wineId: item.wineId, type: "move" as const, fromShelfId: item.shelfId, fromRow: item.row, fromColumn: item.column, toShelfId, toRow, toColumn, reason: null, createdAt: now });
      setCellar(current => ({ ...current, bottles: current.bottles.map(item => item.id === bottle.id ? { ...item, shelfId: targetShelf.id, row, column } : item.id === occupant?.id ? { ...item, shelfId: bottle.shelfId, row: bottle.row, column: bottle.column } : item), movements: [event(bottle, targetShelf.id, row, column), ...(occupant ? [event(occupant, bottle.shelfId, bottle.row, bottle.column)] : []), ...(current.movements ?? [])] }));
    }
    setActiveShelfId(targetShelf.id); setSelectedPosition(positionKey(targetShelf.id,row,column)); setToast("Garrafa movida; movimentação registrada.");
  }

  async function removeBottle(bottle: Bottle) {
    const reason = window.prompt("Motivo da retirada (opcional):");
    if (reason === null) return;
    if (reason.length > 2000) { setToast("O motivo deve ter no máximo 2000 caracteres."); return; }
    if (!window.confirm("Confirmar a retirada desta garrafa da adega?")) return;
    if (dataMode === "remote") {
      const { error } = await neonClient!.rpc("remove_bottle", { p_cellar_id: remoteCellarId, p_bottle_id: bottle.id, p_reason: reason || null });
      if (error) { setToast(error.message); return; }
      setCellar(await fetchCellarInventory(neonClient!, remoteCellarId!));
    } else {
      setCellar(current => ({ ...current, bottles: current.bottles.filter(item => item.id !== bottle.id), movements: [{ id: crypto.randomUUID(), bottleId: bottle.id, wineId: bottle.wineId, type: "remove", fromShelfId: bottle.shelfId, fromRow: bottle.row, fromColumn: bottle.column, toShelfId: null, toRow: null, toColumn: null, reason: reason.trim() || null, createdAt: new Date().toISOString() }, ...(current.movements ?? [])] }));
    }
    setSelectedPosition(null); setToast("Retirada registrada; posição liberada.");
  }

  async function reviewBottle(bottle: Bottle) {
    const current = (cellar.reviews ?? []).find(item => item.bottleId === bottle.id);
    const rating = window.prompt("Nota de 1 a 5 (deixe em branco para apenas comentar):", current?.rating?.toString() ?? "");
    if (rating === null) return;
    const value = rating.trim() === "" ? null : Number(rating);
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) { setToast("A nota deve ser de 1 a 5."); return; }
    const comment = window.prompt("Comentário opcional:", current?.comment ?? "");
    if (comment === null) return;
    if (comment.length > 2000 || (value === null && !comment.trim())) { setToast("Informe uma nota ou comentário de até 2000 caracteres."); return; }
    if (dataMode === "remote") {
      const { error } = await neonClient!.from("bottle_reviews").upsert({ cellar_id: remoteCellarId, bottle_id: bottle.id, rating: value, comment: comment.trim() || null, updated_at: new Date().toISOString() }, { onConflict: "bottle_id" });
      if (error) { setToast(error.message); return; }
      setCellar(await fetchCellarInventory(neonClient!, remoteCellarId!));
    } else {
      setCellar(currentState => ({ ...currentState, reviews: [...(currentState.reviews ?? []).filter(item => item.bottleId !== bottle.id), { bottleId: bottle.id, wineId: bottle.wineId, rating: value, comment: comment.trim() || null }] }));
    }
    setToast("Avaliação salva para esta garrafa.");
  }

  function resetExample() {
    if (!window.confirm("Restaurar os vinhos de exemplo vai substituir os dados desta demonstração neste navegador. Quer continuar?")) return;
    const example = createExampleCellar();
    setCellar(example);
    setActiveShelfId(example.shelves[0].id);
    setSelectedPosition(null);
    setSearch("");
    setToast("Exemplo restaurado neste navegador");
  }

  async function signOut() {
    const client = neonClient;
    if (!client) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch {
      setToast("Não foi possível sair da conta. Tente novamente.");
      return;
    }
    setRemoteCellarId(null);
    setRemoteEmail("");
    setDataMode("signed-out");
  }

  function openLocalDemo() {
    const demoCellar = readStoredCellar() ?? createExampleCellar();
    setCellar(demoCellar);
    setActiveShelfId(demoCellar.shelves[0].id);
    setRemoteCellarId(null);
    setSelectedPosition(null);
    setDataMode("local");
    setToast("Demonstração local aberta neste navegador");
  }

  function openBottleModal(positionKeyToPreselect: string | null = null) {
    setPreferredPositionKey(positionKeyToPreselect);
    setShowAddBottle(true);
  }

  const wineCounts = new Map<string, number>();
  cellar.bottles.forEach((bottle) => wineCounts.set(bottle.wineId, (wineCounts.get(bottle.wineId) ?? 0) + 1));
  const averageForWine = (wineId: string) => { const ratings = (cellar.reviews ?? []).filter(r => r.wineId === wineId && r.rating !== null).map(r => r.rating as number); return ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5 · ${ratings.length} ${ratings.length === 1 ? "avaliação" : "avaliações"}` : "Ainda sem notas"; };
  const displayedWines = cellar.wines
    .filter((wine) => matchesSearch(wine, search))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

  if (dataMode === "checking" || (dataMode === "local" && !hydrated)) return <ConnectionStateScreen title="Abrindo sua adega" message="Estamos carregando suas prateleiras." />;
  if (dataMode === "signed-out" && neonClient) {
    return <AuthScreen client={neonClient} onAuthenticated={(user) => loadRemoteCellar(neonClient, user)} />;
  }
  if (dataMode === "error") return <ConnectionErrorScreen message={connectionError} onOpenDemo={openLocalDemo} />;
  if (!activeShelf) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="Adega, início">
          <span className="brand-mark"><Wine size={20} strokeWidth={1.7} /></span>
          <span className="brand-wordmark">ADEGA<span>pessoal</span></span>
        </a>

        <div className="sidebar-label">SUA COLEÇÃO</div>
        <nav className="main-nav" aria-label="Navegação principal">
          <button className={view === "map" ? "nav-item active" : "nav-item"} onClick={() => setView("map")}>
            <LayoutDashboard size={18} /> <span>Mapa da adega</span>
          </button>
          <button className={view === "wines" ? "nav-item active" : "nav-item"} onClick={() => setView("wines")}>
            <Archive size={18} /> <span>Meus vinhos</span>
          </button>
          <button className={view === "history" ? "nav-item active" : "nav-item"} onClick={() => setView("history")}><Archive size={18} /> <span>Histórico</span></button>
        </nav>

        <div className="sidebar-divider" />
        <div className="sidebar-label shelf-label">PRATELEIRAS <span>{cellar.shelves.length}</span></div>
        <div className="sidebar-shelves">
          {cellar.shelves.map((shelf) => (
            <button
              key={shelf.id}
              className={activeShelfId === shelf.id ? "shelf-link selected" : "shelf-link"}
              onClick={() => { setActiveShelfId(shelf.id); setView("map"); setSelectedPosition(null); }}
            >
              <span className="shelf-link-icon"><Grid2X2 size={16} /></span>
              <span className="shelf-link-name">{shelf.name}</span>
              <span className="shelf-link-count">{cellar.bottles.filter((bottle) => bottle.shelfId === shelf.id).length}</span>
            </button>
          ))}
          <button className="add-shelf-link" onClick={() => setShowAddShelf(true)}><Plus size={15} /> Nova prateleira</button>
        </div>

        <div className="sidebar-spacer" />
        <div className="local-status">
          <span className="local-status-dot" />
          <div><strong>{dataMode === "remote" ? "Conta conectada" : "Protótipo local"}</strong><small>{dataMode === "remote" ? "Adega sincronizada" : "Salvo neste navegador"}</small></div>
          {dataMode === "local" && <button className="help-button" aria-label="Sobre os dados locais" title="Os dados ainda não são sincronizados com uma conta ou servidor."><CircleHelp size={16} /></button>}
        </div>
        {dataMode === "local" && <button className="reset-link" onClick={resetExample}>Restaurar dados de exemplo</button>}
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumbs"><span>Minha adega</span><span className="breadcrumb-slash">/</span><strong>{view === "map" ? "Mapa" : view === "history" ? "Histórico" : "Vinhos"}</strong></div>
          <div className="topbar-right">
            <span className="topbar-note"><span className="status-pulse" /> {dataMode === "remote" ? "Sincronizado com sua conta" : "Seus dados estão neste dispositivo"}</span>
            <button className="profile-button" aria-label={dataMode === "remote" ? `Sair da conta ${remoteEmail}` : "Perfil da demonstração local"} title={dataMode === "remote" ? "Sair da conta" : "Demonstração local"} onClick={() => { if (dataMode === "remote") void signOut(); }}>{dataMode === "remote" ? (remoteEmail[0]?.toLocaleUpperCase("pt-BR") ?? "V") : "N"}</button>
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

          <section className="stats-row" aria-label="Resumo da coleção">
            <article className="stat-card">
              <span className="stat-icon burgundy"><BottleWine size={18} /></span>
              <div className="stat-copy"><span>Garrafas na adega</span><strong>{cellar.bottles.length}</strong></div>
              <span className="stat-trend"><ArrowUpRight size={14} /> coleção</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon olive"><Grid2X2 size={18} /></span>
              <div className="stat-copy"><span>Espaços ocupados</span><strong>{occupiedPercent}<small>%</small></strong></div>
              <span className="stat-trend muted"><ArrowDownRight size={14} /> {freePositions} livres</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon sand"><Archive size={18} /></span>
              <div className="stat-copy"><span>Prateleiras</span><strong>{cellar.shelves.length}</strong></div>
              <span className="stat-trend muted">{totalCapacity} posições</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon lavender"><Wine size={18} /></span>
              <div className="stat-copy"><span>Rótulos diferentes</span><strong>{wineCounts.size}</strong></div>
              <span className="stat-trend muted">na coleção</span>
            </article>
          </section>

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
              <div className="map-layout">
                <div className="map-main">
                  <div className="shelf-tabs" aria-label="Selecione a prateleira">
                    {cellar.shelves.map((shelf) => {
                      const count = cellar.bottles.filter((bottle) => bottle.shelfId === shelf.id).length;
                      return <button key={shelf.id} aria-pressed={activeShelf.id === shelf.id} className={activeShelf.id === shelf.id ? "shelf-tab active" : "shelf-tab"} onClick={() => { setActiveShelfId(shelf.id); setSelectedPosition(null); }}>
                        <span>{shelf.name}</span><small>{count}/{shelf.rows * shelf.columns}</small>
                      </button>;
                    })}
                  </div>

                  <div className="shelf-caption-row">
                    <div className="shelf-caption"><span className="shelf-number">{String(cellar.shelves.indexOf(activeShelf) + 1).padStart(2, "0")}</span><div><strong>{activeShelf.name}</strong><small>{activeShelf.rows} linhas <span>·</span> {activeShelf.columns} colunas <span>·</span> {activeShelf.organization === "free" ? "organização livre" : `por ${activeShelf.rule ? criterionLabel(activeShelf.rule.criterion) : "critério"}`}</small></div></div>
                    <span className="capacity-pill"><span className="capacity-dot" /> {activeShelfBottles.length} de {activeShelf.rows * activeShelf.columns} posições</span>
                  </div>

                  {activeShelf.rule && <div className="rule-note"><Leaf size={15} /><span>Organizada por <strong>{criterionNames[activeShelf.rule.criterion].toLocaleLowerCase("pt-BR")}</strong> nas {activeShelf.rule.axis === "row" ? "linhas" : "colunas"}.</span><span className="rule-values">{activeShelf.rule.values.join(" · ")}</span></div>}

                  <div className="rack-outer">
                    <div className="rack-heading"><span>PRATELEIRA</span><span>POSIÇÃO FÍSICA</span></div>
                    <div className="rack-body">
                      <div className="rack-row-numbers" style={{ gridTemplateRows: `repeat(${activeShelf.rows}, minmax(25px, 1fr))` }} aria-hidden="true">{Array.from({ length: activeShelf.rows }, (_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}</div>
                      <div className="rack-content">
                        <div className="shelf-grid" style={{ gridTemplateColumns: `repeat(${activeShelf.columns}, minmax(0, 1fr))` }}>
                          {Array.from({ length: activeShelf.rows * activeShelf.columns }, (_, index) => {
                            const row = Math.floor(index / activeShelf.columns) + 1;
                            const column = (index % activeShelf.columns) + 1;
                            const key = positionKey(activeShelf.id, row, column);
                            const bottle = bottleByPosition.get(key);
                            const wine = bottle ? wineById.get(bottle.wineId) : undefined;
                            const matches = !search || (wine ? matchesSearch(wine, search) : false);
                            const isSelected = selectedPosition === key;
                            return <button
                              key={key}
                              className={`shelf-cell ${bottle ? "occupied" : "empty"} ${isSelected ? "selected" : ""} ${search && !matches ? "dimmed" : ""}`}
                              aria-label={`${activeShelf.name}, linha ${row}, coluna ${column}${wine ? `, ${wine.name} de ${wine.producer}` : ", posição livre"}`}
                              title={wine ? `${wine.name} · ${wine.producer} · L${row} C${column}` : `Livre · L${row} C${column}`}
                              onClick={() => setSelectedPosition(key)}
                            >
                              {bottle ? <span className="cell-bottle"><Wine size={15} strokeWidth={1.8} /></span> : <span className="cell-empty-mark" />}
                              <span className="cell-index">{String(column).padStart(2, "0")}</span>
                            </button>;
                          })}
                        </div>
                        <div className="rack-column-numbers" style={{ gridTemplateColumns: `repeat(${activeShelf.columns}, minmax(0, 1fr))` }} aria-hidden="true">
                          {Array.from({ length: activeShelf.columns }, (_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="rack-footer"><span><span className="legend-dot filled" /> Ocupada</span><span><span className="legend-dot vacant" /> Livre</span><span className="rack-footer-hint">Clique em uma posição para ver detalhes</span></div>
                  </div>

                  <div className="map-footnote"><Sparkles size={15} /><span>As posições são numeradas por linha e coluna para você encontrar cada garrafa com facilidade.</span></div>
                </div>

                <aside className="position-panel">
                  <div className="panel-topline"><span>DETALHES DA POSIÇÃO</span>{selectedPosition && <button className="icon-button" onClick={() => setSelectedPosition(null)} aria-label="Fechar detalhes"><X size={15} /></button>}</div>
                  {!selectedPosition ? (
                    <div className="empty-selection"><span className="selection-illustration"><Grid2X2 size={23} /></span><h3>Escolha um espaço</h3><p>Toque em qualquer posição do mapa para ver a garrafa ou descobrir se ela está livre.</p><div className="selection-tip"><span>↳</span> Cada espaço tem um endereço único</div></div>
                  ) : selectedBottle && selectedWine ? (
                    <div className="position-details">
                      <div className="position-number"><span className="position-number-icon"><Wine size={19} /></span><span>{activeShelf.name}<strong>Linha {String(selectedBottle.row).padStart(2, "0")} <i>·</i> Coluna {String(selectedBottle.column).padStart(2, "0")}</strong></span></div>
                      <div className="detail-bottle-illustration"><div className="bottle-glow" /><BottleWine size={49} strokeWidth={1.15} /><span>EM SUA COLEÇÃO</span></div>
                      <div className="detail-wine-title"><h3>{selectedWine.name}</h3><p>{selectedWine.producer}</p></div>
                      <div className="wine-facts">
                        {selectedWine.vintage && <div><span>Safra</span><strong>{selectedWine.vintage}</strong></div>}
                        {selectedWine.country && <div><span>País</span><strong>{selectedWine.country}</strong></div>}
                        {selectedWine.region && <div><span>Região</span><strong>{selectedWine.region}</strong></div>}
                        {selectedWine.grape && <div><span>Uva(s)</span><strong>{selectedWine.grape}</strong></div>}
                      </div>
                      <div className="position-status">Média do vinho: {averageForWine(selectedWine.id)}</div>
                      <div className="detail-actions">
                        <button className="secondary-button" onClick={() => void reviewBottle(selectedBottle)}>Avaliar garrafa</button>
                        <button className="secondary-button" onClick={() => void moveBottle(selectedBottle)}>Mover</button>
                        <button className="text-button" onClick={() => void removeBottle(selectedBottle)}>Retirar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="position-details vacant-details">
                      <div className="position-number"><span className="position-number-icon vacant-icon"><Grid2X2 size={18} /></span><span>{activeShelf.name}<strong>Linha {selectedPosition.split(":")[1]} <i>·</i> Coluna {selectedPosition.split(":")[2]}</strong></span></div>
                      <span className="free-badge"><span className="capacity-dot" /> POSIÇÃO LIVRE</span>
                      <h3>Um espaço esperando por um vinho.</h3>
                      <p>Registre uma garrafa e escolha exatamente onde ela vai ficar.</p>
                      <button className="outline-add-button" onClick={() => openBottleModal(selectedPosition)}><Plus size={16} /> Adicionar garrafa aqui</button>
                    </div>
                  )}
                  <div className="panel-bottom"><div className="wine-rule" /><div><strong>Seu mapa, suas regras.</strong><p>{dataMode === "remote" ? "As alterações são salvas na sua conta." : "Os dados de exemplo podem ser substituídos pelos da sua coleção."}</p></div></div>
                </aside>
              </div>
            ) : view === "history" ? (
              <div className="history-list">
                {(cellar.movements ?? []).filter(m => { const wine = wineById.get(m.wineId); return wine && matchesSearch(wine, search); }).map(m => {
                  const wine = wineById.get(m.wineId);
                  const position = (id: string | null, row: number | null, column: number | null) => id ? `${cellar.shelves.find(s => s.id === id)?.name ?? "Prateleira"} · L${row} / C${column}` : "—";
                  const review = (cellar.reviews ?? []).find(r => r.bottleId === m.bottleId);
                  return <article className="history-item" key={m.id}><div><strong>{wine?.name ?? "Vinho"}</strong><small>{wine?.producer} · {new Date(m.createdAt).toLocaleString("pt-BR")}</small><p>{m.type === "remove" ? "Retirada" : "Movimentação"}: {position(m.fromShelfId, m.fromRow, m.fromColumn)}{m.type === "move" && <> → {position(m.toShelfId, m.toRow, m.toColumn)}</>}</p>{m.reason && <p>Motivo: {m.reason}</p>}{review && <p>Avaliação: {review.rating ? `${review.rating} / 5` : "sem nota"}{review.comment && ` · ${review.comment}`}</p>}</div><button className="secondary-button" onClick={() => void reviewBottle({ id: m.bottleId, wineId: m.wineId, shelfId: m.fromShelfId, row: m.fromRow, column: m.fromColumn })}>{review ? "Editar avaliação" : "Avaliar"}</button></article>;
                })}
                {!(cellar.movements ?? []).some(m => { const wine = wineById.get(m.wineId); return wine && matchesSearch(wine, search); }) && <div className="empty-list">Nenhuma movimentação encontrada.</div>}
              </div>
            ) : (
              <div className="wine-list-view">
                <div className="wine-list-head"><span>RÓTULO</span><span>ORIGEM</span><span>SAFRA</span><span>GARRAFAS</span><span>POSIÇÃO</span></div>
                {displayedWines.length ? displayedWines.map((wine) => {
                  const firstBottle = cellar.bottles.find((bottle) => bottle.wineId === wine.id);
                  const shelf = cellar.shelves.find((item) => item.id === firstBottle?.shelfId);
                  return <button key={wine.id} className="wine-list-row" onClick={() => {
                    if (!firstBottle) return;
                    setActiveShelfId(firstBottle.shelfId);
                    setSelectedPosition(positionKey(firstBottle.shelfId, firstBottle.row, firstBottle.column));
                    setView("map");
                  }}>
                    <span className="wine-name-cell"><span className="wine-list-icon"><Wine size={17} /></span><span><strong>{wine.name}</strong><small>{wine.producer}</small></span></span>
                    <span className="wine-origin-cell">{wine.region || wine.country || "—"}</span>
                    <span className="wine-vintage-cell">{wine.vintage || "Sem safra"}</span>
                    <span className="wine-count-cell">{wineCounts.get(wine.id) ?? 0} <small>garrafas · {averageForWine(wine.id)}</small></span>
                    <span className="wine-position-cell">{shelf ? <>{shelf.name}<small>L{firstBottle?.row} · C{firstBottle?.column}</small></> : "—"}<ArrowUpRight size={15} /></span>
                  </button>;
                }) : <div className="empty-list"><Wine size={25} /><strong>Nenhum vinho encontrado</strong><span>Tente outra busca ou registre um novo rótulo.</span></div>}
                <button className="list-add-row" onClick={() => openBottleModal()}><Plus size={16} /> Cadastrar vinho manualmente</button>
              </div>
            )}
          </section>

          <footer className="page-footer"><span>Feito para cuidar bem do que vale a pena guardar.</span><span>Adega pessoal <i>·</i> primeira versão</span></footer>
        </div>
      </main>

      {showAddBottle && <AddBottleModal shelves={cellar.shelves} wines={cellar.wines} bottles={cellar.bottles} neonClient={neonClient} initialShelfId={activeShelf.id} initialPositionKey={preferredPositionKey} onClose={() => { setShowAddBottle(false); setPreferredPositionKey(null); }} onSave={addBottle} />}
      {showAddShelf && <AddShelfModal onClose={() => setShowAddShelf(false)} onSave={addShelf} />}
      {editingShelf && <AddShelfModal key={editingShelf.id} shelf={editingShelf} onClose={() => setEditingShelf(null)} onSave={(shelf) => updateShelf(editingShelf.id, shelf)} />}
      {toast && <div className="toast-message" role="status"><span><Check size={15} /></span>{toast}</div>}
    </div>
  );
}

function AddBottleModal({
  shelves,
  wines,
  bottles,
  neonClient,
  initialShelfId,
  initialPositionKey,
  onClose,
  onSave,
}: {
  shelves: Shelf[];
  wines: WineRecord[];
  bottles: Bottle[];
  neonClient: ReturnType<typeof createNeonBrowserClient> | null;
  initialShelfId: string;
  initialPositionKey: string | null;
  onClose: () => void;
  onSave: (draft: WineDraft, shelf: Shelf, positions: PositionDraft[]) => void | Promise<void>;
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
  const shelf = shelves.find((item) => item.id === shelfId) ?? shelves[0];
  const reserved = useMemo(() => new Set(bottles.map((bottle) => positionKey(bottle.shelfId, bottle.row, bottle.column))), [bottles]);
  const duplicateMatch = wines.find((wine) => sameWine(wine, draft));
  const effectiveWine: WineRecord = {
    id: duplicateMatch?.id ?? "draft",
    name: draft.name || duplicateMatch?.name || "",
    producer: draft.producer || duplicateMatch?.producer || "",
    vintage: draft.vintage || duplicateMatch?.vintage || "",
    country: draft.country || duplicateMatch?.country || "",
    region: draft.region || duplicateMatch?.region || "",
    grape: draft.grape || duplicateMatch?.grape || "",
    customValue: draft.customValue || duplicateMatch?.customValue || "",
  };
  const ruleValue = shelf?.rule ? categoryForWine(effectiveWine, shelf.rule.criterion) : "";
  const positions = shelf ? Array.from({ length: shelf.rows * shelf.columns }, (_, index) => ({
    row: Math.floor(index / shelf.columns) + 1,
    column: (index % shelf.columns) + 1,
    key: positionKey(shelf.id, Math.floor(index / shelf.columns) + 1, (index % shelf.columns) + 1),
  })) : [];
  const eligiblePositions = positions.filter((position) => {
    if (reserved.has(position.key)) return false;
    if (shelf?.organization !== "structured") return true;
    if (!shelf.rule || !ruleValue.trim()) return false;
    const axisValue = shelf.rule.values[shelf.rule.axis === "row" ? position.row - 1 : position.column - 1];
    return wineMatchesCategory(effectiveWine, shelf.rule.criterion, axisValue);
  });
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

  async function searchWineCatalog() {
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
      const { data: authData, error: authError } = await neonClient?.auth.getSession() ?? { data: null, error: null };
      const accessToken = authData?.session?.access_token;
      if (authError || !accessToken) throw new Error("Entre na sua conta da adega para pesquisar vinhos.");
      const response = await fetch(`/api/wineapi/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json() as { results?: WineCatalogCandidate[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível pesquisar vinhos.");
      setCatalogResults(data.results ?? []);
      if (!data.results?.length) setCatalogMessage("Nenhum resultado. Você pode preencher a ficha manualmente abaixo.");
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
      const { data: authData, error: authError } = await neonClient?.auth.getSession() ?? { data: null, error: null };
      const accessToken = authData?.session?.access_token;
      if (authError || !accessToken) throw new Error("Entre na sua conta da adega para carregar a ficha.");
      const response = await fetch(`/api/wineapi/wines/${encodeURIComponent(candidate.id)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json() as {
        error?: string;
        name?: string;
        vintage?: string | number | null;
        winery?: WineApiReference;
        region?: WineApiReference;
        country?: string | null;
        grapes?: Array<string | { name?: string }> | null;
      };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dados desse vinho.");

      const regionCountry = typeof data.region === "object" && data.region ? data.region.country : "";
      const grapes = Array.isArray(data.grapes)
        ? data.grapes.map((grape) => typeof grape === "string" ? grape : grape.name ?? "").filter(Boolean).join(", ")
        : "";
      setDraft({
        ...blankWine,
        name: data.name ?? candidate.name,
        producer: catalogReferenceName(data.winery) || catalogReferenceName(candidate.winery),
        vintage: data.vintage == null ? (candidate.vintage == null ? "" : String(candidate.vintage)) : String(data.vintage),
        country: data.country ?? regionCountry ?? candidate.country ?? "",
        region: catalogReferenceName(data.region) || catalogReferenceName(candidate.region),
        grape: grapes,
      });
      setCatalogMessage(grapes
        ? "Ficha preenchida. Revise os campos antes de adicionar as garrafas."
        : "A WineAPI não informou a uva para este vinho. Revise os campos e preencha a uva manualmente, se souber.");
      setSelectedKeys([]);
    } catch (selectionError) {
      setCatalogMessage(selectionError instanceof Error ? selectionError.message : "Falha ao carregar a ficha do vinho.");
    } finally {
      setLoadingCandidateId("");
    }
  }

  function isRuleField(field: "country" | "region" | "grape" | "vintage" | "customValue") {
    if (shelf?.organization !== "structured" || !shelf.rule) return false;
    return shelf.rule.criterion === (field === "customValue" ? "custom" : field);
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
    if (shelf.organization === "structured" && !ruleValue.trim()) {
      setError(`Informe a ${criterionLabel(shelf.rule?.criterion ?? "custom")} usada nesta prateleira.`);
      return;
    }
    const selectedPositions = positions.filter((position) => visibleSelectedKeys.includes(position.key));
    setSaving(true);
    try {
      await onSave(draft, shelf, selectedPositions);
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
          <section className="catalog-search" aria-label="Buscar vinho no catálogo">
            <div className="catalog-search-row">
              <label className="field"><span>Nome, produtor ou safra</span><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchWineCatalog(); } }} placeholder="Ex.: Quara Estate Malbec 2016" /></label>
              <button type="button" className="secondary-button catalog-search-button" onClick={() => void searchWineCatalog()} disabled={searchingCatalog || loadingCandidateId !== ""}>
                {searchingCatalog ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />} Buscar
              </button>
            </div>
            {catalogMessage && <p className="catalog-message" role="status">{catalogMessage}</p>}
            {catalogResults.length > 0 && <>
              <div className="catalog-results-heading" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 2 }}><strong style={{ color: "#554b42", fontSize: 11, fontWeight: 650 }}>Resultados</strong><span style={{ color: "#9a9084", fontSize: 9 }}>{catalogResults.length} opções · selecione uma para carregar a ficha</span></div>
              <div className="catalog-results" role="list" aria-label="Resultados da WineAPI" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 9, maxHeight: 300, overflowY: "auto", padding: "1px 3px 3px 1px", alignContent: "start" }}>
                {catalogResults.map((candidate) => {
                  const location = [catalogReferenceName(candidate.region), candidate.country].filter(Boolean).join(" · ");
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
            <label className="field"><span>Safra{isRuleField("vintage") && <i>*</i>}</span><input value={draft.vintage} onChange={(event) => updateDraft("vintage", event.target.value)} placeholder="Ex.: 2020" required={isRuleField("vintage")} /></label>
            <label className="field"><span>País{isRuleField("country") && <i>*</i>}</span><input value={draft.country} onChange={(event) => updateDraft("country", event.target.value)} placeholder="Ex.: Argentina" required={isRuleField("country")} /></label>
            <label className="field"><span>Região{isRuleField("region") && <i>*</i>}</span><input value={draft.region} onChange={(event) => updateDraft("region", event.target.value)} placeholder="Ex.: Mendoza" required={isRuleField("region")} /></label>
            <label className="field"><span>Uva(s){isRuleField("grape") && <i>*</i>}</span><input value={draft.grape} onChange={(event) => updateDraft("grape", event.target.value)} placeholder="Ex.: Malbec" required={isRuleField("grape")} /></label>
            {shelf?.organization === "structured" && shelf.rule?.criterion === "custom" && <label className="field full"><span>{criterionNames.custom} <i>*</i></span><input value={draft.customValue ?? ""} onChange={(event) => updateDraft("customValue", event.target.value)} placeholder="Informe o valor desta categoria" required={isRuleField("customValue")} /></label>}
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
              const axisValue = shelf?.rule?.values[shelf.rule.axis === "row" ? position.row - 1 : position.column - 1];
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

function AddShelfModal({ onClose, onSave, shelf }: { onClose: () => void; onSave: (shelf: Omit<Shelf, "id">) => void | Promise<void>; shelf?: Shelf }) {
  const [name, setName] = useState(shelf?.name ?? "");
  const [rows, setRows] = useState(shelf?.rows ?? 5);
  const [columns, setColumns] = useState(shelf?.columns ?? 8);
  const [organization, setOrganization] = useState<Shelf["organization"]>(shelf?.organization ?? "free");
  const [criterion, setCriterion] = useState<WineCriterion>(shelf?.rule?.criterion ?? "country");
  const [axis, setAxis] = useState<ShelfAxis>(shelf?.rule?.axis ?? "row");
  const [valueInput, setValueInput] = useState(shelf?.rule?.values.join(", ") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ruleValues = valueInput.split(",").map((value) => value.trim()).filter(Boolean);
  const requiredValues = axis === "row" ? rows : columns;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organization === "structured" && ruleValues.length !== requiredValues) {
      setError(`Informe exatamente ${requiredValues} categorias, separadas por vírgula.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: titleCase(name),
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
              <label className="field"><span>Organizar por</span><select value={axis} onChange={(event) => { setAxis(event.target.value as "row" | "column"); setError(""); }}><option value="row">Linhas</option><option value="column">Colunas</option></select></label>
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

function AuthScreen({
  client,
  onAuthenticated,
}: {
  client: ReturnType<typeof createNeonBrowserClient>;
  onAuthenticated: (user: { id: string; email?: string | null }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (mode === "sign-in") {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.user) throw new Error("Não foi possível confirmar sua conta.");
        await onAuthenticated(data.user);
        return;
      }

      const { data, error: authError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: email.trim().split("@")[0] },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      if (data.session && data.user) {
        await onAuthenticated(data.user);
      } else {
        setMessage("Conta criada. Confirme seu e-mail e depois entre para abrir sua adega.");
        setMode("sign-in");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Não foi possível concluir o acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="brand auth-brand"><span className="brand-mark"><Wine size={20} /></span><span className="brand-wordmark">ADEGA<span>pessoal</span></span></div>
      <section className="auth-card">
        <div className="auth-emblem"><Wine size={23} /></div>
        <div className="eyebrow"><span className="eyebrow-line" /> SUA COLEÇÃO, BEM CUIDADA</div>
        <h1>{mode === "sign-in" ? "Que bom ter você de volta." : "Sua adega começa aqui."}</h1>
        <p className="auth-intro">{mode === "sign-in" ? "Entre para abrir seu mapa e encontrar cada garrafa." : "Crie sua conta para guardar a coleção com segurança."}</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required /></label>
          <label className="field"><span>Senha</span><input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? "Aguarde…" : mode === "sign-in" ? "Entrar na adega" : "Criar minha conta"}</button>
        </form>
        <div className="auth-switch">{mode === "sign-in" ? "Ainda não tem conta?" : "Já tem uma conta?"}<button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setMessage(""); }}>{mode === "sign-in" ? "Criar conta" : "Fazer login"}</button></div>
        <div className="auth-footnote"><span className="local-status-dot" /> Seus vinhos ficam privados na sua conta.</div>
      </section>
      <p className="auth-bottom-note">Cadastro manual disponível desde o primeiro acesso.</p>
    </main>
  );
}

function ConnectionStateScreen({ title, message }: { title: string; message: string }) {
  return <main className="connection-screen"><div className="connection-card"><span className="brand-mark"><Wine size={21} /></span><span className="loading-spinner" /><h1>{title}</h1><p>{message}</p></div></main>;
}

function ConnectionErrorScreen({ message, onOpenDemo }: { message: string; onOpenDemo: () => void }) {
  return <main className="connection-screen"><div className="connection-card error-card"><span className="brand-mark"><Wine size={21} /></span><div className="connection-warning">!</div><h1>Não conseguimos abrir sua adega.</h1><p>Confira a conexão com Neon e se o banco está configurado.</p><details><summary>Detalhes</summary><code>{message}</code></details><button className="primary-button" onClick={onOpenDemo}>Abrir demonstração local</button></div></main>;
}
