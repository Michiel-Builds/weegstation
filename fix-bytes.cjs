const fs = require("fs");
const file = "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/App.jsx";
let content = fs.readFileSync(file, "utf8");

const fixes = [
  ["âœ\"", "OK"],          // placeholder, real fix via line-by-line
];

// Eenvoudiger: vervang ALLE bekende foute patronen in één keer
// We lezen als losse bytes om alle encodings aan te kunnen

const buf = fs.readFileSync(file);
const before = buf.length;

// Vervang de dubbel-gecodeerde UTF-8 bytes
// (de broncode bevat al die foute tekens als 2 Latin-1 chars per 1 UTF-8 char)

// We doen byte-substitutie op de buffer-niveau
let bytes = Array.from(buf);
const newBytes = [];

// Eerst: vervang alle bekende verkeerde byte-reeksen
// De verkeerde tekens in de broncode zijn al Latin-1 misinterpretatie van UTF-8
// Dus: vervang de verkeerde strings direct

const replacements = {
  "Ã¢Å“": "✓",       // ✓ check
  "Ã°Å¸": "📄",     // 📄 doc
  "Ã¢Ëœ": "☰",       // ☰ menu
  "Ã¢Å¾": "🟢",     // 🟢 green circle
  "Ã°Å¸â€¡": "🚛",   // 🚛 truck
  "â‚¬": "€",         // € euro
  "Ã‚Â·": "·",         // ·
  "Â·": "·",           // ·
  "â€\"": "—",       // — em-dash
  "â€\"": "–",       // – en-dash
  "â€ž": "\"",         // "
  "â€™": "'",         // '
  "â€œ": "\"",         // "
};

let s = buf.toString("utf8");
for (const [bad, good] of Object.entries(replacements)) {
  s = s.split(bad).join(good);
}
fs.writeFileSync(file, s, "utf8");
console.log("Bytes voor:", before);
console.log("Bytes na:", Buffer.from(s, "utf8").length);
