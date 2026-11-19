import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { createClient } from "@neon/neon-js";

const branchId = process.env.TEST_NEON_BRANCH_ID;
const projectId = process.env.TEST_NEON_PROJECT_ID;
const expectedEndpoint = process.env.TEST_NEON_ENDPOINT_ID;
const productionBranchId = process.env.TEST_NEON_PRODUCTION_BRANCH_ID;
const publicDatabaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;
if (!branchId || !/^br-[a-z0-9-]+$/.test(branchId)) throw new Error("Informe TEST_NEON_BRANCH_ID após confirmar o branch no Neon Console.");
if (!projectId || !expectedEndpoint) throw new Error("Informe TEST_NEON_PROJECT_ID e TEST_NEON_ENDPOINT_ID para limitar o alvo.");
if (!productionBranchId || productionBranchId === branchId) throw new Error("Informe o ID da branch production, distinto da branch de teste.");
if (!publicDatabaseUrl) throw new Error("Informe NEXT_PUBLIC_NEON_DATABASE_URL da branch de teste.");

const dbUrl = new URL(publicDatabaseUrl);
const endpointId = dbUrl.hostname.split(".")[0];
if (endpointId !== expectedEndpoint) throw new Error("O endpoint da URL não corresponde a TEST_NEON_ENDPOINT_ID.");
const domain = dbUrl.hostname.split(".").slice(1).join(".");
const databasePath = dbUrl.pathname.replace(/^\/+|\/+$/g, "");
const authUrl = `https://${endpointId}.neonauth.${domain}/${databasePath}/auth`;
const restUrl = `https://${endpointId}.apirest.${domain}/${databasePath}/rest/v1`;
const appOrigin = "http://localhost:3105";
const headers = { origin: appOrigin, "content-type": "application/json" };
const appUrl = appOrigin;
const appPort = 3105;
const createdUsers = [];
const createdCellars = [];
let server;
let browser;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* Preserve provider text for assertions. */ }
  return { response, body };
}

function authHeaders(token) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "return=representation" };
}

async function authRequest(user, path, options = {}) {
  return request(`${restUrl}/${path}`, { ...options, headers: { ...authHeaders(user.token), ...(options.headers ?? {}) } });
}

