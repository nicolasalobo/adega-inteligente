import assert from "node:assert/strict";
import test from "node:test";
import { moveDestinationText, parseMoveDestination, planMove } from "../../src/lib/move";
import { bottle, cellar, countryColumnsShelf, freeShelf, wine } from "./fixtures";

test("destino é lido como prateleira/linha/coluna, sem diferenciar maiúsculas", () => {
  const shelves = [freeShelf, countryColumnsShelf];
  assert.deepEqual(parseMoveDestination(" adega PRINCIPAL / 2 / 3 ", shelves), { shelf: freeShelf, row: 2, column: 3 });
  assert.equal(parseMoveDestination("Adega principal/3/1", shelves), null);
  assert.equal(parseMoveDestination("Adega principal/0/1", shelves), null);
  assert.equal(parseMoveDestination("Adega principal/1.5/1", shelves), null);
  assert.equal(parseMoveDestination("Adega principal", shelves), null);
  assert.equal(parseMoveDestination("Outra/1/1", shelves), null);
  assert.equal(moveDestinationText(freeShelf, bottle({ row: 2, column: 3 })), "Adega principal/2/3");
});

test("mover para posição livre e compatível", () => {
  const state = cellar({ bottles: [bottle()] });
  const plan = planMove(state, state.bottles[0], freeShelf, "Por país/1/2");
  assert.equal(plan.ok, true);
  assert.ok(plan.ok && !plan.occupant && plan.target.shelf.id === "s2");
});

test("mover recusa destino inválido, mesma posição e país errado", () => {
  const state = cellar({ bottles: [bottle()] });
  const source = state.bottles[0];
  assert.deepEqual(planMove(state, source, freeShelf, "x/1/1"), { ok: false, message: "Destino inválido. Use nome da prateleira/linha/coluna." });
  assert.deepEqual(planMove(state, source, freeShelf, "Adega principal/1/1"), { ok: false, message: "A garrafa já está nessa posição." });
  assert.deepEqual(planMove(state, source, freeShelf, "Por país/1/1"), { ok: false, message: "A posição não aceita a categoria deste vinho." });
});

test("destino ocupado vira troca, e as duas garrafas precisam caber", () => {
  const french = wine({ id: "w2", country: "França" });
  const argentine = bottle({ id: "a", wineId: "w1", shelfId: "s2", row: 1, column: 2 });
  const inFree = bottle({ id: "f", wineId: "w2", shelfId: "s1", row: 1, column: 1 });
  const state = cellar({ wines: [wine(), french], bottles: [argentine, inFree] });

  const swap = planMove(state, inFree, freeShelf, "Adega principal/1/1");
  assert.equal(swap.ok, false);

  const otherArgentine = bottle({ id: "c", wineId: "w1", shelfId: "s1", row: 2, column: 2 });
  const state2 = cellar({ bottles: [argentine, otherArgentine] });
  const ok = planMove(state2, otherArgentine, freeShelf, "Por país/1/2");
  assert.ok(ok.ok && ok.occupant?.id === "a");

  const frenchInFree = bottle({ id: "d", wineId: "w2", shelfId: "s1", row: 2, column: 1 });
  const state3 = cellar({ wines: [wine(), french], bottles: [argentine, frenchInFree] });
  assert.equal(planMove(state3, frenchInFree, freeShelf, "Por país/1/2").ok, false, "francês não pode ir para a coluna da Argentina");
});
