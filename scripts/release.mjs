#!/usr/bin/env node
/**
 * Eén release-commando — lokaal én CI gebruiken dezelfde build-stappen.
 * build frontend → installer → weegserver zip → verify → upload → verify download
 */
import { existsSync } from "fs";
import { execSync } from "child_process";
import { PATHS, readVersion, tag, installerPaths } from "./release-config.mjs";

const root = PATHS.root;
const version = readVersion();
const releaseTag = tag(version);
const files = installerPaths(version);

function run(label, cmd) {
  console.log(`\n→ ${label}...`);
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true });
}

function requireFile(path, hint) {
  if (!existsSync(path)) {
    console.error(`\n✗ Ontbreekt: ${path}`);
    if (hint) console.error(`  ${hint}`);
    process.exit(1);
  }
}

console.log(`\n══════════════════════════════════════`);
console.log(`  WeegStation release ${releaseTag}`);
console.log(`══════════════════════════════════════`);

run("Frontend bouwen (vite)", "npm run build:frontend");
run("Icon genereren", "node convert-icon.mjs");
run("Windows installer bouwen", "npx electron-builder --win --publish never");
run("Weegserver ZIP", "npm run pak-weegserver");

requireFile(files.exe, "electron-builder is mislukt");
requireFile(files.latestYml, "latest.yml ontbreekt na build");
requireFile(PATHS.weegserverZip, "pak-weegserver is mislukt");

run("Lokale verificatie", "node scripts/verify-release.mjs --local");

console.log(`\n→ GitHub release ${releaseTag}...`);
try {
  execSync(`gh release view ${releaseTag} --repo Michiel-Builds/weegstation`, { stdio: "pipe", cwd: root });
  console.log("  Release bestaat al — assets overschrijven");
} catch {
  execSync(
    `gh release create ${releaseTag} --repo Michiel-Builds/weegstation --title "WeegStation ${version}" --notes "Release ${version}"`,
    { stdio: "inherit", cwd: root }
  );
}

const upload = [
  files.exe,
  files.blockmap,
  files.latestYml,
  PATHS.weegserverZip,
].map((f) => `"${f}"`).join(" ");

run("Upload naar GitHub", `gh release upload ${releaseTag} ${upload} --repo Michiel-Builds/weegstation --clobber`);
run("GitHub download-verificatie", "node scripts/verify-release.mjs");

console.log(`\n✓ Release ${releaseTag} klaar en geverifieerd\n`);
