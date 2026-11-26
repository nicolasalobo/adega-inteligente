import assert from "node:assert/strict";
import test from "node:test";
import { blankWine, cleanText, cleanWineDraft, draftFromIdentificationCandidate, findDuplicateWine, matchesSearch, mergeDraftWithExisting, sameWine, splitGrapes, wineRpcPayload } from "../../src/lib/wine";
import { wine } from "./fixtures";

test("cleanText apara as pontas e junta espaços, sem mudar maiúsculas", () => {
  assert.equal(cleanText("  Casa   do  Vale "), "Casa do Vale");
  assert.equal(cleanText("frança"), "frança");
});

test("mesmo vinho ignora maiúsculas e espaços nas pontas em nome, produtor e safra", () => {
  const draft = { ...blankWine, name: " malbec reserva ", producer: "BODEGA DEL VALLE", vintage: "2020" };
  assert.equal(sameWine(wine(), draft), true);
  assert.equal(sameWine(wine(), { ...draft, vintage: "2021" }), false);
  assert.equal(sameWine(wine(), { ...draft, producer: "Outra bodega" }), false);
  assert.equal(findDuplicateWine([wine({ id: "a", vintage: "2019" }), wine({ id: "b" })], draft)?.id, "b");
  assert.equal(findDuplicateWine([wine({ vintage: "" })], draft), undefined);
});

test("busca procura em nome, produtor, safra, país, região e uva; busca vazia aceita tudo", () => {
  assert.equal(matchesSearch(wine(), ""), true);
  assert.equal(matchesSearch(wine(), "   "), true);
  assert.equal(matchesSearch(wine(), "MENDOZA"), true);
  assert.equal(matchesSearch(wine(), " 2020 "), true);
  assert.equal(matchesSearch(wine(), "valle"), true);
  assert.equal(matchesSearch(wine(), "chile"), false);
});

test("uvas são separadas por vírgula, ponto e vírgula ou barra", () => {
  assert.deepEqual(splitGrapes("Malbec, Syrah ;  Merlot/ Cabernet Franc ,"), ["Malbec", "Syrah", "Merlot", "Cabernet Franc"]);
  assert.deepEqual(splitGrapes(""), []);
});

test("payload da RPC limpa textos e envia uvas como lista", () => {
  const payload = wineRpcPayload({ ...blankWine, name: "  Corte  da Casa ", producer: "Adega", grape: "Aragonez, Alicante Bouschet", customValue: undefined });
  assert.deepEqual(payload, { name: "Corte da Casa", producer: "Adega", vintage: "", country: "", region: "", grapes: ["Aragonez", "Alicante Bouschet"], custom_value: "" });
});

test("ficha limpa mantém todos os campos e trata customValue ausente", () => {
  assert.deepEqual(cleanWineDraft({ ...blankWine, name: " A  B ", grape: " Malbec,  Syrah ", customValue: undefined }), { ...blankWine, name: "A B", grape: "Malbec, Syrah" });
});

test("ficha efetiva usa o que foi digitado e completa o resto com a ficha existente", () => {
  const merged = mergeDraftWithExisting({ ...blankWine, name: "Malbec Reserva", producer: "Bodega del Valle", vintage: "2020" }, wine({ id: "w9", country: "Argentina" }));
  assert.equal(merged.id, "w9");
  assert.equal(merged.country, "Argentina");
  assert.equal(mergeDraftWithExisting({ ...blankWine, country: "Chile" }, wine()).country, "Chile");
  assert.equal(mergeDraftWithExisting(blankWine).id, "draft");
});

test("candidato do EAN vira ficha só com os campos de identidade", () => {
  const draft = draftFromIdentificationCandidate({ id: "c1", name: "N", producer: "P", vintage: "", country: "Brasil", region: "R", grape: "G", volume: "750 ml", productType: "vinho", sources: [], fieldsToReview: [], confidence: "low" });
  assert.deepEqual(draft, { ...blankWine, name: "N", producer: "P", country: "Brasil", region: "R", grape: "G" });
});
