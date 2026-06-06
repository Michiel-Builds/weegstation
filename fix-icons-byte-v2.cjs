const fs = require("fs");

const paths = [
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/App.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/BarChart.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/BonBouwer.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/ChauffeurScherm.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/LoginScherm.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/WeegPagina.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/XMLImport.jsx",
  "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/utils/helpers.js"
];

const byteReplacements = [
  // Euroteken
  { from: [0xE2, 0x82, 0xAC], to: "\u20AC" },
  // Check marks / vinkjes
  { from: [0xE2, 0x9C, 0x93], to: "\u2713" },  // ✓
  { from: [0xE2, 0x9C, 0x97], to: "\u2717" },  // ✗
  { from: [0xE2, 0x9C, 0x85], to: "\u2705" },  // ✅
  { from: [0xE2, 0x9C, 0x95], to: "\u2715" },  // ✕
  // Symbolen
  { from: [0xE2, 0x9A, 0xA0], to: "\u26A0" },  // ⚠
  { from: [0xE2, 0x9A, 0x99], to: "\u2699" },  // ⚙
  { from: [0xE2, 0x9A, 0x96], to: "\u2696" },  // ⚖
  { from: [0xE2, 0x9F, 0xB3], to: "\u27F3" },  // ⟳
  { from: [0xE2, 0x98, 0xB0], to: "\u2630" },  // ☰
  // Pijlen
  { from: [0xE2, 0x86, 0x92], to: "\u2192" },  // →
  // Punctuation
  { from: [0xE2, 0x80, 0x94], to: "\u2014" },  // —
  { from: [0xE2, 0x80, 0x93], to: "\u2013" },  // –
  { from: [0xE2, 0x80, 0x9C], to: "\u201C" },  // "
  { from: [0xE2, 0x80, 0x99], to: "\u2019" },  // '
  { from: [0xE2, 0x80, 0xA2], to: "\u2022" },  // •
  { from: [0xC2, 0xB0], to: "\u00B0" },         // °
  { from: [0xC2, 0xB7], to: "\u00B7" },         // ·
  // Letters met accenten
  { from: [0xC3, 0xA9], to: "\u00E9" },         // é
  { from: [0xC3, 0xA8], to: "\u00E8" },         // è
  { from: [0xC3, 0xAB], to: "\u00EB" },         // ë
  { from: [0xC3, 0xA0], to: "\u00E0" },         // à
  { from: [0xC3, 0xB4], to: "\u00F4" },         // ô
  { from: [0xC3, 0xAE], to: "\u00EE" },         // î
  { from: [0xC3, 0xA7], to: "\u00E7" },         // ç
  // Emojis (4-byte UTF-8)
  { from: [0xF0, 0x9F, 0x93, 0x84], to: "\uD83D\uDCC4" },  // 📄
  { from: [0xF0, 0x9F, 0x9F, 0xA2], to: "\uD83D\uDFA2" },  // 🟢
  { from: [0xF0, 0x9F, 0x93, 0x8A], to: "\uD83D\uDCCA" },  // 📊
  { from: [0xF0, 0x9F, 0x93, 0xA5], to: "\uD83D\uDCE5" },  // 📥
  { from: [0xF0, 0x9F, 0x97, 0x91], to: "\uD83D\uDDD1" },  // 🗑
  { from: [0xF0, 0x9F, 0x96, 0xA8], to: "\uD83D\uDDA8" },  // 🖨
  { from: [0xF0, 0x9F, 0x91, 0xA4], to: "\uD83D\uDC64" },  // 👤
  { from: [0xF0, 0x9F, 0xAA, 0x9E], to: "\uD83E\uDE9E" }   // 🪞
];

function processBuffer(buf) {
  let totalCount = 0;
  let result = buf;
  for (const r of byteReplacements) {
    const target = Buffer.from(r.from);
    const replacement = Buffer.from(r.to, "utf8");
    const parts = [];
    let i = 0;
    let count = 0;
    while (i < result.length) {
      if (i + target.length <= result.length && result.subarray(i, i + target.length).equals(target)) {
        parts.push(replacement);
        i += target.length;
        count++;
      } else {
        parts.push(result.subarray(i, i + 1));
        i++;
      }
    }
    result = Buffer.concat(parts);
    totalCount += count;
  }
  return { result, totalCount };
}

let grandTotal = 0;
for (const file of paths) {
  if (!fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);
  const { result, totalCount } = processBuffer(buf);
  fs.writeFileSync(file, result);
  grandTotal += totalCount;
  console.log(file.split("/").pop() + ": " + totalCount + " bytes vervangen");
}
console.log("Totaal: " + grandTotal);