async function createAccount(label) {
  const nonce = randomUUID();
  const email = `fase2-neon-${label}-${nonce}@example.invalid`;
  const password = `Aa${randomBytes(18).toString("hex")}9!`;
  const signup = await request(`${authUrl}/sign-up/email`, {
    method: "POST", headers,
    body: JSON.stringify({ email, password, name: `Teste Fase 2 ${label}`, callbackURL: appOrigin }),
  });
  assert.equal(signup.response.status, 200, `Neon Auth sign-up falhou (${signup.response.status}).`);
  const userId = signup.body?.user?.id;
  assert.ok(userId, "Neon Auth não retornou o ID da conta de teste.");
  createdUsers.push({ id: userId, email });

  const login = await request(`${authUrl}/sign-in/email`, {
    method: "POST", headers,
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.response.status, 200, `Neon Auth sign-in falhou (${login.response.status}).`);
  const cookies = (login.response.headers.getSetCookie?.() ?? [login.response.headers.get("set-cookie") ?? ""])
    .map((value) => value.split(";")[0]).filter(Boolean).join("; ");
  assert.ok(cookies, "Neon Auth não retornou cookie de sessão.");

  const session = await request(`${authUrl}/get-session`, { headers: { ...headers, cookie: cookies } });
  assert.equal(session.response.status, 200, "Neon Auth não persistiu a sessão do usuário.");
  assert.equal(session.body?.user?.id, userId);
  const token = await request(`${authUrl}/token`, { headers: { ...headers, cookie: cookies } });
  assert.equal(token.response.status, 200, "Neon Auth não emitiu token para a Data API.");
  assert.ok(token.body?.token, "Neon Auth não retornou JWT de acesso.");
  return { id: userId, email, password, token: token.body.token };
}

async function createCellar(user, name) {
  const result = await authRequest(user, "cellars", {
    method: "POST", body: JSON.stringify({ owner_id: user.id, name }),
  });
  assert.ok(result.response.ok, `Data API recusou a criação da adega (${result.response.status}).`);
  const cellar = result.body?.[0];
  assert.ok(cellar?.id, "Data API não retornou o ID da adega.");
  createdCellars.push(cellar.id);
  const shelfResult = await authRequest(user, "shelves", {
    method: "POST",
    body: JSON.stringify({ cellar_id: cellar.id, name: "Adega principal", row_count: 5, column_count: 5, organization: "free" }),
  });
  assert.ok(shelfResult.response.ok, `Data API recusou a prateleira (${shelfResult.response.status}).`);
  return { id: cellar.id, shelfId: shelfResult.body?.[0]?.id };
}

async function registerWine(user, cellar, { name, vintage, position, ean13 }) {
  const result = await authRequest(user, "rpc/register_wine_bottles_with_barcode", {
    method: "POST",
    body: JSON.stringify({
      p_cellar_id: cellar.id,
      p_shelf_id: cellar.shelfId,
      p_wine: { name, producer: "Bodega de teste Neon", vintage, country: "Chile", region: "Vale de teste", grapes: ["Carménère"] },
      p_positions: [position],
      p_ean13: ean13,
      p_source_provider: "user",
      p_source_url: null,
    }),
  });
  assert.ok(result.response.ok, `RPC atômica rejeitou cadastro válido (${result.response.status}).`);
  const record = Array.isArray(result.body) ? result.body[0] : result.body;
  assert.ok(record?.wine_id && record?.bottle_ids?.length === 1, "RPC não retornou vinho e garrafa.");
  return record;
}

async function consumeQuota(user, name) {
  const result = await authRequest(user, `rpc/${name}`, { method: "POST", body: "{}" });
  assert.ok(result.response.ok, `${name} falhou na Data API (${result.response.status}).`);
  return result.body === true;
}

function startServer() {
  const environment = {
    ...process.env,
    NEXT_PUBLIC_NEON_DATABASE_URL: publicDatabaseUrl,
    ENABLE_WINEAPI_IDENTIFICATION: "false",
    ENABLE_EXTERNAL_WEB_SEARCH: "false",
    ENABLE_OPENAI_IDENTIFICATION: "false",
    WINEAPI_API_KEY: "",
    BRAVE_SEARCH_API_KEY: "",
    OPENAI_API_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(appPort)], {
    cwd: process.cwd(), env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog = (serverLog + chunk.toString()).slice(-5000); });
  server.stderr.on("data", (chunk) => { serverLog = (serverLog + chunk.toString()).slice(-5000); });
  return async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (server.exitCode !== null) throw new Error(`Next dev encerrou antes do E2E. ${serverLog}`);
      try {
        const response = await fetch(appOrigin);
        if (response.ok) return;
      } catch { /* The dev server is still starting. */ }
      await delay(500);
    }
    throw new Error(`Timeout aguardando Next dev. ${serverLog}`);
  };
}

