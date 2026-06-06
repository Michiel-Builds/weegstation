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

// Mapping van Latin-1 bytes (zoals ze in de bestanden staan) naar de juiste Unicode
// We gaan ervan uit dat de bron-emoji's oorspronkelijk correcte UTF-8 waren
// en dat ze als Windows-1252 zijn gelezen, dus nu in de bestanden staan als 2 Latin-1 chars per 1 UTF-8 char

// Latin-1 -> Unicode mapping
const latin1ToUnicode = {
  "\u00C2": "\u00B0",  // Â -> °
  "\u00C3\u00A2": "\u20AC",  // Ã¢ -> €
  "\u00C3\u00B0": "📄",  // Ã° -> 📄 (4 bytes UTF-8)
  "\u00C3\u00B0\u00C5\u2018": "📄",  // 4-byte UTF-8 split
};

// Een betere aanpak: detecteer Latin-1 misinterpretatie en herstel 'm
// We lezen het bestand als Windows-1252, dan schrijven we het als UTF-8
for (const file of paths) {
  if (!fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);

  // Probeer UTF-8
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    console.log("Al UTF-8: " + file.split("/").pop());
  } catch (e) {
    // Niet geldige UTF-8 - probeer Windows-1252
    text = new TextDecoder("windows-1252").decode(buf);
    fs.writeFileSync(file, text, { encoding: "utf8" });
    console.log("Geconverteerd (Win1252 -> UTF-8): " + file.split("/").pop());
  }
}
console.log("Klaar!");
