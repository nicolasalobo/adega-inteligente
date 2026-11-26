import assert from "node:assert/strict";
import test from "node:test";
import { eligiblePositions, findOutOfBoundsBottle, isMissingRuleValue, isRuleField, occupiedPositionKeys, parseRuleValues, requiredRuleValueCount, ruleValueAt, shelfPositions, wineFitsPosition } from "../../src/lib/shelf";
import { bottle, countryColumnsShelf, freeShelf, wine } from "./fixtures";

test("posições percorrem a prateleira linha por linha, começando em 1", () => {
  const positions = shelfPositions(freeShelf);
  assert.equal(positions.length, 6);
  assert.deepEqual(positions[0], { row: 1, column: 1, key: "s1:1:1" });
  assert.deepEqual(positions[3], { row: 2, column: 1, key: "s1:2:1" });
  assert.deepEqual(positions[5], { row: 2, column: 3, key: "s1:2:3" });
});

test("valor da regra vem da coluna (ou da linha, conforme o eixo)", () => {
  assert.equal(ruleValueAt(countryColumnsShelf, 2, 3), "França");
  assert.equal(ruleValueAt({ ...countryColumnsShelf, rule: { criterion: "country", axis: "row", values: ["Brasil", "Chile"] } }, 2, 3), "Chile");
  assert.equal(ruleValueAt(freeShelf, 1, 1), undefined);
});

test("vinho só cabe na coluna do próprio país; prateleira livre aceita qualquer um", () => {
  assert.equal(wineFitsPosition(wine({ country: "Argentina" }), countryColumnsShelf, 1, 2), true);
  assert.equal(wineFitsPosition(wine({ country: "argentina " }), countryColumnsShelf, 2, 2), true);
  assert.equal(wineFitsPosition(wine({ country: "França" }), countryColumnsShelf, 1, 1), false);
  assert.equal(wineFitsPosition(undefined, countryColumnsShelf, 1, 1), false);
  assert.equal(wineFitsPosition(undefined, freeShelf, 1, 1), true);
});

test("posições elegíveis: livres e compatíveis com a regra", () => {
  const occupied = occupiedPositionKeys([bottle({ shelfId: "s2", row: 1, column: 2 })]);
  const keys = eligiblePositions(countryColumnsShelf, wine({ country: "Argentina" }), occupied).map((p) => p.key);
  assert.deepEqual(keys, ["s2:2:2"]);
  assert.equal(eligiblePositions(freeShelf, wine(), new Set(["s1:1:1"])).length, 5);
});

test("sem o campo da regra, nenhuma posição da prateleira estruturada é elegível", () => {
  const noCountry = wine({ country: "  " });
  assert.equal(isMissingRuleValue(noCountry, countryColumnsShelf), true);
  assert.equal(isMissingRuleValue(noCountry, freeShelf), false);
  assert.deepEqual(eligiblePositions(countryColumnsShelf, noCountry, new Set()), []);
});

test("uva da regra aceita vinho de corte com qualquer uva confirmada", () => {
  const grapeShelf = { ...countryColumnsShelf, rule: { criterion: "grape" as const, axis: "column" as const, values: ["Malbec", "Syrah", "Merlot"] } };
  const blend = wine({ grape: "Malbec, Syrah" });
  assert.deepEqual(eligiblePositions(grapeShelf, blend, new Set()).map((p) => p.column), [1, 2, 1, 2]);
});

test("campo obrigatório pela regra é marcado só na prateleira estruturada", () => {
  assert.equal(isRuleField(countryColumnsShelf, "country"), true);
  assert.equal(isRuleField(countryColumnsShelf, "region"), false);
  assert.equal(isRuleField(freeShelf, "country"), false);
  assert.equal(isRuleField(undefined, "country"), false);
  assert.equal(isRuleField({ ...countryColumnsShelf, rule: { criterion: "custom", axis: "row", values: ["a", "b"] } }, "customValue"), true);
});

test("encolher a prateleira encontra a garrafa que ficaria fora do grid", () => {
  const bottles = [bottle({ id: "a", row: 2, column: 3 }), bottle({ id: "b", shelfId: "s2", row: 9, column: 9 })];
  assert.equal(findOutOfBoundsBottle(bottles, "s1", 2, 3), undefined);
  assert.equal(findOutOfBoundsBottle(bottles, "s1", 1, 3)?.id, "a");
  assert.equal(findOutOfBoundsBottle(bottles, "s1", 2, 2)?.id, "a");
});

test("valores da regra: separados por vírgula, sem vazios, um por linha ou coluna", () => {
  assert.deepEqual(parseRuleValues(" Brasil, França , , Itália,"), ["Brasil", "França", "Itália"]);
  assert.equal(requiredRuleValueCount("row", 4, 8), 4);
  assert.equal(requiredRuleValueCount("column", 4, 8), 8);
});
