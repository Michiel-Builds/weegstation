/** Zorg dat Capacitor index.html vindt in dist-mobile. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-mobile");
const src = path.join(dir, "index-mobile.html");
const dest = path.join(dir, "index.html");

if (!fs.existsSync(src)) {
  console.error("dist-mobile/index-mobile.html ontbreekt — eerst npm run build:mobile");
  process.exit(1);
}
fs.copyFileSync(src, dest);
console.log("OK dist-mobile/index.html aangemaakt voor Capacitor");
