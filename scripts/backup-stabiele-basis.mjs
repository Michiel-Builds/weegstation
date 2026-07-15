#!/usr/bin/env node
/**
 * Maakt een lokale backup van de huidige stabiele release (vóór grote wijzigingen).
 * Gebruik: npm run backup-stabiel
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const backupDir = join(root, "backup", `v${version}-stable`);

const items = [
  { src: join(root, "release", "electron-dist", `WeegStation-Setup-${version}.exe`), dest: "WeegStation-Setup-" + version + ".exe" },
  { src: join(root, "release", "electron-dist", `WeegStation-Setup-${version}.exe.blockmap`), dest: `WeegStation-Setup-${version}.exe.blockmap`, optional: true },
  { src: join(root, "release", "Weegserver.zip"), dest: "Weegserver.zip" },
  { src: join(root, "release", "Weegserver"), dest: "Weegserver", dir: true },
];

mkdirSync(backupDir, { recursive: true });

let copied = 0;
for (const item of items) {
  const dest = join(backupDir, item.dest);
  if (!existsSync(item.src)) {
    if (!item.optional) console.warn("  ⚠ Ontbreekt:", item.src);
    continue;
  }
  if (item.dir) {
    cpSync(item.src, dest, { recursive: true });
  } else {
    cpSync(item.src, dest);
  }
  console.log("  ✓", item.dest);
  copied++;
}

const info = [
  "WeegStation stabiele basis-backup",
  "Versie: " + version,
  "Datum: " + new Date().toISOString(),
  "",
  "Werkt op dit moment:",
  "- Weegserver monitor (localhost)",
  "- COM5 + $-gewicht parser",
  "- Netwerk weegbrug <-> kantoor",
  "",
  "Herstel app: installeer WeegStation-Setup-" + version + ".exe",
  "Herstel weegbrug: pak Weegserver.zip uit",
  "Herstel code: git checkout v" + version + "-stable (na tag)",
].join("\n");

writeFileSync(join(backupDir, "VERSIE.txt"), info, "utf8");
console.log("\n✓ Backup map:", backupDir);
console.log("  Bestanden gekopieerd:", copied);
console.log("\nTip: git tag v" + version + "-stable  (handmatig, geen commit nodig)");
