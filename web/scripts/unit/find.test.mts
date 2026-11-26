import assert from "node:assert/strict";
import test from "node:test";
import { bottleLocations, filterOptions, findWines, formatBottleLocation, noFilters, wineMatchesFilters } from "../../src/lib/find";
import { matchesSearch, normalizeForSearch } from "../../src/lib/wine";
import { bottle, cellar, countryColumnsShelf, wine } from "./fixtures";

test("busca ignora acentos e maiúsculas: 'Franca' encontra 'França'", () => {
  const french = wine({ country: "França", region: "Borgonha", grape: "Pinot Noir" });
  assert.equal(normalizeForSearch(" França "), "franca");
  assert.equal(matchesSearch(french, "Franca"), true);
  assert.equal(matchesSearch(french, "FRANÇA"), true);
  assert.equal(matchesSearch(wine({ region: "Campanha Gaúcha" }), "gaucha"), true);
  assert.equal(matchesSearch(wine({ producer: "Viña del Horizonte" }), "vina"), true);
  assert.equal(matchesSearch(french, "chile"), false);
});

test("filtros de país e uva combinam com a busca", () => {
  const malbec = wine({ id: "a", country: "Argentina", grape: "Malbec" });
  const blend = wine({ id: "b", name: "Corte", country: "argentina", grape: "Malbec, Syrah" });
  const french = wine({ id: "c", name: "Bordeaux", country: "França", grape: "Merlot" });
  const wines = [malbec, blend, french];
  assert.deepEqual(findWines(wines, { ...noFilters, country: "argentina" }).map((w) => w.id), ["b", "a"]);
  assert.deepEqual(findWines(wines, { ...noFilters, grape: "syrah" }).map((w) => w.id), ["b"]);
  assert.deepEqual(findWines(wines, { query: "corte", country: "argentina", grape: "malbec" }).map((w) => w.id), ["b"]);
  assert.deepEqual(findWines(wines, { ...noFilters, country: "franca" }).map((w) => w.id), ["c"]);
  assert.equal(wineMatchesFilters(french, { ...noFilters, grape: "malbec" }), false);
  assert.deepEqual(findWines(wines, noFilters).map((w) => w.name), ["Bordeaux", "Corte", "Malbec Reserva"]);
});

test("opções de filtro vêm só das garrafas na adega, somando 'frança' e 'França'", () => {
  const state = cellar({
    wines: [
      wine({ id: "a", country: "França", grape: "Merlot, Cabernet Sauvignon" }),
      wine({ id: "b", country: "frança ", grape: "Merlot" }),
      wine({ id: "c", country: "Chile", grape: "Syrah" }),
      wine({ id: "sem-garrafa", country: "Itália", grape: "Sangiovese" }),
      wine({ id: "sem-pais", country: "", grape: "" }),
    ],
    bottles: [bottle({ id: "1", wineId: "a" }), bottle({ id: "2", wineId: "b" }), bottle({ id: "3", wineId: "b" }), bottle({ id: "4", wineId: "c" }), bottle({ id: "5", wineId: "sem-pais" })],
  });
  const { countries, grapes } = filterOptions(state);
  assert.deepEqual(countries, [{ key: "franca", label: "França", bottleCount: 3 }, { key: "chile", label: "Chile", bottleCount: 1 }]);
  assert.deepEqual(grapes.map((g) => [g.key, g.bottleCount]), [["merlot", 3], ["cabernet sauvignon", 1], ["syrah", 1]]);
});

test("cada garrafa aparece com a localização em texto, na ordem da adega", () => {
  const state = cellar({
    bottles: [
      bottle({ id: "x", shelfId: "s2", row: 1, column: 2 }),
      bottle({ id: "y", shelfId: "s1", row: 2, column: 1 }),
      bottle({ id: "z", shelfId: "s1", row: 1, column: 3 }),
      bottle({ id: "outro", wineId: "w2" }),
      bottle({ id: "orfa", shelfId: "apagada" }),
    ],
  });
  const locations = bottleLocations(state, "w1");
  assert.deepEqual(locations.map((l) => l.bottle.id), ["z", "y", "x"]);
  assert.deepEqual(locations.map((l) => l.label), ["Adega principal · Linha 1 · Coluna 3", "Adega principal · Linha 2 · Coluna 1", "Por país · Linha 1 · Coluna 2"]);
  assert.equal(locations[0].key, "s1:1:3");
  assert.equal(formatBottleLocation(countryColumnsShelf, bottle({ row: 4, column: 7 })), "Por país · Linha 4 · Coluna 7");
  assert.deepEqual(bottleLocations(state, "inexistente"), []);
});
