import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formsDir = path.join(__dirname, "../public/forms");

async function dumpAll(name) {
  const data = new Uint8Array(fs.readFileSync(path.join(formsDir, name)));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const text = await page.getTextContent();
  const items = text.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      t: i.str.trim(),
      x: +(i.transform[4] * 0.352778).toFixed(1),
      y: +((vp.height - i.transform[5]) * 0.352778).toFixed(1),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  console.log(`\n=== ${name} (${items.length} items) ===`);
  items.forEach(i => console.log(`${String(i.y).padStart(6)}mm  ${String(i.x).padStart(6)}mm  ${i.t}`));
}

await dumpAll("begeleidingsbrief-officieel.pdf");
