import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { addBottlesLocally, moveBottleLocally, removeBottleLocally, saveReviewLocally } from "../../src/lib/local/local-cellar";
import { blankWine } from "../../src/lib/wine";
import { bottle, cellar, countryColumnsShelf, fixedContext, freeShelf, resetIds } from "./fixtures";

beforeEach(resetIds);

test("cadastrar o mesmo vinho de novo só adiciona garrafas à ficha existente", () => {
  const draft = { ...blankWine, name: "malbec reserva", producer: "Bodega del Valle", vintage: "2020" };
  const next = addBottlesLocally(cellar(), draft, freeShelf, [{ row: 1, column: 1, key: "s1:1:1" }, { row: 1, column: 2, key: "s1:1:2" }], fixedContext);
  assert.equal(next.wines.length, 1);
  assert.deepEqual(next.bottles.map((b) => [b.wineId, b.row, b.column]), [["w1", 1, 1], ["w1", 1, 2]]);
});

test("cadastrar vinho novo cria a ficha com textos limpos", () => {
  const draft = { ...blankWine, name: "  Pinot   Noir ", producer: "Domaine", vintage: "2019" };
  const next = addBottlesLocally(cellar(), draft, freeShelf, [{ row: 2, column: 3, key: "s1:2:3" }], fixedContext);
  assert.equal(next.wines.length, 2);
  assert.deepEqual(next.wines[1], { id: "id-1", ...blankWine, name: "Pinot Noir", producer: "Domaine", vintage: "2019" });
  assert.deepEqual(next.bottles, [{ id: "id-2", wineId: "id-1", shelfId: "s1", row: 2, column: 3 }]);
});

test("mover registra um evento; trocar troca as posições e registra os dois lados", () => {
  const a = bottle({ id: "a" });
  const b = bottle({ id: "b", shelfId: "s2", row: 1, column: 2 });
  const moved = moveBottleLocally(cellar({ bottles: [a] }), a, { shelf: freeShelf, row: 2, column: 2 }, undefined, fixedContext);
  assert.deepEqual(moved.bottles[0], { ...a, row: 2, column: 2 });
  assert.equal(moved.movements?.length, 1);
  assert.equal(moved.movements?.[0].type, "move");

  const swapped = moveBottleLocally(cellar({ bottles: [a, b], movements: moved.movements }), a, { shelf: countryColumnsShelf, row: 1, column: 2 }, b, fixedContext);
  assert.deepEqual(swapped.bottles.map((x) => [x.id, x.shelfId, x.row, x.column]), [["a", "s2", 1, 2], ["b", "s1", 1, 1]]);
  assert.deepEqual(swapped.movements?.map((m) => [m.bottleId, m.type, m.toShelfId]), [["a", "swap", "s2"], ["b", "swap", "s1"], ["a", "move", "s1"]]);
});

test("retirar libera a posição e não exige avaliação; motivo vazio vira null", () => {
  const a = bottle({ id: "a" });
  const next = removeBottleLocally(cellar({ bottles: [a] }), a, "   ", fixedContext);
  assert.deepEqual(next.bottles, []);
  assert.equal(next.movements?.[0].type, "remove");
  assert.equal(next.movements?.[0].reason, null);
  assert.equal(next.movements?.[0].toShelfId, null);
  assert.deepEqual(next.reviews, []);
  assert.equal(removeBottleLocally(cellar({ bottles: [a] }), a, " consumida ", fixedContext).movements?.[0].reason, "consumida");
});

test("avaliar de novo substitui a avaliação da mesma garrafa", () => {
  const a = bottle({ id: "a" });
  const first = saveReviewLocally(cellar(), a, 3, "  ");
  const second = saveReviewLocally(first, a, 5, " ótimo ");
  assert.deepEqual(second.reviews, [{ bottleId: "a", wineId: "w1", rating: 5, comment: "ótimo" }]);
  assert.deepEqual(first.reviews, [{ bottleId: "a", wineId: "w1", rating: 3, comment: null }]);
});
