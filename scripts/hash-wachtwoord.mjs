#!/usr/bin/env node
/** Genereer SHA-256 hash voor handmatig herstel van auth.json (noodgeval). */
import { createHash, randomBytes } from "crypto";

const SALT = "weegstation-v1:";
const wachtwoord = process.argv[2];

if (!wachtwoord) {
  console.error("Gebruik: node scripts/hash-wachtwoord.mjs <nieuw-wachtwoord>");
  process.exit(1);
}

const hash = createHash("sha256").update(SALT + wachtwoord).digest("hex");
const sleutel = randomBytes(24).toString("base64url");

console.log("\n--- Wachtwoord-hash (voor auth.json) ---");
console.log(hash);
console.log("\n--- Voorbeeld auth.json ---");
console.log(JSON.stringify({
  gebruikersnaam: "admin",
  naam: "Beheerder",
  rol: "Admin",
  wachtwoordHash: hash,
}, null, 2));
console.log("\nElectron: %APPDATA%\\weegstation-app\\auth.json");
console.log("\n--- Optionele nieuwe weegserver-sleutel ---");
console.log(sleutel);
console.log("Zet in .env op weegbrug: WEEGSERVER_KEY=" + sleutel);
