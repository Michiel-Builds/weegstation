#!/usr/bin/env node
/**
 * Verifieert dat de GitHub-release overeenkomt met de lokale build.
 *   node scripts/verify-release.mjs           → download van GitHub + vergelijk
 *   node scripts/verify-release.mjs --local   → alleen lokale exe vs latest.yml
 */
import { readFileSync, statSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { execSync } from "child_process";
import { REPO, PATHS, readVersion, exeName, tag, installerPaths } from "./release-config.mjs";

const localOnly = process.argv.includes("--local");
const version = readVersion();
const name = exeName(version);
const releaseTag = tag(version);
const { exe: localExe, latestYml } = installerPaths(version);

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

if (!existsSync(localExe)) fail(`Lokaal bestand ontbreekt: ${localExe}`);
if (!existsSync(latestYml)) fail(`latest.yml ontbreekt: ${latestYml}`);

const localSize = statSync(localExe).size;
const localSha = sha512File(localExe);
const yml = parseLatestYml(readFileSync(latestYml, "utf8"));

ok(`Lokaal: ${name} = ${localSize.toLocaleString("nl-NL")} bytes`);

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

mkdirSync(PATHS.verifyDownload, { recursive: true });

try {
  console.log(`\n→ Downloaden van GitHub release ${releaseTag}...`);
  execSync(
    `gh release download ${releaseTag} --repo ${REPO} --pattern "${name}" --dir "${PATHS.verifyDownload}" --clobber`,
    { stdio: "inherit", cwd: PATHS.root }
  );

  const remoteExe = join(PATHS.verifyDownload, name);
  if (!existsSync(remoteExe)) fail(`Download mislukt: ${remoteExe} niet gevonden`);

  const remoteSize = statSync(remoteExe).size;
  ok(`GitHub: ${name} = ${remoteSize.toLocaleString("nl-NL")} bytes`);

  if (remoteSize !== localSize) {
    fail(
      `GitHub exe (${remoteSize}) ≠ lokaal (${localSize}).\n` +
      "  Herupload: npm run release"
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
    rmSync(PATHS.verifyDownload, { recursive: true, force: true });
  } catch {}
}
