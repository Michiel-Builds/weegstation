#!/usr/bin/env node
/**
 * Bouwt Bulters-Weegserver.zip — minimaal pakket voor de klant (weegbrug-PC).
 * Geen broncode, geen Electron, geen React.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "weegserver-pakket");
const releaseDir = join(root, "release");
const outDir = join(releaseDir, "Bulters-Weegserver");
const zipPath = join(releaseDir, "Bulters-Weegserver.zip");

console.log("→ Bulters weegserver-pakket bouwen...\n");

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
if (existsSync(zipPath)) rmSync(zipPath, { force: true });
mkdirSync(outDir, { recursive: true });

let server = readFileSync(join(root, "server.cjs"), "utf8");
server = server.replace(/\.\/server\/security\.cjs/g, "./security.cjs");
writeFileSync(join(outDir, "server.cjs"), server);

cpSync(join(root, "server", "security.cjs"), join(outDir, "security.cjs"));
cpSync(join(pkgDir, "package.json"), join(outDir, "package.json"));
cpSync(join(pkgDir, "start-weegserver.bat"), join(outDir, "start-weegserver.bat"));
cpSync(join(pkgDir, "LEESMIJ.txt"), join(outDir, "LEESMIJ.txt"));

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
console.log("  • Bulters-Weegserver.zip  (weegbrug-PC)");
console.log("  • Bulters Weegsysteem-Setup-*.exe  (kantoor-PC)");
