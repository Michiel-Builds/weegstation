const fs = require("fs");
const path = "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/App.jsx";
let content = fs.readFileSync(path, "utf8");
let changes = [];

// === Fix 1: Voeg wsRef toe (als nog niet aanwezig) ===
if (!content.includes("const wsRef = useRef")) {
  // Zoek de laatste useState declaratie
  const regex = /(const \[simulatieModus, setSimulatieModus\]\s*=\s*useState\(false\);)/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      '$1\n  const wsRef = useRef(null);'
    );
    changes.push("wsRef toegevoegd");
  } else {
    // Probeer na de laatste useState
    const lines = content.split("\n");
    let lastUseStateIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("useState")) lastUseStateIdx = i;
    }
    if (lastUseStateIdx >= 0) {
      lines.splice(lastUseStateIdx + 1, 0, "  const wsRef = useRef(null);");
      content = lines.join("\n");
      changes.push("wsRef toegevoegd (fallback locatie)");
    }
  }
}

// === Fix 2: Verander 192.168.1.100 naar localhost ===
if (content.includes('useState("192.168.1.100")')) {
  content = content.replace(
    'useState("192.168.1.100")',
    'useState("localhost")'
  );
  changes.push("serverIP naar localhost");
}

// === Fix 3: voeg useRef toe aan de import ===
if (content.includes('import { useState, useEffect, useRef } from "react"') === false &&
    content.includes('import { useState, useEffect, useRef } from "react";') === false) {
  // Voeg useRef toe aan de bestaande import
  content = content.replace(
    /import \{ useState, useEffect \} from "react";/,
    'import { useState, useEffect, useRef } from "react";'
  );
  if (!content.includes("useRef")) {
    // Voeg aparte import toe
    content = content.replace(
      'import { useState, useEffect } from "react";',
      'import { useState, useEffect, useRef } from "react";'
    );
  }
  changes.push("useRef toegevoegd aan imports");
}

fs.writeFileSync(path, content, "utf8");
console.log("Wijzigingen:", changes.join(", "));
console.log("Total changes:", changes.length);
