import { chromium } from "playwright";
import { mkdir, copyFile } from "fs/promises";
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

async function loginFlow(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(800);

  if (await page.getByText("Welkom — stel uw bedrijf in").isVisible().catch(() => false)) {
    await page.getByPlaceholder("Uw bedrijfsnaam").fill(DEMO.bedrijf);
    await page.locator(".login-input").nth(1).fill(DEMO.user);
    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill(DEMO.pass);
    await pw.nth(1).fill(DEMO.pass);
    await page.getByRole("button", { name: /installatie voltooien/i }).click();
    await sleep(2000);
  }

  if (await page.getByText("Gebruikersnaam").isVisible().catch(() => false)) {
    await page.locator('input[type="password"]').fill(DEMO.pass);
    await page.getByRole("button", { name: /inloggen/i }).click();
    await sleep(1500);
  }

  await page.waitForSelector(".nav-item", { timeout: 10000 });
}

async function toonLmaSectie(page) {
  console.log("Formulieren → LMA-sectie tonen");
  await page.locator(".nav-item", { hasText: "Formulieren" }).click();
  await sleep(1200);

  await page.locator(".rtab", { hasText: "Begeleidingsbrief" }).click();
  await sleep(800);

  const lmaTitel = page.locator(".form-voorbeeld-titel");
  await lmaTitel.scrollIntoViewIfNeeded();
  await sleep(1000);

  const lmaHint = page.locator(".form-preview-hint");
  await lmaHint.scrollIntoViewIfNeeded();
  await sleep(8000);

  const teksten = await page.locator(".form-voorbeeld-titel, .form-preview-hint").allTextContents();
  console.log("Zichtbare LMA-tekst:", teksten.join(" | "));
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

  console.log("Opname productie-build:", BASE);
  await loginFlow(page);

  await page.locator(".nav-item", { hasText: "Dashboard" }).click();
  await sleep(1500);

  await toonLmaSectie(page);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tmpPath = await video.path();
    const videoPath = join(OUT_DIR, "weegstation-demo.webm");
    await copyFile(tmpPath, videoPath);
    console.log("Video:", videoPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
