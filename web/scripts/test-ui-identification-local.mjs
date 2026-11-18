import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = "http://localhost:3103";
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3103"], {
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

  browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();
  const blockedRequests = [];
  page.on("request", (request) => {
    if (/neon\.tech|openfoodfacts\.org|wineapi\.io|api\.openai\.com|search\.brave\.com/i.test(request.url())) {
      blockedRequests.push(request.url());
    }
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Registrar vinho" }).click();
  const modal = page.getByRole("dialog", { name: "Adicionar à adega" });
  await modal.waitFor({ state: "visible" });

  const ean = modal.getByLabel("EAN-13");
  await ean.fill("7892500022444");
  await modal.getByRole("alert").filter({ hasText: "EAN-13 inválido" }).waitFor({ state: "visible" });
  await ean.fill("7892500022445");
  assert.equal(await modal.getByRole("button", { name: "Consultar" }).isDisabled(), true, "lookup must remain disabled without authenticated Neon");

  await modal.getByRole("button", { name: "Abrir câmera para ler o código" }).click();
  const scanner = page.getByRole("dialog", { name: "Scanner de código de barras" });
  await scanner.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const video = document.querySelector(".scanner-preview video");
    const message = document.querySelector(".barcode-scanner [role=status]")?.textContent ?? "";
    return video?.srcObject instanceof MediaStream || /não foi possível|negado|nenhuma câmera|HTTPS/i.test(message);
  }, { timeout: 6000 }).catch(() => {});
  const activeScannerTracks = await scanner.locator("video").evaluate((video) => {
    const tracks = video.srcObject instanceof MediaStream ? video.srcObject.getTracks() : [];
    window.__scannerTracks = tracks;
    return tracks.length;
  });
  await scanner.getByRole("button", { name: "Cancelar scanner" }).click();
  await scanner.waitFor({ state: "hidden" });
  if (activeScannerTracks > 0) {
    const tracksReleased = await page.evaluate(() =>
      window.__scannerTracks?.every((track) => track.readyState === "ended") ?? false,
    );
    assert.equal(tracksReleased, true, "cancel must stop camera media tracks");
  }
  await modal.waitFor({ state: "visible" });

  await modal.getByPlaceholder("Ex.: Malbec Reserva").fill("Vinho de regressão local");
  await modal.getByPlaceholder("Ex.: Bodega del Valle").fill("Produtor de teste");
  await modal.locator("button.picker-cell:not(:disabled)").first().click();
  const submitButton = modal.locator("button[type=submit].primary-button");
  if (await submitButton.isDisabled()) {
    const selectedCount = await modal.locator("button.picker-cell[aria-pressed=true]").count();
    const shortage = await modal.locator(".picker-shortage").allInnerTexts();
    throw new Error(`Cadastro local não habilitou salvar. Selecionadas: ${selectedCount}. ${shortage.join(" ")}`);
  }
  await submitButton.click();
  await page.getByRole("status").filter({ hasText: "garrafa adicionada à adega" }).waitFor({ state: "visible" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Meus vinhos/ }).click();
  await page.getByText("Vinho de regressão local", { exact: true }).waitFor({ state: "visible" });
  assert.deepEqual(blockedRequests, [], "local-only UI test must never reach Neon or external APIs");
  console.log(`UI local: EAN inválido bloqueado, consulta sem autenticação desativada, scanner cancelável (${activeScannerTracks} tracks de mídia ativos antes do cancelamento), cadastro manual e persistência após recarga aprovados; nenhuma API externa foi chamada.`);
} finally {
  await browser?.close();
  server.kill();
}
