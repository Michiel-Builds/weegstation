import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, Image } from "canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formsDir = path.join(__dirname, "../public/forms");

class NodeCanvasFactory {
  create(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, w, h) {
    canvasAndContext.canvas.width = w;
    canvasAndContext.canvas.height = h;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

async function renderPdf(name, outName, scale = 2) {
  const pdfPath = path.join(formsDir, name);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvasFactory = new NodeCanvasFactory();
  const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
  await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
  const out = path.join(formsDir, outName);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  const wmm = viewport.width / scale * 0.352778;
  const hmm = viewport.height / scale * 0.352778;
  console.log(`OK ${outName}: ${wmm.toFixed(1)} x ${hmm.toFixed(1)} mm`);
}

await renderPdf("begeleidingsbrief-officieel.pdf", "begeleidingsbrief-bg.png", 2);
await renderPdf("cmr-officieel.pdf", "cmr-bg.png", 2);
