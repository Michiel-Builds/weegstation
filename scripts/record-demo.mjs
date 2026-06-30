import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = process.env.PREVIEW_URL || "http://localhost:4173";
const OUT_DIR = "/opt/cursor/artifacts";
const DEMO = {
  bedrijf: "Demo Metaal BV",
  user: "admin",
  pass: "demo12345",
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function klikNav(page, label, wachtMs = 1800) {
  await page.locator(".nav-item", { hasText: label }).click();
  await sleep(wachtMs);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: OUT_DIR, size: { width: 1366, height: 768 } },
    locale: "nl-NL",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  console.log("Start opname van productie-build:", BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(1000);

  const setupZichtbaar = await page.getByText("Welkom — stel uw bedrijf in").isVisible().catch(() => false);
  if (setupZichtbaar) {
    await page.getByPlaceholder("Uw bedrijfsnaam").fill(DEMO.bedrijf);
    await page.locator(".login-input").nth(1).fill(DEMO.user);
    const wachtwoordVelden = page.locator('input[type="password"]');
    await wachtwoordVelden.nth(0).fill(DEMO.pass);
    await wachtwoordVelden.nth(1).fill(DEMO.pass);
    await page.getByRole("button", { name: /installatie voltooien/i }).click();
    await sleep(2000);
  }

  const loginZichtbaar = await page.getByText("Gebruikersnaam").isVisible().catch(() => false);
  if (loginZichtbaar) {
    await page.locator('input[type="password"]').fill(DEMO.pass);
    await page.getByRole("button", { name: /inloggen/i }).click();
    await sleep(1500);
  }

  await page.waitForSelector(".nav-item", { timeout: 15000 });
  await sleep(800);

  const paginas = [
    "Dashboard",
    "Calculator",
    "Wegen",
    "Bon maken",
    "Formulieren",
    "Overzicht",
    "Prijzen",
    "Rapport",
    "Instellingen",
  ];

  for (const label of paginas) {
    const item = page.locator(".nav-item", { hasText: label });
    if (await item.count()) {
      console.log("Navigeer naar:", label);
      await klikNav(page, label, label === "Formulieren" ? 3500 : 1800);
    }
  }

  const cmrTab = page.locator(".rtab", { hasText: "CMR" });
  if (await cmrTab.count()) {
    console.log("Formulieren: CMR-tab");
    await cmrTab.click();
    await sleep(2000);
    await page.locator(".rtab", { hasText: "Begeleidingsbrief" }).click();
    await sleep(2500);
  }

  await klikNav(page, "Dashboard", 2000);

  const titel = await page.title();
  console.log("Paginatitel:", titel);
  console.log("Build-URL:", BASE);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tmpPath = await video.path();
    const videoPath = join(OUT_DIR, "weegstation-demo.webm");
    const { copyFile } = await import("fs/promises");
    await copyFile(tmpPath, videoPath);
    console.log("Video:", videoPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
