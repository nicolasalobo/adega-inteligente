import assert from "node:assert/strict";
import test from "node:test";
import { isValidEan13, normalizeEan13 } from "../src/lib/identification/ean13";
import { isAllowedPhotoDataUrl } from "../src/lib/identification/image-validation";
import { identifyBarcode, type IdentificationProviders } from "../src/lib/identification/service";

function mockProviders(overrides: Partial<IdentificationProviders> = {}) {
  const calls: string[] = [];
  const providers: IdentificationProviders = {
    findAssociations: async () => { calls.push("association"); return []; },
    openFoodFacts: async () => { calls.push("off"); return null; },
    wineApi: async () => { calls.push("wineapi"); return []; },
    webSearch: async () => { calls.push("web"); return []; },
    resolveWithAi: async () => { calls.push("ai"); return { candidateId: null, rationale: "Sem evidência suficiente." }; },
    ...overrides,
  };
  return { providers, calls };
}

test("EAN-13 valida checksum e normaliza entrada manual formatada", () => {
  assert.equal(isValidEan13("7892500022445"), true);
  assert.equal(isValidEan13("8436559528924"), true);
  assert.equal(isValidEan13("7892500022444"), false);
  assert.equal(normalizeEan13("789 2500-0224-45"), "7892500022445");
  assert.equal(normalizeEan13("8436559528924"), "8436559528924");
  assert.equal(normalizeEan13("843655952892x"), null);
  assert.equal(normalizeEan13("123456789012"), null);
});

test("associação própria precede provedores e preserva múltiplas safras como ambiguidade", async () => {
  const { providers, calls } = mockProviders({
    findAssociations: async () => {
      calls.push("association");
      return [
        { id: "wine-1", name: "Panul Carmenere", producer: "Panul", vintage: "2019", country: "Chile", region: null, grapes: ["Carmenere"] },
        { id: "wine-2", name: "Panul Carmenere", producer: "Panul", vintage: "2020", country: "Chile", region: null, grapes: ["Carmenere"] },
      ];
    },
  });
  const result = await identifyBarcode("7892500022445", providers, { allowWineApi: true, allowWebSearch: true, allowAiResolution: true });
  assert.equal(result.status, "ambiguous");
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(calls, ["association"]);
  assert.ok(result.candidates.every((candidate) => candidate.sources[0]?.id === "cellar"));
});

test("pipeline usa OFF, WineAPI, web e IA nessa ordem e não confirma a safra", async () => {
  const { providers, calls } = mockProviders({
    openFoodFacts: async () => {
      calls.push("off");
      return { product_name: "Panul Carmenere", brands: "Panul", quantity: "750 ml", origins: "Chile" };
    },
    wineApi: async (query) => {
      calls.push("wineapi");
      assert.match(query, /Panul Carmenere/);
      return [
        { id: "a", name: "Panul Carmenere", winery: "Viñedos Marchigüe", vintage: 2019, type: "Red", country: "Chile", region: "Rapel", grapes: ["Carmenere"] },
        { id: "b", name: "Panul Carmenere Reserva", winery: "Viñedos Marchigüe", vintage: 2020, type: "Red", country: "Chile", region: "Rapel", grapes: ["Carmenere"] },
      ];
    },
    webSearch: async () => {
      calls.push("web");
      return [{ title: "Panul Carmenere 750 ml", url: "https://example.org/panul", description: "Ficha de producto" }];
    },
    resolveWithAi: async (candidates) => {
      calls.push("ai");
      return { candidateId: candidates[1].id, rationale: "Candidato de catálogo; confirmar no rótulo." };
    },
  });
  const result = await identifyBarcode("7892500022445", providers, { allowWineApi: true, allowWebSearch: true, allowAiResolution: true });
  assert.deepEqual(calls, ["association", "off", "wineapi", "web", "ai"]);
  assert.equal(result.status, "ambiguous");
  assert.equal(result.aiSelection?.candidateId, "wineapi:a");
  assert.equal(result.candidates[1].vintage, "2019");
  assert.ok(result.candidates[1].fieldsToReview.includes("safra"));
  assert.match(result.warnings.join(" "), /safra exibida é apenas candidata/);
  assert.equal(result.candidates[0].sources[0].id, "open_food_facts");
  assert.equal(result.candidates[2].sources[0].id, "wineapi");
  assert.equal(result.candidates[3].sources[0].url, "https://example.org/panul");
});

test("resultado ausente permanece vazio e erros externos não ocultam o cadastro manual", async () => {
  const { providers, calls } = mockProviders({
    openFoodFacts: async () => { calls.push("off"); throw new Error("OFF fora do ar"); },
    wineApi: async () => { calls.push("wineapi"); throw new Error("WineAPI fora do ar"); },
  });
  const result = await identifyBarcode("8436559528924", providers, { allowWineApi: true, allowWebSearch: false, allowAiResolution: false });
  assert.equal(result.status, "not_found");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.integrations.openFoodFacts, "unavailable");
  assert.equal(result.integrations.wineApi, "unavailable");
  assert.equal(result.integrations.webSearch, "disabled");
  assert.equal(result.integrations.ai, "disabled");
  assert.equal(calls.join(","), "association,off,wineapi");
  assert.equal(result.warnings.length, 2);
});

test("IA não pode selecionar um ID ausente da lista de candidatos", async () => {
  const { providers } = mockProviders({
    openFoodFacts: async () => ({ product_name: "Produto", brands: "Marca" }),
    wineApi: async () => [{ id: "known", name: "Produto", winery: "Marca", vintage: null, type: null, country: null, region: null }],
    resolveWithAi: async () => ({ candidateId: "inventado", rationale: "Resposta não confiável." }),
  });
  const result = await identifyBarcode("7892500022445", providers, { allowWineApi: true, allowWebSearch: false, allowAiResolution: true });
  assert.equal(result.aiSelection?.candidateId, null);
  assert.match(result.warnings.join(" "), /não conseguiu resolver/);
});

test("EAN inválido é rejeitado antes de consultar qualquer fonte", async () => {
  const { providers, calls } = mockProviders();
  await assert.rejects(identifyBarcode("7892500022444", providers, { allowWineApi: true, allowWebSearch: true, allowAiResolution: true }), /EAN-13 válido/);
  assert.deepEqual(calls, []);
});

test("foto só aceita data URLs e assinaturas binárias JPEG, PNG ou WebP permitidas", () => {
  const validJpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString("base64")}`;
  const validPng = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`;
  const validWebp = `data:image/webp;base64,${Buffer.from("RIFF1234WEBP").toString("base64")}`;
  assert.equal(isAllowedPhotoDataUrl(validJpeg), true);
  assert.equal(isAllowedPhotoDataUrl(validPng), true);
  assert.equal(isAllowedPhotoDataUrl(validWebp), true);
  assert.equal(isAllowedPhotoDataUrl("data:image/jpeg;base64,UE5H"), false);
  assert.equal(isAllowedPhotoDataUrl("https://example.org/image.jpg"), false);
});
