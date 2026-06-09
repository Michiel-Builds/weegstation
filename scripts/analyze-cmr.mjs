import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formsDir = path.join(__dirname, "../public/forms");

const data = new Uint8Array(fs.readFileSync(path.join(formsDir, "cmr-officieel.pdf")));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const text = await page.getTextContent();
  const items = text.items.filter(i => i.str && i.str.trim()).map(i => ({
    t: i.str.trim(),
    x: +(i.transform[4] * 0.352778).toFixed(1),
    y: +((vp.height - i.transform[5]) * 0.352778).toFixed(1),
  }));
  const hasCmr = items.some(i => /afzender|geadresseerde|CMR|Expéditeur|Sender/i.test(i.t));
  console.log(`\nPage ${p}: ${items.length} items, looksLikeCMR=${hasCmr}`);
  if (hasCmr) {
    items.sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach(i => console.log(`${String(i.y).padStart(6)}mm  ${String(i.x).padStart(6)}mm  ${i.t}`));
  }
}
