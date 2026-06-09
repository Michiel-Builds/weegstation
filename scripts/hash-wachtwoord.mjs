#!/usr/bin/env node
/** Genereer SHA-256 hash voor een nieuw login-wachtwoord. */
import { createHash } from "crypto";

const SALT = "bulters-weegsysteem-v1:";
const wachtwoord = process.argv[2];

if (!wachtwoord) {
  console.error("Gebruik: node scripts/hash-wachtwoord.mjs <nieuw-wachtwoord>");
  process.exit(1);
}

const hash = createHash("sha256").update(SALT + wachtwoord).digest("hex");
console.log("Plak in src/data/stamdata.js bij wachtwoordHash:");
console.log(hash);
