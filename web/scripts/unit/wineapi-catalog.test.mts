import assert from "node:assert/strict";
import test from "node:test";
import { blankWine } from "../../src/lib/wine";
import { catalogCandidateLocation, catalogReferenceName, draftFromCatalog, type WineCatalogCandidate } from "../../src/lib/wineapi-catalog";

const candidate: WineCatalogCandidate = { id: "c1", name: "Busca", vintage: 2016, type: "red", winery: { name: "Quara" }, region: "Cafayate", country: "Argentina" };

test("referência da WineAPI pode ser texto ou objeto com nome", () => {
  assert.equal(catalogReferenceName("Mendoza"), "Mendoza");
  assert.equal(catalogReferenceName({ name: "Salta" }), "Salta");
  assert.equal(catalogReferenceName(null), "");
  assert.equal(catalogReferenceName(undefined), "");
  assert.equal(catalogCandidateLocation(candidate), "Cafayate · Argentina");
  assert.equal(catalogCandidateLocation({ ...candidate, region: null, country: null }), "");
});

test("ficha completa tem prioridade; o que faltar vem do resultado da busca", () => {
  const draft = draftFromCatalog({ name: "Quara Estate Malbec", grapes: ["Malbec", { name: "Tannat" }, {}], region: { name: "Salta", country: "Argentina" } }, candidate);
  assert.deepEqual(draft, { ...blankWine, name: "Quara Estate Malbec", producer: "Quara", vintage: "2016", country: "Argentina", region: "Salta", grape: "Malbec, Tannat" });
});

test("sem safra em nenhum lugar a safra fica vazia, nunca inventada", () => {
  const draft = draftFromCatalog({ vintage: null }, { ...candidate, vintage: null });
  assert.equal(draft.vintage, "");
  assert.equal(draftFromCatalog({ vintage: 2019 }, candidate).vintage, "2019");
});

test("sem uvas na WineAPI o campo fica vazio para a pessoa preencher", () => {
  assert.equal(draftFromCatalog({ grapes: null }, candidate).grape, "");
});

test("país: ficha > país da região (quando a região é objeto) > resultado da busca", () => {
  assert.equal(draftFromCatalog({ country: "Chile", region: { country: "Argentina" } }, candidate).country, "Chile");
  assert.equal(draftFromCatalog({ region: { name: "Salta" } }, candidate).country, "Argentina");
  assert.equal(draftFromCatalog({ region: { name: "Salta" } }, { ...candidate, country: null }).country, "");
});
