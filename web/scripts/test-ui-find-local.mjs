import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

// Encontrar vinho (docs/MVP.md 3.3.2) na demonstração local: busca sem acento, filtro por país
// e localização que abre o mapa com a posição destacada, em até 3 toques a partir da tela inicial.
const baseUrl = "http://localhost:3105";
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3105"], {
  cwd: process.cwd(),
  env: { ...process.env, NEXT_PUBLIC_NEON_DATABASE_URL: "", NEXT_TELEMETRY_DISABLED: "1" },
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

  browser = await chromium.launch({ headless: true, executablePath: chromePath });
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    let taps = 0;

    await page.getByRole("button", { name: "Meus vinhos" }).click(); taps += 1;
    await page.getByLabel("Buscar vinho na adega").fill("franca");
    await page.getByText("Pinot Noir", { exact: true }).waitFor();
    assert.equal(await page.locator("article.wine-list-row").count(), 1, "'franca' deve encontrar só o vinho da França");

    await page.getByLabel("Buscar vinho na adega").fill("");
    const countries = page.getByRole("group", { name: "Filtrar por país" });
    await countries.getByRole("button", { name: /^Brasil/ }).click();
    assert.equal(await page.locator("article.wine-list-row").count(), 3, "filtro Brasil deve mostrar os 3 vinhos brasileiros");
    await countries.getByRole("button", { name: /^Todos/ }).click();

    await page.getByLabel("Buscar vinho na adega").fill("franca");
    await page.getByRole("button", { name: "Abrir no mapa: Brancos & especiais · Linha 1 · Coluna 2" }).click(); taps += 1;
    const selected = page.locator(".shelf-cell.selected");
    await selected.waitFor();
    assert.equal(await selected.getAttribute("aria-label"), "Brancos & especiais, linha 1, coluna 2, Pinot Noir de Domaine des Pins");
    assert.ok(taps <= 3, `garrafa encontrada em ${taps} toques; o limite é 3`);
    await page.close();
  }
  console.log("UI local encontrar vinho: busca sem acento, filtro por país e localização abrindo o mapa destacado em 2 toques (desktop e celular) aprovados.");
} finally {
  await browser?.close();
  server.kill();
}
