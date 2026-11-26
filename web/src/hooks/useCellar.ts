"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createExampleCellar, type Bottle, type CellarState, type Shelf } from "@/lib/cellar";
import type { BarcodeAssociation, CellarRepository, CellarUpdate, ShelfInput } from "@/lib/cellar-repository";
import { createLocalRepository, readStoredCellar, writeStoredCellar } from "@/lib/local/local-repository";
import type { MoveTarget } from "@/lib/move";
import { ensureRemoteCellar, fetchCellarInventory } from "@/lib/neon/cellar-data";
import { createNeonBrowserClient, hasNeonConfig, type NeonBrowserClient } from "@/lib/neon/client";
import { createNeonRepository } from "@/lib/neon/neon-repository";
import { findOutOfBoundsBottle, type PositionDraft } from "@/lib/shelf";
import { validateReview } from "@/lib/stats";
import type { WineDraft } from "@/lib/wine";

export type DataMode = "checking" | "signed-out" | "local" | "remote" | "error";
export type AuthUser = { id: string; email?: string | null };
type Account = { cellarId: string; email: string; userId: string };

const localRepository = createLocalRepository();

/**
 * Estado da adega e todas as operações sobre ela.
 * Escolhe sozinho entre a conta Neon (se configurada) e a demonstração local.
 * `onCellarReplaced` é chamado quando a adega inteira é trocada (login, demo, exemplo restaurado),
 * para a tela voltar para a primeira prateleira.
 */
export function useCellar(onCellarReplaced: (cellar: CellarState) => void) {
  const [cellar, setCellar] = useState<CellarState>(() => createExampleCellar());
  const [hydrated, setHydrated] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>(hasNeonConfig ? "checking" : "local");
  const [neonClient, setNeonClient] = useState<NeonBrowserClient | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const onReplacedRef = useRef(onCellarReplaced);
  useEffect(() => { onReplacedRef.current = onCellarReplaced; }, [onCellarReplaced]);

  const loadRemoteCellar = useCallback(async (client: NeonBrowserClient, user: AuthUser) => {
    setDataMode("checking");
    setConnectionError("");
    try {
      const cellarId = await ensureRemoteCellar(client, user.id);
      const inventory = await fetchCellarInventory(client, cellarId);
      setCellar(inventory);
      onReplacedRef.current(inventory);
      setAccount({ cellarId, email: user.email ?? "", userId: user.id });
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
      onReplacedRef.current(storedCellar);
    }
    setDataMode("local");
    setHydrated(true);
  }, [loadRemoteCellar]);

  useEffect(() => {
    if (dataMode === "local" && hydrated) writeStoredCellar(cellar);
  }, [cellar, dataMode, hydrated]);

  const repository: CellarRepository | null = useMemo(() => {
    if (dataMode !== "remote") return localRepository;
    return neonClient && account ? createNeonRepository(neonClient, account.cellarId) : null;
  }, [dataMode, neonClient, account]);

  function requireRepository() {
    if (!repository) throw new Error("A conexão com a adega não está pronta. Tente novamente.");
    return repository;
  }

  function applyUpdate(update: CellarUpdate) {
    setCellar(update);
  }

  async function addBottles(draft: WineDraft, shelf: Shelf, positions: PositionDraft[], barcode?: BarcodeAssociation | null) {
    applyUpdate(await requireRepository().addBottles(draft, shelf, positions, barcode));
  }

  async function addShelf(input: ShelfInput) {
    const { update, shelf } = await requireRepository().addShelf(input);
    applyUpdate(update);
    return shelf;
  }

  async function updateShelf(shelfId: string, input: ShelfInput) {
    if (findOutOfBoundsBottle(cellar.bottles, shelfId, input.rows, input.columns)) {
      throw new Error("Mova as garrafas que estão fora do novo tamanho antes de reduzir a prateleira.");
    }
    applyUpdate(await requireRepository().updateShelf(shelfId, input));
  }

  async function moveBottle(bottle: Bottle, target: MoveTarget, occupant?: Bottle) {
    applyUpdate(await requireRepository().moveBottle(bottle, target, occupant));
  }

  async function removeBottle(bottle: Bottle, reason: string) {
    applyUpdate(await requireRepository().removeBottle(bottle, reason));
  }

  async function saveReview(bottle: Bottle, rating: number, comment: string) {
    const invalid = validateReview(rating, comment);
    if (invalid) throw new Error(invalid);
    applyUpdate(await requireRepository().saveReview(bottle, rating, comment));
  }

  function resetExample() {
    const example = createExampleCellar();
    setCellar(example);
    onReplacedRef.current(example);
  }

  function openLocalDemo() {
    const demoCellar = readStoredCellar() ?? createExampleCellar();
    setCellar(demoCellar);
    onReplacedRef.current(demoCellar);
    setAccount(null);
    setDataMode("local");
  }

  async function signOut() {
    if (!neonClient) return;
    try {
      const { error } = await neonClient.auth.signOut();
      if (error) throw error;
    } catch {
      throw new Error("Não foi possível sair da conta. Tente novamente.");
    }
    setAccount(null);
    setDataMode("signed-out");
  }

  return {
    cellar,
    hydrated,
    dataMode,
    neonClient,
    connectionError,
    accountEmail: account?.email ?? "",
    accountUserId: account?.userId ?? null,
    loadRemoteCellar,
    openLocalDemo,
    resetExample,
    signOut,
    addBottles,
    addShelf,
    updateShelf,
    moveBottle,
    removeBottle,
    saveReview,
  };
}
