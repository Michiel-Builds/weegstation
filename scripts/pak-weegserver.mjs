#!/usr/bin/env node
/**
 * Bouwt Weegserver.zip — minimaal pakket voor de klant (weegbrug-PC).
 * Geen broncode, geen Electron, geen React.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "weegserver-pakket");
const releaseDir = join(root, "release");
const outDir = join(releaseDir, "Weegserver");
const zipPath = join(releaseDir, "Weegserver.zip");

console.log("→ WeegStation weegserver-pakket bouwen...\n");

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
if (existsSync(zipPath)) rmSync(zipPath, { force: true });
mkdirSync(outDir, { recursive: true });

let server = readFileSync(join(root, "server.cjs"), "utf8");
server = server.replace(/\.\/server\/security\.cjs/g, "./security.cjs");
server = server.replace(/\.\/server\/stoplicht\.cjs/g, "./stoplicht.cjs");
writeFileSync(join(outDir, "server.cjs"), server);

cpSync(join(root, "server", "security.cjs"), join(outDir, "security.cjs"));
cpSync(join(root, "server", "stoplicht.cjs"), join(outDir, "stoplicht.cjs"));
cpSync(join(pkgDir, "package.json"), join(outDir, "package.json"));
cpSync(join(pkgDir, "start-weegserver.bat"), join(outDir, "start-weegserver.bat"));
cpSync(join(pkgDir, "monitor.html"), join(outDir, "monitor.html"));
cpSync(join(pkgDir, "lijst-com-poorten.mjs"), join(outDir, "lijst-com-poorten.mjs"));
cpSync(join(pkgDir, "lijst-com-poorten.bat"), join(outDir, "lijst-com-poorten.bat"));
cpSync(join(pkgDir, "open-monitor.bat"), join(outDir, "open-monitor.bat"));
cpSync(join(pkgDir, "open-browser-monitor.bat"), join(outDir, "open-browser-monitor.bat"));
cpSync(join(pkgDir, "open-monitor-na-start.bat"), join(outDir, "open-monitor-na-start.bat"));
cpSync(join(pkgDir, "test-com-poort.mjs"), join(outDir, "test-com-poort.mjs"));
cpSync(join(pkgDir, "test-com-poort.bat"), join(outDir, "test-com-poort.bat"));
cpSync(join(pkgDir, "wijzig-com.bat"), join(outDir, "wijzig-com.bat"));
cpSync(join(pkgDir, "controleer-map.bat"), join(outDir, "controleer-map.bat"));
cpSync(join(pkgDir, "LEESMIJ.txt"), join(outDir, "LEESMIJ.txt"));
cpSync(join(pkgDir, "OFFLINE-INSTALLATIE.txt"), join(outDir, "OFFLINE-INSTALLATIE.txt"));
cpSync(join(pkgDir, "config.example.env"), join(outDir, "config.example.env"));
cpSync(join(pkgDir, "maak-env.bat"), join(outDir, "maak-env.bat"));
if (existsSync(join(pkgDir, "weegbrug.env"))) {
  cpSync(join(pkgDir, "weegbrug.env"), join(outDir, "weegbrug.env"));
}

console.log("→ npm install (productie)...\n");
execSync("npm install --omit=dev", { cwd: outDir, stdio: "inherit" });

console.log("\n→ ZIP maken...\n");
mkdirSync(releaseDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${outDir}' -DestinationPath '${zipPath}' -Force"`,
  { stdio: "inherit" }
);

console.log("\n✓ Klaar:");
console.log("  Map:  " + outDir);
console.log("  ZIP:  " + zipPath);
console.log("\nGeef de klant alleen:");
console.log("  • Weegserver.zip  (weegbrug-PC)");
console.log("  • WeegStation-Setup-*.exe  (kantoor-PC)");
