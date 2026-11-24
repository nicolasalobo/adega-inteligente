import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const previewUrl = process.env.TEST_PREVIEW_URL;
const publicNeonUrl = process.env.TEST_PUBLIC_NEON_URL;
const expectedBranch = process.env.TEST_NEON_BRANCH_ID;
const productionBranch = process.env.TEST_NEON_PRODUCTION_BRANCH_ID;
const expectedEndpoint = process.env.TEST_NEON_ENDPOINT_ID;

if (!previewUrl || !publicNeonUrl) throw new Error("Defina TEST_PREVIEW_URL e TEST_PUBLIC_NEON_URL.");
if (expectedBranch !== "br-floral-star-bep9s9qu") throw new Error("TEST_NEON_BRANCH_ID não corresponde à branch Neon descartável atual.");
if (productionBranch !== "br-bold-band-bekpj4x6" || productionBranch === expectedBranch) throw new Error("TEST_NEON_PRODUCTION_BRANCH_ID não corresponde à branch production do projeto Neon.");

const publicUrl = new URL(publicNeonUrl);
const endpointId = publicUrl.hostname.split(".")[0];
const neonDomain = publicUrl.hostname.split(".").slice(1).join(".");
const apiPath = publicUrl.pathname.replace(/\/$/, "");
if (expectedEndpoint && endpointId !== expectedEndpoint) throw new Error("O endpoint Neon não corresponde à branch de validação confirmada.");
const authUrl = `https://${endpointId}.neonauth.${neonDomain}${apiPath}/auth`;
const restUrl = `https://${endpointId}.apirest.${neonDomain}${apiPath}/rest/v1`;
const origin = new URL(previewUrl).origin;
const authHeaders = { origin, "content-type": "application/json" };
const users = [];
const checks = {};
let browser;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function authenticate(email, password) {
  const signedIn = await request(`${authUrl}/sign-in/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signedIn.response.status, 200, "Neon Auth deve aceitar as credenciais descartáveis.");
  const cookie = signedIn.response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie, "Neon Auth deve retornar uma sessão para a conta de teste.");

  const session = await request(`${authUrl}/get-session`, { headers: { ...authHeaders, cookie } });
  assert.equal(session.response.status, 200, "A sessão autenticada deve ser recuperável.");
  const token = await request(`${authUrl}/token`, { headers: { ...authHeaders, cookie } });
  assert.equal(token.response.status, 200, "A conta deve obter um JWT para a Data API.");
  return {
    id: session.body.user.id,
    email,
    access: {
      authorization: `Bearer ${token.body.token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
  };
}

async function createAuthUser(label) {
  const email = `phase3-preview-${label}-${randomUUID()}@example.invalid`;
  const password = `T${randomBytes(18).toString("hex")}z!`;
  const signup = await request(`${authUrl}/sign-up/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password, name: `Fase 3 ${label}`, callbackURL: origin }),
  });
  assert.equal(signup.response.status, 200, `Neon Auth deve criar a conta descartável ${label}.`);
  const user = await authenticate(email, password);
  user.password = password;
  users.push(user);
  return user;
}

async function rest(user, path, options = {}) {
  return request(`${restUrl}/${path}`, { ...options, headers: { ...user.access, ...(options.headers ?? {}) } });
}

function bottleButton(page, row, column, wineName) {
  return page.getByRole("button", {
    name: new RegExp(`Adega principal, linha ${row}, coluna ${column}, ${wineName}`),
  });
}

async function addWine(page, { name, producer, vintage, country, positions }) {
  await page.getByRole("button", { name: "Registrar vinho" }).click();
  await page.getByLabel("Nome do vinho").fill(name);
  await page.getByRole("textbox", { name: /Produtor/ }).fill(producer);
  await page.getByRole("textbox", { name: /Safra/ }).fill(vintage);
  await page.getByRole("textbox", { name: /País/ }).fill(country);
  await page.getByRole("textbox", { name: /Região/ }).fill("Rapel");
  await page.getByRole("textbox", { name: /Uva/ }).fill("Carmenere");
  await page.getByLabel("Quantidade").fill(String(positions.length));
  for (const [row, column] of positions) {
    await page.getByRole("button", { name: `Linha ${row}, coluna ${column}, disponível`, exact: true }).click();
  }
  const quantity = positions.length;
  const submit = page.locator("button[type=submit].primary-button");
  await submit.waitFor({ state: "visible" });
  assert.equal(await submit.isEnabled(), true, `O cadastro de ${name} deve habilitar o salvamento depois de selecionar ${quantity} posição(ões).`);
  await submit.click();
  await page.getByText(`${quantity} ${quantity === 1 ? "garrafa adicionada" : "garrafas adicionadas"} à adega`).waitFor();
}

async function selectWineBottle(page, row, column, wineName) {
  await bottleButton(page, row, column, wineName).click();
}

async function doMove(page, { row, column, name, destination, confirmSwap = false }) {
  await selectWineBottle(page, row, column, name);
  queuedDialogs.push(destination);
  if (confirmSwap) queuedDialogs.push(true);
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.getByText("Garrafa movida; movimentação registrada.").waitFor();
  assert.equal(queuedDialogs.length, 0, "Todos os diálogos de movimento devem ser respondidos.");
}

async function rateBottle(page, row, column, name, rating, comment = "") {
  await selectWineBottle(page, row, column, name);
  await page.getByRole("button", { name: "Avaliar garrafa", exact: true }).click();
  await page.getByRole("button", { name: `${rating} ${rating === 1 ? "estrela" : "estrelas"}`, exact: true }).click();
  if (comment) await page.getByPlaceholder("O que achou deste vinho?").fill(comment);
  await page.getByRole("button", { name: "Salvar avaliação", exact: true }).click();
  await page.getByText("Avaliação salva para esta garrafa.").waitFor();
}

async function removeBottle(page, row, column, name, reason) {
  await selectWineBottle(page, row, column, name);
  queuedDialogs.push(reason, true);
  await page.getByRole("button", { name: "Retirar", exact: true }).click();
  await page.getByText("Retirada registrada; posição liberada.").waitFor();
  assert.equal(queuedDialogs.length, 0, "Os diálogos de retirada devem ser respondidos.");
}

let page;
let queuedDialogs = [];
const dialogErrors = [];
const pageErrors = [];

try {
  const ownerEmail = `phase3-preview-owner-${randomUUID()}@example.invalid`;
  const ownerPassword = `T${randomBytes(18).toString("hex")}z!`;
  const ownerSignup = await request(`${authUrl}/sign-up/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword, name: "Fase 3 Owner", callbackURL: origin }),
  });
  assert.equal(ownerSignup.response.status, 200, "A conta de validação deve ser criada na Neon descartável.");
  const owner = await authenticate(ownerEmail, ownerPassword);
  owner.password = ownerPassword;
  users.push(owner);

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on("dialog", async (dialog) => {
    const answer = queuedDialogs.shift();
    if (answer === undefined) {
      dialogErrors.push(`Diálogo inesperado: ${dialog.message()}`);
      await dialog.dismiss();
      return;
    }
    try { await dialog.accept(answer === true ? undefined : answer); }
    catch (error) { dialogErrors.push(error instanceof Error ? error.message : String(error)); }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith(".neon.tech") && !url.hostname.startsWith(`${endpointId}.`)) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto(previewUrl);
  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill(owner.password);
  await page.getByRole("button", { name: "Entrar na adega", exact: true }).click();
  await page.getByRole("button", { name: "Registrar vinho", exact: true }).waitFor();
  const cellarQuery = await rest(owner, `cellars?owner_id=eq.${owner.id}&select=id,owner_id,name`);
  assert.equal(cellarQuery.response.status, 200, "A adega do proprietário deve ser visível para sua conta.");
  assert.equal(cellarQuery.body.length, 1, "O acesso deve inicializar uma única adega pessoal.");
  const cellarId = cellarQuery.body[0].id;

  const wineName = "Fase 3 Preview E2E";
  const producer = "Codex QA";
  await addWine(page, { name: wineName, producer, vintage: "2022", country: "Chile", positions: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]] });
  await addWine(page, { name: wineName, producer, vintage: "2021", country: "Chile", positions: [[2, 1]] });
  checks.cadastro = "5 garrafas de 2022 e 1 de 2021 registradas pela interface";

  await page.getByRole("button", { name: "Nova prateleira", exact: true }).first().click();
  await page.getByLabel("Nome da prateleira").fill("Prateleira Uruguai QA");
  await page.getByLabel("Linhas").selectOption("1");
  await page.getByLabel("Colunas").selectOption("1");
  await page.getByRole("button", { name: /Organizar por critério/ }).click();
  await page.getByLabel("Critério").selectOption("country");
  await page.getByLabel("Organizar por").selectOption("row");
  await page.getByLabel(/Valores na ordem da prateleira/).fill("Uruguai");
  await page.getByRole("button", { name: "Criar prateleira", exact: true }).click();
  await page.getByText("Prateleira criada").waitFor();
  await page.getByRole("button", { name: /Adega principal/ }).first().click();

  await doMove(page, { row: 1, column: 1, name: wineName, destination: "Adega principal/1/6" });
  const afterMove = await rest(owner, `bottles?cellar_id=eq.${cellarId}&select=id,row_number,column_number,status,shelf_id,wine_id`);
  assert.equal(afterMove.response.status, 200);
  const firstBottle = afterMove.body.find((item) => item.row_number === 1 && item.column_number === 6 && item.status === "active");
  assert.ok(firstBottle, "O movimento válido deve persistir a posição no Neon.");
  const movementCountBeforeRejection = (await rest(owner, `bottle_movements?cellar_id=eq.${cellarId}&select=id`)).body.length;
  await selectWineBottle(page, 1, 6, wineName);
  queuedDialogs.push("Prateleira Uruguai QA/1/1");
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.getByText("A posição não aceita a categoria deste vinho.").waitFor();
  assert.equal(queuedDialogs.length, 0, "O destino incompatível deve ser recebido pela interface.");
  const afterRejectedMove = await rest(owner, `bottle_movements?cellar_id=eq.${cellarId}&select=id`);
  assert.equal(afterRejectedMove.body.length, movementCountBeforeRejection, "Regra incompatível não deve alterar o histórico.");
  checks.movimento = "válido persistido; movimento incompatível rejeitado sem evento";

  await doMove(page, { row: 1, column: 6, name: wineName, destination: "Adega principal/1/2", confirmSwap: true });
  let bottlesResponse = await rest(owner, `bottles?cellar_id=eq.${cellarId}&select=id,row_number,column_number,status,shelf_id,wine_id&order=row_number.asc,column_number.asc`);
  assert.equal(bottlesResponse.response.status, 200);
  const bottleAt12 = bottlesResponse.body.find((item) => item.row_number === 1 && item.column_number === 2 && item.status === "active");
  const bottleAt16 = bottlesResponse.body.find((item) => item.row_number === 1 && item.column_number === 6 && item.status === "active");
  assert.ok(bottleAt12?.id === firstBottle.id && bottleAt16?.id !== firstBottle.id, "A troca deve inverter as duas garrafas sem duplicação.");
  let movementRows = (await rest(owner, `bottle_movements?cellar_id=eq.${cellarId}&select=id,bottle_id,movement_type,from_shelf_id,from_row,from_column,to_shelf_id,to_row,to_column,reason,actor_id,created_at&order=created_at.asc`)).body;
  assert.equal(movementRows.filter((item) => item.movement_type === "swap").length, 2, "A troca deve registrar um evento por garrafa.");
  checks.troca = "atômica, duas posições trocadas e dois eventos swap no Neon";

  await rateBottle(page, 1, 2, wineName, 1);
  await rateBottle(page, 1, 6, wineName, 2);
  await rateBottle(page, 1, 3, wineName, 3);
  await rateBottle(page, 1, 4, wineName, 4);
  await rateBottle(page, 1, 5, wineName, 5, "Comentário opcional de validação");
  await selectWineBottle(page, 1, 2, wineName);
  await page.getByText("Média do vinho: 3,0 / 5 · 5 avaliações").waitFor();
  await rateBottle(page, 2, 1, wineName, 5);
  await page.getByText("Média do vinho: 5,0 / 5 · 1 avaliação").waitFor();
  checks.avaliacoes = "notas 1–5 e médias distintas 3,0 (2022) e 5,0 (2021) exibidas";

  const activeBeforeRace = (await rest(owner, `bottles?cellar_id=eq.${cellarId}&status=eq.active&select=id,row_number,column_number,shelf_id`)).body;
  const shelfId = activeBeforeRace.find((item) => item.row_number === 1 && item.column_number === 3)?.shelf_id;
  const contenders = activeBeforeRace.filter((item) => item.row_number === 1 && [3, 4].includes(item.column_number));
  assert.equal(contenders.length, 2, "Dois concorrentes ativos devem estar disponíveis para o teste simultâneo.");
  const simultaneous = await Promise.all(contenders.map((item) => rest(owner, "rpc/move_bottle", {
    method: "POST",
    body: JSON.stringify({ p_cellar_id: cellarId, p_bottle_id: item.id, p_shelf_id: shelfId, p_row: 5, p_column: 10 }),
  })));
  assert.equal(simultaneous.filter((item) => item.response.ok).length, 1, "Exatamente uma movimentação concorrente deve ocupar a posição.");
  assert.equal(simultaneous.filter((item) => !item.response.ok).length, 1, "A segunda movimentação concorrente deve ser recusada.");
  const afterRace = (await rest(owner, `bottles?cellar_id=eq.${cellarId}&status=eq.active&select=id,row_number,column_number,shelf_id`)).body;
  assert.equal(afterRace.filter((item) => item.shelf_id === shelfId && item.row_number === 5 && item.column_number === 10).length, 1, "A posição disputada deve conter uma única garrafa.");
  assert.equal(new Set(afterRace.map((item) => `${item.shelf_id}:${item.row_number}:${item.column_number}`)).size, afterRace.length, "Todas as posições ativas devem continuar únicas.");
  checks.concorrencia = "duas RPCs simultâneas: uma aprovada, uma recusada, sem posição duplicada";

  await page.reload();
  await page.getByRole("button", { name: "Meus vinhos", exact: true }).waitFor();
  const removedWithReason = (await rest(owner, `bottles?cellar_id=eq.${cellarId}&shelf_id=eq.${shelfId}&row_number=eq.1&column_number=eq.2&select=id`)).body[0];
  assert.ok(removedWithReason, "A garrafa na posição 1/2 deve continuar identificável após a recarga.");
  await removeBottle(page, 1, 2, wineName, "consumida");
  await page.getByRole("button", { name: /linha 1, coluna 2, posição livre/i }).waitFor();
  const reasonedImmediately = await rest(owner, `bottles?id=eq.${removedWithReason.id}&select=id,status,removed_at,removal_reason`);
  assert.equal(reasonedImmediately.body[0]?.status, "removed", "A retirada com motivo deve persistir antes de iniciar a próxima operação.");
  assert.equal(reasonedImmediately.body[0]?.removal_reason, "consumida");
  const removedWithoutReason = (await rest(owner, `bottles?cellar_id=eq.${cellarId}&shelf_id=eq.${shelfId}&row_number=eq.1&column_number=eq.6&select=id`)).body[0];
  assert.ok(removedWithoutReason, "A garrafa na posição 1/6 deve continuar identificável após a primeira retirada.");
  await removeBottle(page, 1, 6, wineName, "");
  await page.getByRole("button", { name: /linha 1, coluna 6, posição livre/i }).waitFor();
  const reasonlessImmediately = await rest(owner, `bottles?id=eq.${removedWithoutReason.id}&select=id,status,removed_at,removal_reason`);
  assert.equal(reasonlessImmediately.body[0]?.status, "removed", "A retirada sem motivo deve persistir antes de consultar o histórico.");
  assert.equal(reasonlessImmediately.body[0]?.removal_reason, null);

  const bottleState = await rest(owner, `bottles?cellar_id=eq.${cellarId}&select=id,shelf_id,row_number,column_number,status,removed_at,removal_reason,wine_id&order=created_at.asc`);
  assert.equal(bottleState.response.status, 200);
  const reasoned = bottleState.body.find((item) => item.id === removedWithReason.id);
  const reasonless = bottleState.body.find((item) => item.id === removedWithoutReason.id);
  assert.equal(reasoned.status, "removed");
  assert.ok(reasoned.removed_at);
  assert.equal(reasoned.removal_reason, "consumida");
  assert.equal(reasonless.status, "removed");
  assert.ok(reasonless.removed_at);
  assert.equal(reasonless.removal_reason, null);
  movementRows = (await rest(owner, `bottle_movements?cellar_id=eq.${cellarId}&select=id,bottle_id,movement_type,from_shelf_id,from_row,from_column,to_shelf_id,to_row,to_column,reason,actor_id,created_at&order=created_at.asc`)).body;
  assert.equal(movementRows.filter((item) => item.movement_type === "remove" && item.reason === "consumida" && item.actor_id === owner.id).length, 1);
  assert.equal(movementRows.filter((item) => item.movement_type === "remove" && item.reason === null && item.actor_id === owner.id).length, 1);
  const activeInReleasedSlot = bottleState.body.filter((item) => item.shelf_id === shelfId && item.row_number === 1 && item.column_number === 2 && item.status === "active");
  assert.equal(activeInReleasedSlot.length, 0, "A posição retirada deve ficar livre no banco.");
  await page.getByRole("button", { name: /linha 1, coluna 2, posição livre/i }).waitFor();
  checks.retiradas = "com e sem motivo; removed_at, responsável e posição liberada confirmados";

  await addWine(page, { name: "Reposição Fase 3 QA", producer, vintage: "2020", country: "Chile", positions: [[1, 2]] });
  const afterReuse = await rest(owner, `bottles?cellar_id=eq.${cellarId}&shelf_id=eq.${shelfId}&row_number=eq.1&column_number=eq.2&status=eq.active&select=id`);
  assert.equal(afterReuse.body.length, 1, "A posição liberada deve aceitar uma nova garrafa.");
  checks.liberacao = "slot 1/2 reutilizado sem duplicar ocupação";

  const second = await createAuthUser("second");
  const existingSecondCellars = await rest(second, `cellars?owner_id=eq.${second.id}&select=id,owner_id`);
  let secondCellarId = existingSecondCellars.body[0]?.id;
  if (!secondCellarId) {
    const secondCellar = await rest(second, "cellars", {
      method: "POST",
      body: JSON.stringify({ owner_id: second.id, name: "Adega isolada de permissão" }),
    });
    assert.ok(secondCellar.response.ok, "A segunda conta deve conseguir criar sua própria adega.");
    secondCellarId = secondCellar.body[0].id;
  }
  const ownCellar = await rest(second, `cellars?id=eq.${secondCellarId}&select=id,owner_id`);
  assert.equal(ownCellar.body.length, 1);
  const hiddenCellar = await rest(second, `cellars?id=eq.${cellarId}&select=id`);
  assert.equal(hiddenCellar.body.length, 0, "A segunda conta não deve ler a adega da primeira.");
  for (const table of ["bottles", "bottle_movements", "bottle_reviews", "shelves", "wines"]) {
    const hidden = await rest(second, `${table}?cellar_id=eq.${cellarId}&select=*`);
    assert.equal(hidden.response.status, 200);
    assert.equal(hidden.body.length, 0, `RLS deve ocultar ${table} para a outra conta.`);
  }
  const forbiddenMove = await rest(second, "rpc/move_bottle", {
    method: "POST",
    body: JSON.stringify({ p_cellar_id: cellarId, p_bottle_id: firstBottle.id, p_shelf_id: shelfId, p_row: 4, p_column: 10 }),
  });
  assert.equal(forbiddenMove.response.ok, false, "A segunda conta não deve mover garrafas de outra adega.");
  const forbiddenReview = await rest(second, "bottle_reviews", {
    method: "POST",
    body: JSON.stringify({ cellar_id: cellarId, bottle_id: firstBottle.id, rating: 5 }),
  });
  assert.equal(forbiddenReview.response.ok, false, "A segunda conta não deve avaliar garrafas de outra adega.");
  checks.rls = "duas contas Neon Auth reais: leituras isoladas e movimentos/avaliações cruzados recusados";

  const reviews = (await rest(owner, `bottle_reviews?cellar_id=eq.${cellarId}&select=id,bottle_id,rating,comment`)).body;
  const wines = (await rest(owner, `wines?cellar_id=eq.${cellarId}&select=id,name,vintage`)).body;
  const wineById = new Map(wines.map((wine) => [wine.id, wine]));
  const finalBottles = (await rest(owner, `bottles?cellar_id=eq.${cellarId}&select=id,wine_id,shelf_id,row_number,column_number,status,removed_at,removal_reason`)).body;
  const ratingsByVintage = new Map();
  for (const review of reviews) {
    const vintage = wineById.get(finalBottles.find((item) => item.id === review.bottle_id)?.wine_id)?.vintage;
    if (!ratingsByVintage.has(vintage)) ratingsByVintage.set(vintage, []);
    ratingsByVintage.get(vintage).push(review.rating);
  }
  assert.deepEqual([...ratingsByVintage.get("2022")].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  assert.deepEqual([...ratingsByVintage.get("2021")], [5]);
  assert.equal(ratingsByVintage.get("2022").reduce((sum, rating) => sum + rating, 0) / 5, 3);
  assert.equal(ratingsByVintage.get("2021").reduce((sum, rating) => sum + rating, 0), 5);
  assert.ok(reviews.some((review) => review.comment === null), "Comentários devem ser opcionais.");
  assert.ok(reviews.some((review) => review.comment === "Comentário opcional de validação"));
  assert.ok(movementRows.every((item) => item.actor_id === owner.id), "Todo evento deve registrar o responsável autenticado.");
  assert.equal(movementRows.length, 6, "Um movimento, dois eventos de troca, um movimento concorrente e duas retiradas devem persistir.");
  checks.banco = "ratings e médias por safra, seis eventos auditáveis e actor_id conferidos via Data API";

  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await page.getByText(`Responsável: ${owner.email}`).first().waitFor();
  await page.getByText("Movimentação:").first().waitFor();
  await page.getByText("Troca:").first().waitFor();
  await page.getByText("Retirada:").first().waitFor();
  await page.getByText("Motivo: consumida").waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await page.getByText(`Responsável: ${owner.email}`).first().waitFor();
  await page.getByText("Motivo: consumida").waitFor();
  assert.equal(await page.locator(".history-item").count(), 6, "O histórico deve persistir após recarregar.");
  assert.equal(queuedDialogs.length, 0);
  assert.deepEqual(dialogErrors, []);
  assert.deepEqual(pageErrors, []);
  mkdirSync(resolve("test-results"), { recursive: true });
  await page.screenshot({ path: resolve("test-results/phase3-preview-history.png"), fullPage: true });
  checks.historico = "movimentação, troca, retiradas, motivo e responsável visíveis após reload";
  checks.screenshot = resolve("test-results/phase3-preview-history.png");

  console.log(JSON.stringify({
    preview: origin,
    neonBranch: expectedBranch,
    neonEndpoint: endpointId,
    accounts: users.map(({ email, id }) => ({ email, id })),
    checks,
    movementTypes: movementRows.map((item) => item.movement_type),
    ratingsByVintage: Object.fromEntries(ratingsByVintage),
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  if (page) {
    try {
      console.error(`PREVIEW_VISIBLE_TEXT: ${(await page.locator("body").innerText()).slice(0, 1200)}`);
      console.error(`PREVIEW_SUBMIT_BUTTONS: ${JSON.stringify(await page.locator("button[type=submit]").evaluateAll((items) => items.map((item) => ({ text: item.innerText, disabled: item.disabled, visible: item.getBoundingClientRect().width > 0 }))))}`);
      console.error(`PREVIEW_SELECTED_POSITIONS: ${JSON.stringify(await page.locator(".picker-cell[aria-pressed=true]").evaluateAll((items) => items.map((item) => item.getAttribute("aria-label"))))}`);
      mkdirSync(resolve("test-results"), { recursive: true });
      await page.screenshot({ path: resolve("test-results/phase3-preview-failure.png"), fullPage: true });
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  let cleanupFailed = false;
  for (const user of users) {
    try {
      const cellars = await rest(user, `cellars?owner_id=eq.${user.id}&select=id`);
      assert.equal(cellars.response.status, 200, "A conta temporária deve conseguir listar suas adegas para limpeza.");
      for (const cellar of cellars.body ?? []) {
        const deleted = await rest(user, `cellars?id=eq.${cellar.id}`, { method: "DELETE" });
        assert.ok(deleted.response.ok, "A limpeza da adega temporária deve ser autorizada.");
      }
      const remaining = await rest(user, `cellars?owner_id=eq.${user.id}&select=id`);
      assert.equal(remaining.body.length, 0, "A conta temporária não deve manter adegas/dados após o teste.");
    } catch {
      cleanupFailed = true;
      console.error("Falha ao limpar uma adega criada no E2E da branch Neon descartável.");
    }
  }
  if (cleanupFailed) process.exitCode = 1;
}