async function main() {
  try {
  console.log(`Neon alvo verificado no Console: projeto ${projectId}, branch ${branchId}, endpoint ${endpointId}.`);
  const waitForServer = startServer();
  const accountA = await createAccount("a");
  const accountB = await createAccount("b");
  const cellarA = await createCellar(accountA, "Adega teste identificação A");
  const cellarB = await createCellar(accountB, "Adega teste identificação B");
  assert.notEqual(cellarA.id, cellarB.id, "As duas contas precisam de adegas de teste isoladas.");

  const first = await registerWine(accountA, cellarA, {
    name: "Panul Carménère Neon 2020", vintage: "2020", position: { row: 1, column: 1 }, ean13: "7892500022445",
  });
  const second = await registerWine(accountA, cellarA, {
    name: "Panul Carménère Neon 2021", vintage: "2021", position: { row: 1, column: 2 }, ean13: "7892500022445",
  });
  assert.notEqual(first.wine_id, second.wine_id, "Safras distintas precisam continuar em fichas diferentes.");

  const ownAssociations = await authRequest(accountA, "wine_barcodes?select=wine_id,ean13,source_provider&ean13=eq.7892500022445&order=wine_id");
  assert.equal(ownAssociations.response.status, 200, "A conta autenticada não conseguiu ler a associação da própria adega.");
  assert.equal(ownAssociations.body.length, 2, "O mesmo EAN não ficou associado às duas safras.");
  assert.ok(ownAssociations.body.every((row) => row.source_provider === "user"));
  const otherAssociations = await authRequest(accountB, "wine_barcodes?select=wine_id,ean13&ean13=eq.7892500022445");
  assert.equal(otherAssociations.response.status, 200);
  assert.equal(otherAssociations.body.length, 0, "RLS revelou associações EAN de outra conta.");

  const hiddenCellar = await authRequest(accountB, `cellars?select=id&id=eq.${cellarA.id}`);
  assert.equal(hiddenCellar.response.status, 200);
  assert.equal(hiddenCellar.body.length, 0, "RLS revelou a adega de outra conta.");
  const ownCellarB = await authRequest(accountB, `cellars?select=id&id=eq.${cellarB.id}`);
  assert.equal(ownCellarB.body.length, 1, "A conta B não conseguiu ler a própria adega.");
  const hiddenCellarB = await authRequest(accountA, `cellars?select=id&id=eq.${cellarB.id}`);
  assert.equal(hiddenCellarB.body.length, 0, "RLS revelou a adega da conta B para a conta A.");
  const crossWrite = await authRequest(accountB, "shelves", {
    method: "POST", body: JSON.stringify({ cellar_id: cellarA.id, name: "Não autorizado", row_count: 1, column_count: 1, organization: "free" }),
  });
  assert.ok(!crossWrite.response.ok, "A conta B escreveu na adega da conta A.");
  const protectedAssociationWrite = await authRequest(accountA, "wine_barcodes", {
    method: "POST", body: JSON.stringify({ cellar_id: cellarA.id, wine_id: first.wine_id, ean13: "8436559528924", source_provider: "user", confirmed_by: accountA.id }),
  });
  assert.ok(!protectedAssociationWrite.response.ok, "A Data API permitiu gravação direta na tabela de associações.");

  const invalidEan = await authRequest(accountA, "rpc/register_wine_bottles_with_barcode", {
    method: "POST", body: JSON.stringify({ p_cellar_id: cellarA.id, p_shelf_id: cellarA.shelfId,
      p_wine: { name: "EAN inválido", producer: "Teste", vintage: "2030" }, p_positions: [{ row: 1, column: 3 }], p_ean13: "7892500022446" }),
  });
  assert.ok(!invalidEan.response.ok, "O RPC aceitou EAN com checksum inválido.");
  const rollback = await authRequest(accountA, "rpc/register_wine_bottles_with_barcode", {
    method: "POST", body: JSON.stringify({ p_cellar_id: cellarA.id, p_shelf_id: cellarA.shelfId,
      p_wine: { name: "Atomic rollback phase 2", producer: "Teste", vintage: "2030" }, p_positions: [{ row: 1, column: 1 }], p_ean13: "8436559528924" }),
  });
  assert.ok(!rollback.response.ok, "O RPC aceitou uma posição já ocupada.");
  const rolledBackWine = await authRequest(accountA, "wines?select=id&name=eq.Atomic%20rollback%20phase%202");
  assert.equal(rolledBackWine.body.length, 0, "A falha deixou uma ficha parcialmente gravada.");
  const rolledBackBarcode = await authRequest(accountA, "wine_barcodes?select=id&ean13=eq.8436559528924");
  assert.equal(rolledBackBarcode.body.length, 0, "A falha deixou associação EAN parcialmente gravada.");

  const sdkClient = createClient({ dataApi: { url: restUrl, getToken: async () => accountA.token } });
  const sdkQuota = await sdkClient.rpc("consume_barcode_identification_quota");
  assert.equal(sdkQuota.error, null, `O SDK Neon não conseguiu consumir a quota autenticada (${sdkQuota.error?.code ?? "sem código"}: ${sdkQuota.error?.message ?? "erro desconhecido"}).`);
  assert.equal(sdkQuota.data, true, "O SDK Neon não confirmou a quota da conta de teste.");

  await waitForServer();
  const apiLookup = await request(`${appUrl}/api/identification/barcode`, {
    method: "POST", headers: { authorization: `Bearer ${accountA.token}`, "content-type": "application/json" },
    body: JSON.stringify({ ean13: "7892500022445", allowWineApi: false, allowWebSearch: false, allowAiResolution: false }),
  });
  assert.equal(apiLookup.response.status, 200, `A rota autenticada não consultou as associações Neon (${apiLookup.response.status}: ${JSON.stringify(apiLookup.body)}).`);
  assert.equal(apiLookup.body.status, "ambiguous", "A rota não sinalizou as duas safras vinculadas ao EAN.");
  assert.equal(apiLookup.body.integrations.openFoodFacts, "not_found", "Uma associação já confirmada deveria resolver antes de consultar Open Food Facts.");
  assert.deepEqual(apiLookup.body.sources.map((source) => source.id), ["cellar"], "O resultado do Neon não deve depender de uma fonte externa.");
  assert.equal(apiLookup.body.candidates.length, 2);
  assert.ok(apiLookup.body.candidates.some((candidate) => candidate.name === "Panul Carménère Neon 2020"));

  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const endpointRequests = [];
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname.endsWith(".neon.tech")) {
      endpointRequests.push(requestUrl.hostname);
      if (!requestUrl.hostname.startsWith(`${endpointId}.`) && !requestUrl.hostname.startsWith(`${endpointId}-`)) {
        throw new Error("E2E bloqueou tentativa de acessar outro endpoint Neon.");
      }
    }
    if (/openfoodfacts|wineapi|brave|openai/i.test(requestUrl.hostname)) throw new Error("Integração externa inesperada durante teste sem autorização.");
    await route.continue();
  });

  await page.goto(appOrigin);
  await page.getByLabel("E-mail").fill(accountA.email);
  await page.getByLabel("Senha").fill(accountA.password);
  await page.getByRole("button", { name: "Entrar na adega", exact: true }).click();
  await page.getByRole("button", { name: "Registrar vinho" }).waitFor();
  await page.getByRole("button", { name: "Registrar vinho" }).click();
  await page.getByLabel("EAN-13").fill("7892500022445");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await page.getByText("Há mais de uma possibilidade. Selecione uma ficha para revisar.").waitFor();
  const candidateButtons = page.getByRole("button", { name: "Usar esta ficha", exact: true });
  assert.equal(await candidateButtons.count(), 2);
  await candidateButtons.first().click();
  assert.equal(await page.getByLabel("Nome do vinho").evaluate((element) => element.value), "Panul Carménère Neon 2020");
  await page.getByRole("checkbox", { name: /Ao salvar, associar o EAN-13/ }).check();
  await page.getByRole("button", { name: "Linha 1, coluna 3, disponível", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar garrafa", exact: true }).click();
  await page.getByText("1 garrafa adicionada à adega").waitFor();
  await page.reload();
  await page.getByRole("button", { name: /Adega principal, linha 1, coluna 3, Panul Carménère Neon 2020/ }).waitFor();
  await context.close();
  await browser.close();
  browser = undefined;

  const bottleRows = await authRequest(accountA, `bottles?select=id,status&cellar_id=eq.${cellarA.id}&status=eq.active`);
  assert.equal(bottleRows.response.status, 200);
  assert.equal(bottleRows.body.length, 3, "A garrafa salva pela interface não persistiu no Neon após recarga.");
  const finalAssociations = await authRequest(accountA, "wine_barcodes?select=wine_id,ean13&ean13=eq.7892500022445");
  assert.equal(finalAssociations.body.length, 2);

  for (let i = 3; i < 30; i += 1) assert.equal(await consumeQuota(accountA, "consume_barcode_identification_quota"), true, `Quota de código negada antes do limite, chamada ${i + 1}.`);
  assert.equal(await consumeQuota(accountA, "consume_barcode_identification_quota"), false, "A quota permitiu a 31ª identificação na janela.");
  assert.equal(await consumeQuota(accountA, "consume_photo_identification_quota"), false, "A conta excedeu o limite global de 30 chamadas por hora.");
  for (let i = 0; i < 5; i += 1) assert.equal(await consumeQuota(accountB, "consume_photo_identification_quota"), true, `Quota de foto negada antes do limite, chamada ${i + 1}.`);
  assert.equal(await consumeQuota(accountB, "consume_photo_identification_quota"), false, "A quota permitiu a 6ª análise de foto.");
  for (let i = 0; i < 5; i += 1) assert.equal(await consumeQuota(accountB, "consume_ai_identification_quota"), true, `Quota de IA negada antes do limite, chamada ${i + 1}.`);
  assert.equal(await consumeQuota(accountB, "consume_ai_identification_quota"), false, "A quota permitiu a 6ª resolução de IA.");
  const rateLimitRows = await authRequest(accountA, "identification_rate_limits?select=user_id");
  assert.ok(!rateLimitRows.response.ok, "A Data API permitiu leitura direta das quotas privadas.");

  console.log("Neon Auth/Data API real: duas contas autenticadas, RLS cruzada, associações EAN por duas safras, escrita direta bloqueada, RPC atômico/rollback e quota global 30/h com subtetos 5 fotos/5 resoluções por IA aprovados.");
  console.log("Interface real conectada ao Neon isolado: EAN digitado, resultado ambíguo revisado, garrafa salva e persistência após recarga aprovados.");
  console.log(`Dados de validação mantidos somente na branch temporária ${branchId}; IDs de conta para limpeza manual se necessária: ${createdUsers.map((user) => user.id).join(", ")}.`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(3000)]);
  }
}
}

main().catch((error) => {
  console.error("Teste Neon da Fase 2 falhou:", error instanceof Error ? error.message : String(error));
  if (createdUsers.length) console.error(`Contas de teste já criadas na branch ${branchId}: ${createdUsers.map((user) => user.id).join(", ")}.`);
  process.exitCode = 1;
});
