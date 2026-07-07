#!/usr/bin/env node
/**
 * Publiceert een release naar GitHub via gh CLI (betrouwbaarder dan electron-builder publish).
 * Workflow: lokale build → gh release create/upload → verify-release download-check
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const exeName = `WeegStation-Setup-${version}.exe`;

const required = [
  join(root, "dist", exeName),
  join(root, "dist", "latest.yml"),
  join(root, "dist", `${exeName}.blockmap`),
  join(root, "release", "Weegserver.zip"),
];

for (const f of required) {
  if (!existsSync(f)) {
    console.error("✗ Ontbreekt:", f);
    console.error("  Draai eerst: npm run build:win && npm run pak-weegserver");
    process.exit(1);
  }
}

console.log("\n→ Lokale verificatie...");
execSync("node scripts/verify-release.mjs --local", { stdio: "inherit", cwd: root });

console.log(`\n→ GitHub release ${tag}...`);
try {
  execSync(`gh release view ${tag} --repo Michiel-Builds/weegstation`, { stdio: "pipe", cwd: root });
  console.log("  Release bestaat al — assets overschrijven");
} catch {
  execSync(
    `gh release create ${tag} --repo Michiel-Builds/weegstation --title "WeegStation ${version}" --notes "Release ${version} — geverifieerde upload"`,
    { stdio: "inherit", cwd: root }
  );
}

const uploadFiles = [
  join(root, "dist", exeName),
  join(root, "dist", `${exeName}.blockmap`),
  join(root, "dist", "latest.yml"),
  join(root, "release", "Weegserver.zip"),
].map((f) => `"${f}"`).join(" ");

execSync(
  `gh release upload ${tag} ${uploadFiles} --repo Michiel-Builds/weegstation --clobber`,
  { stdio: "inherit", cwd: root, shell: true }
);

console.log("\n→ GitHub download-verificatie...");
execSync("node scripts/verify-release.mjs", { stdio: "inherit", cwd: root });

console.log(`\n✓ Release ${tag} gepubliceerd en geverifieerd\n`);
