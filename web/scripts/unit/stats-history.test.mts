import assert from "node:assert/strict";
import test from "node:test";
import { formatMovementPosition, movementTypeLabel, responsibleLabel, visibleMovements } from "../../src/lib/history";
import { averageRating, bottleCountsByWine, bottlesOnShelf, cellarStats, formatAverageRating, validateReview } from "../../src/lib/stats";
import { bottle, cellar, freeShelf, wine } from "./fixtures";

test("resumo: garrafas, rótulos com garrafa, capacidade e ocupação arredondada", () => {
  const state = cellar({ wines: [wine(), wine({ id: "w2" }), wine({ id: "w3" })], bottles: [bottle(), bottle({ id: "b2", column: 2 }), bottle({ id: "b3", wineId: "w2", shelfId: "s2" })] });
  assert.deepEqual(cellarStats(state), { bottleCount: 3, labelCount: 2, shelfCount: 2, totalCapacity: 12, freePositions: 9, occupiedPercent: 25 });
  assert.equal(cellarStats(cellar({ shelves: [] })).occupiedPercent, 0);
  assert.equal(bottleCountsByWine(state.bottles).get("w1"), 2);
  assert.equal(bottlesOnShelf(state.bottles, "s2").length, 1);
});

test("média usa só avaliações com nota do vinho", () => {
  const reviews = [
    { bottleId: "b1", wineId: "w1", rating: 4, comment: null },
    { bottleId: "b2", wineId: "w1", rating: 5, comment: "ótimo" },
    { bottleId: "b3", wineId: "w1", rating: null, comment: "sem nota" },
    { bottleId: "b4", wineId: "w2", rating: 1, comment: null },
  ];
  assert.deepEqual(averageRating(reviews, "w1"), { average: 4.5, count: 2 });
  assert.equal(formatAverageRating(reviews, "w1"), "4,5 / 5 · 2 avaliações");
  assert.equal(formatAverageRating(reviews, "w2"), "1,0 / 5 · 1 avaliação");
  assert.equal(formatAverageRating(reviews, "w9"), "Ainda sem notas");
});

test("avaliação exige nota inteira de 1 a 5 e comentário até 2000 caracteres", () => {
  assert.equal(validateReview(3, ""), null);
  assert.equal(validateReview(0, ""), "A nota deve ser de 1 a 5 estrelas.");
  assert.equal(validateReview(6, ""), "A nota deve ser de 1 a 5 estrelas.");
  assert.equal(validateReview(2.5, ""), "A nota deve ser de 1 a 5 estrelas.");
  assert.equal(validateReview(5, "x".repeat(2001)), "O comentário deve ter no máximo 2000 caracteres.");
});

test("histórico: filtra pela busca, descreve posição, tipo e responsável", () => {
  const wineById = new Map([["w1", wine()]]);
  const base = { bottleId: "b1", fromShelfId: "s1", fromRow: 1, fromColumn: 2, toShelfId: null, toRow: null, toColumn: null, reason: null, actorId: null, createdAt: "" };
  const movements = [
    { ...base, id: "m1", wineId: "w1", type: "remove" as const },
    { ...base, id: "m2", wineId: "apagado", type: "move" as const },
  ];
  assert.deepEqual(visibleMovements(movements, wineById, "").map((m) => m.id), ["m1"]);
  assert.deepEqual(visibleMovements(movements, wineById, "chile"), []);
  assert.equal(formatMovementPosition([freeShelf], "s1", 1, 2), "Adega principal · L1 / C2");
  assert.equal(formatMovementPosition([freeShelf], "sumiu", 1, 2), "Prateleira · L1 / C2");
  assert.equal(formatMovementPosition([freeShelf], null, null, null), "—");
  assert.equal(movementTypeLabel("remove"), "Retirada");
  assert.equal(movementTypeLabel("swap"), "Troca");
  assert.equal(movementTypeLabel("move"), "Movimentação");
  assert.equal(responsibleLabel(null, "u1", "a@b.c"), "Demonstração local");
  assert.equal(responsibleLabel("u1", "u1", "a@b.c"), "a@b.c");
  assert.equal(responsibleLabel("u1", "u1", ""), "Você");
  assert.equal(responsibleLabel("u2", "u1", "a@b.c"), "Outro responsável");
});
