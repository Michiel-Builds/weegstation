#!/usr/bin/env node
/**
 * Verifieert dat de GitHub-release overeenkomt met de lokale build.
 * Gebruik:
 *   node scripts/verify-release.mjs           → download van GitHub + vergelijk
 *   node scripts/verify-release.mjs --local   → alleen lokale exe vs latest.yml
 */
import { readFileSync, statSync, existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "release", "electron-dist");
const localOnly = process.argv.includes("--local");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const exeName = `WeegStation-Setup-${version}.exe`;
const localExe = join(distDir, exeName);
const latestYml = join(distDir, "latest.yml");
const tag = `v${version}`;

function sha512File(filePath) {
  const hash = createHash("sha512");
  hash.update(readFileSync(filePath));
  return hash.digest("base64");
}

function parseLatestYml(inhoud) {
  const sizeMatch =
    inhoud.match(/^size:\s*(\d+)/m) ||
    inhoud.match(/^\s+size:\s*(\d+)/m);
  const shaMatch =
    inhoud.match(/^sha512:\s*(.+)$/m) ||
    inhoud.match(/^\s+sha512:\s*(.+)$/m);
  return {
    size: sizeMatch ? Number(sizeMatch[1]) : null,
    sha512: shaMatch ? shaMatch[1].trim() : null,
  };
}

function fail(msg) {
  console.error("\n✗ VERIFICATIE MISLUKT:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("✓", msg);
}

console.log(`\n→ WeegStation release-verificatie v${version}\n`);

if (!existsSync(localExe)) fail(`Lokaal bestand ontbreekt: release/electron-dist/${exeName}`);
if (!existsSync(latestYml)) fail("release/electron-dist/latest.yml ontbreekt — eerst electron-builder draaien");

const localSize = statSync(localExe).size;
const localSha = sha512File(localExe);
const yml = parseLatestYml(readFileSync(latestYml, "utf8"));

ok(`Lokaal: ${exeName} = ${localSize.toLocaleString("nl-NL")} bytes`);

if (yml.size !== localSize) {
  fail(`latest.yml size (${yml.size}) ≠ lokale exe (${localSize})`);
}
ok("latest.yml size = lokale exe");

if (yml.sha512 && yml.sha512 !== localSha) {
  fail("latest.yml sha512 ≠ lokale exe sha512");
}
ok("latest.yml sha512 = lokale exe");

if (localOnly) {
  console.log("\n✓ Lokale verificatie geslaagd (--local)\n");
  process.exit(0);
}

const tmpDir = join(root, "release", "_verify-download");
mkdirSync(tmpDir, { recursive: true });

try {
  console.log(`\n→ Downloaden van GitHub release ${tag}...`);
  execSync(
    `gh release download ${tag} --repo Michiel-Builds/weegstation --pattern "${exeName}" --dir "${tmpDir}" --clobber`,
    { stdio: "inherit", cwd: root }
  );

  const remoteExe = join(tmpDir, exeName);
  if (!existsSync(remoteExe)) fail(`Download mislukt: ${remoteExe} niet gevonden`);

  const remoteSize = statSync(remoteExe).size;
  ok(`GitHub: ${exeName} = ${remoteSize.toLocaleString("nl-NL")} bytes`);

  if (remoteSize !== localSize) {
    fail(
      `GitHub exe (${remoteSize}) is ${localSize - remoteSize} bytes KLEINER/GROTER dan lokaal (${localSize}).\n` +
      "  Herupload met: gh release upload " + tag + ' "release/electron-dist/' + exeName + '" "release/electron-dist/latest.yml" "release/electron-dist/*.blockmap" --clobber'
    );
  }

  const remoteSha = sha512File(remoteExe);
  if (remoteSha !== localSha) {
    fail("GitHub exe sha512 ≠ lokale exe sha512");
  }

  ok("GitHub exe = lokale exe (grootte + checksum)");
  console.log("\n✓ Release-verificatie geslaagd\n");
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}
