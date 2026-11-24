import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://localhost:3104";
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3104"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_PUBLIC_NEON_DATABASE_URL: "",
    DATABASE_URL: "",
    WINEAPI_API_KEY: "",
    ENABLE_WINEAPI_IDENTIFICATION: "false",
    BRAVE_SEARCH_API_KEY: "",
    ENABLE_EXTERNAL_WEB_SEARCH: "false",
    OPENAI_API_KEY: "",
    ENABLE_OPENAI_IDENTIFICATION: "false",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: "ignore",
});

let browser;
let answers = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next dev server exited with ${server.exitCode}.`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) { ready = true; break; }
    } catch { /* the server is still compiling */ }
    await delay(500);
  }
  assert.equal(ready, true, "local-only UI server did not become ready");

  browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const externalRequests = [];
  page.on("request", (request) => {
    if (/neon\.tech|openfoodfacts\.org|wineapi\.io|api\.openai\.com|search\.brave\.com/i.test(request.url())) externalRequests.push(request.url());
  });
  page.on("dialog", async (dialog) => {
    const answer = answers.shift();
    if (answer === undefined) throw new Error(`Unexpected dialog: ${dialog.message()}`);
    await dialog.accept(answer === true ? undefined : answer);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Adega principal, linha 1, coluna 1, Malbec de altitude de Serra Clara" }).click();
  answers = ["Adega principal/3/3"];
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.getByRole("button", { name: "Adega principal, linha 3, coluna 3, Malbec de altitude de Serra Clara" }).waitFor();

  answers = ["Adega principal/1/2", true];
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.getByRole("button", { name: "Adega principal, linha 1, coluna 2, Malbec de altitude de Serra Clara" }).click();
  await page.getByRole("button", { name: "Avaliar garrafa" }).click();
  await page.getByRole("button", { name: "4 estrelas" }).click();
  await page.getByPlaceholder("O que achou deste vinho?").fill("Teste da avaliação");
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  await page.getByText("Avaliação salva para esta garrafa.").waitFor();
  await page.getByText("Média do vinho: 4,0 / 5 · 1 avaliação").waitFor();

  answers = ["consumida", true];
  await page.getByRole("button", { name: "Retirar", exact: true }).click();
  await page.getByText("Retirada registrada; posição liberada.").waitFor();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await page.getByText("Teste da avaliação").first().waitFor();
  await page.getByText("Motivo: consumida").waitFor();
  assert.equal(await page.getByText("Troca:").count(), 2, "both sides of the exchange must be identified in history");
  await page.getByText("Responsável: Demonstração local").first().waitFor();
  assert.equal(await page.locator(".history-item").count(), 4, "one move, two swap records, and one removal must be retained");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await page.getByText("Teste da avaliação").first().waitFor();
  await page.getByText("Motivo: consumida").waitFor();
  assert.equal(await page.getByText("Troca:").count(), 2, "exchange history must survive a reload");
  assert.equal(await page.locator(".history-item").count(), 4, "history must survive a reload");
  assert.deepEqual(externalRequests, [], "local phase 3 flow must not call Neon or external services");
  assert.equal(answers.length, 0, "all browser confirmations must be consumed");
  console.log("UI local fase 3: movimento, troca, nota com comentário, média por safra, retirada, responsável e histórico persistido após reload aprovados; sem chamadas externas.");
} finally {
  await browser?.close();
  server.kill();
}
