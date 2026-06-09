import {
  PAGINA_BVA, BEGELEIDINGSBRIEF_VELDEN, CMR_VELDEN, ANNEX7_VELDEN,
  BEGELEIDINGSBRIEF_VELDEN_A4, CMR_VELDEN_A4, OFFICIEEL_A4, FORM_PDF
} from "../data/formulierPosities";
import { laadKalibratie } from "./formulierKalibratie";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function partijRegels(p, opts = {}) {
  const { naam = true, adres = true, vihb = true, telefoon = false } = opts;
  const regels = [];
  if (naam && p.naam) regels.push(p.naam);
  if (p.contactpersoon) regels.push("T.a.v. " + p.contactpersoon);
  if (adres) {
    const straat = p.adres || "";
    const plaats = [p.postcode, p.plaats].filter(Boolean).join(" ");
    if (straat) regels.push(straat);
    if (plaats) regels.push(plaats);
  }
  if (vihb && p.vihb) regels.push("VIHB: " + p.vihb);
  if (telefoon && p.telefoon) regels.push("Tel: " + p.telefoon);
  return regels;
}

function wrapTekst(tekst, maxLines, maxCharsPerLine) {
  if (!tekst) return [];
  const woorden = String(tekst).split(/\s+/);
  const regels = [];
  let huidig = "";
  for (const w of woorden) {
    const probeer = huidig ? huidig + " " + w : w;
    if (probeer.length > maxCharsPerLine && huidig) {
      regels.push(huidig);
      huidig = w;
    } else {
      huidig = probeer;
    }
    if (regels.length >= maxLines) break;
  }
  if (huidig && regels.length < maxLines) regels.push(huidig);
  return regels.slice(0, maxLines);
}

function veldHtml(tekst, pos, kal) {
  const bonding = kal.bondingRand ? 10 : 0;
  const x = pos.x + kal.offsetLinks;
  const y = pos.y + kal.offsetBoven + bonding;
  const size = pos.size || kal.fontSize;
  const regels = typeof tekst === "string"
    ? tekst.split("\n").filter(Boolean)
    : Array.isArray(tekst) ? tekst.filter(Boolean) : [];
  const charsPerLine = Math.max(8, Math.floor(pos.w / (size * 0.52)));
  const inhoud = regels.flatMap(r => wrapTekst(r, pos.lines, charsPerLine)).slice(0, pos.lines).join("\n");
  if (!inhoud.trim()) return "";
  return `<div class="veld" style="left:${x}mm;top:${y}mm;width:${pos.w}mm;font-size:${size}pt">${esc(inhoud)}</div>`;
}

function overlayPagina(veldenHtml, pagina, kal, titel, metAchtergrond) {
  const pdf = metAchtergrond ? FORM_PDF.begeleidingsbrief : null;
  const bg = metAchtergrond && pdf
    ? `<object class="pdf-bg" data="${pdf}#page=1" type="application/pdf"></object>`
    : "";
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>${esc(titel)}</title>
<style>
@page { size: ${pagina.breedte}mm ${pagina.hoogte}mm; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${pagina.breedte}mm; height: ${pagina.hoogte}mm; }
body { position: relative; background: transparent; }
.pdf-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 0; }
.veld {
  position: absolute; z-index: 1;
  font-family: "Courier New", Courier, monospace;
  color: #000; white-space: pre-wrap; line-height: 1.12; overflow: hidden;
}
@media print {
  html, body { width: ${pagina.breedte}mm; height: ${pagina.hoogte}mm; }
  .veld { color: #000 !important; }
  .pdf-bg { display: ${metAchtergrond ? "block" : "none"}; }
}
</style>
</head>
<body>${bg}${veldenHtml}
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body>
</html>`;
}

function openOverlay(html) {
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) { alert("Pop-up geblokkeerd. Sta pop-ups toe voor deze app."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Officiële begeleidingsbrief veld-mapping (LMA vak 1–6) */
function begeleidingsbriefVelden(data, kal) {
  const p = data.partijen;
  const ontdoener = data.ontdoener?.naam ? data.ontdoener : p.afzender;
  const factuur = data.factuuradres?.naam ? data.factuuradres : p.afzender;
  const v = BEGELEIDINGSBRIEF_VELDEN;

  return [
    veldHtml(partijRegels(p.afzender)[0] || "", v.vak1_naam, kal),
    veldHtml(p.afzender.adres, v.vak1_straat, kal),
    veldHtml([p.afzender.postcode, p.afzender.plaats].filter(Boolean).join(" "), v.vak1_plaats, kal),
    veldHtml(p.afzender.vihb, v.vak1_vihb, kal),
    veldHtml(partijRegels(factuur, { vihb: false }), v.vak2, kal),
    veldHtml(partijRegels(ontdoener), v.vak3a, kal),
    veldHtml([data.locatieHerkomst, ontdoener.plaats].filter(Boolean).join("\n"), v.vak3b, kal),
    veldHtml(data.datum, v.vak3b_datum, kal),
    veldHtml(partijRegels(p.transporteur), v.vak4, kal),
    veldHtml(partijRegels(data.uitbesteedVervoerder || {}, { vihb: false }), v.vak4a, kal),
    veldHtml(partijRegels(p.ontvanger), v.vak5, kal),
    veldHtml(p.ontvanger.vihb, v.vak5_vihb, kal),
    veldHtml(data.kenteken, v.vak5_kenteken, kal),
    veldHtml(data.afvalstroomnummer, v.afvalstroom, kal),
    veldHtml(data.afvalstof, v.afvalstof, kal),
    veldHtml(data.verpakking, v.verpakking, kal),
    veldHtml(data.ewcCode, v.eural, kal),
    veldHtml(data.verwerkingsmethode, v.verwerking, kal),
    veldHtml(data.gewicht ? data.gewicht + " kg" : "", v.gewicht, kal),
    veldHtml(data.opmerkingen, v.opmerkingen, kal),
  ].join("");
}

function cmrVelden(data, kal) {
  const p = data.partijen;
  const v = CMR_VELDEN;
  const plaatsDatum = [data.plaatsOpstellen, data.datum].filter(Boolean).join(", ");
  return [
    veldHtml(partijRegels(p.afzender), v.vak1, kal),
    veldHtml(partijRegels(p.ontvanger), v.vak2, kal),
    veldHtml(p.ontvanger.plaats || data.plaatsOpstellen, v.vak3, kal),
    veldHtml(plaatsDatum, v.vak4, kal),
    veldHtml(data.bijlagen, v.vak5, kal),
    veldHtml(data.aantalColli, v.vak7, kal),
    veldHtml(data.verpakking, v.vak8, kal),
    veldHtml(data.afvalstof, v.vak9, kal),
    veldHtml(data.ewcCode, v.vak10, kal),
    veldHtml(data.gewicht ? data.gewicht + " kg" : "", v.vak11, kal),
    veldHtml(data.opmerkingen, v.vak13, kal),
    veldHtml(partijRegels(p.transporteur), v.vak16, kal),
    veldHtml(data.kenteken, v.kenteken, kal),
  ].join("");
}

function annex7Velden(data, kal) {
  const p = data.partijen;
  const v = ANNEX7_VELDEN;
  return [
    veldHtml(partijRegels(p.afzender), v.blok1, kal),
    veldHtml(partijRegels(p.ontvanger), v.blok2, kal),
    veldHtml(partijRegels(p.transporteur), v.blok3, kal),
    veldHtml(data.afvalstof, v.blok4, kal),
    veldHtml(data.gewicht ? data.gewicht + " kg" : "", v.quantity, kal),
    veldHtml(data.datum, v.date, kal),
    veldHtml(data.ewcCode, v.ewc, kal),
    veldHtml(data.baselCode, v.basel, kal),
    veldHtml(data.verpakking, v.packaging, kal),
    veldHtml(data.kenteken, v.transport, kal),
    veldHtml(data.opmerkingen, v.remarks, kal),
  ].join("");
}

export function printOverlayBegeleidingsbrief(data, kalibratie, opties = {}) {
  const kal = kalibratie || laadKalibratie("begeleidingsbrief");
  openOverlay(overlayPagina(
    begeleidingsbriefVelden(data, kal), PAGINA_BVA, kal,
    "Begeleidingsbrief", opties.metAchtergrond
  ));
}

export function printOverlayCMR(data, kalibratie) {
  const kal = kalibratie || laadKalibratie("cmr");
  openOverlay(overlayPagina(cmrVelden(data, kal), PAGINA_BVA, kal, "CMR", false));
}

export function printOverlayAnnex7(data, kalibratie) {
  const kal = kalibratie || laadKalibratie("annex7");
  openOverlay(overlayPagina(annex7Velden(data, kal), PAGINA_BVA, kal, "Annex VII", false));
}

export function printKalibratieTest(formType, kalibratie) {
  const kal = kalibratie || laadKalibratie(formType);
  const veldenMap = formType === "begeleidingsbrief" ? BEGELEIDINGSBRIEF_VELDEN
    : formType === "cmr" ? CMR_VELDEN : ANNEX7_VELDEN;
  const bonding = kal.bondingRand ? 10 : 0;
  const html = Object.entries(veldenMap).map(([naam, pos]) => {
    const x = pos.x + kal.offsetLinks;
    const y = pos.y + kal.offsetBoven + bonding;
    const size = pos.size || kal.fontSize;
    return `<div class="veld" style="left:${x}mm;top:${y}mm;width:${pos.w}mm;font-size:${size}pt;outline:0.2mm dashed #888">[${naam}]</div>`;
  }).join("");
  openOverlay(overlayPagina(html, PAGINA_BVA, kal, "Kalibratie", false));
}

function begeleidingsbriefVeldenA4(data, kal) {
  const p = data.partijen;
  const ontdoener = data.ontdoener?.naam ? data.ontdoener : p.afzender;
  const factuur = data.factuuradres?.naam ? data.factuuradres : p.afzender;
  const v = BEGELEIDINGSBRIEF_VELDEN_A4;
  return [
    veldHtml(partijRegels(p.afzender)[0] || "", v.vak1_naam, kal),
    veldHtml(p.afzender.adres, v.vak1_straat, kal),
    veldHtml([p.afzender.postcode, p.afzender.plaats].filter(Boolean).join(" "), v.vak1_plaats, kal),
    veldHtml(p.afzender.vihb, v.vak1_vihb, kal),
    veldHtml(partijRegels(factuur, { vihb: false }), v.vak2, kal),
    veldHtml(partijRegels(ontdoener), v.vak3a, kal),
    veldHtml([data.locatieHerkomst, ontdoener.plaats].filter(Boolean).join("\n"), v.vak3b, kal),
    veldHtml(data.datum, v.vak3b_datum, kal),
    veldHtml(partijRegels(p.transporteur), v.vak4, kal),
    veldHtml(partijRegels(data.uitbesteedVervoerder || {}, { vihb: false }), v.vak4a, kal),
    veldHtml(partijRegels(p.ontvanger), v.vak5, kal),
    veldHtml(p.ontvanger.vihb, v.vak5_vihb, kal),
    veldHtml(data.kenteken, v.vak5_kenteken, kal),
    veldHtml(data.afvalstroomnummer, v.afvalstroom, kal),
    veldHtml(data.afvalstof, v.afvalstof, kal),
    veldHtml(data.verpakking, v.verpakking, kal),
    veldHtml(data.ewcCode, v.eural, kal),
    veldHtml(data.verwerkingsmethode, v.verwerking, kal),
    veldHtml(data.gewicht ? data.gewicht + " kg" : "", v.gewicht, kal),
    veldHtml(data.opmerkingen, v.opmerkingen, kal),
  ].join("");
}

function cmrVeldenA4(data, kal) {
  const p = data.partijen;
  const v = CMR_VELDEN_A4;
  const plaatsDatum = [data.plaatsOpstellen, data.datum].filter(Boolean).join(", ");
  return [
    veldHtml(partijRegels(p.afzender), v.vak1, kal),
    veldHtml(partijRegels(p.ontvanger), v.vak2, kal),
    veldHtml(p.ontvanger.plaats || data.plaatsOpstellen, v.vak3, kal),
    veldHtml(plaatsDatum, v.vak4, kal),
    veldHtml(data.bijlagen, v.vak5, kal),
    veldHtml(data.aantalColli, v.vak7, kal),
    veldHtml(data.verpakking, v.vak8, kal),
    veldHtml(data.afvalstof, v.vak9, kal),
    veldHtml(data.ewcCode, v.vak10, kal),
    veldHtml(data.gewicht ? data.gewicht + " kg" : "", v.vak11, kal),
    veldHtml(data.opmerkingen, v.vak13, kal),
    veldHtml(partijRegels(p.transporteur), v.vak16, kal),
    veldHtml(data.kenteken, v.kenteken, kal),
  ].join("");
}

/** Bouw overlay-HTML voor schermvoorbeeld op A4-schaal */
export function bouwVoorbeeldVelden(formType, data, kalibratie) {
  const kal = { ...(kalibratie || laadKalibratie(formType)), bondingRand: false };
  if (formType === "begeleidingsbrief") return begeleidingsbriefVeldenA4(data, kal);
  if (formType === "cmr") return cmrVeldenA4(data, kal);
  return annex7Velden(data, kal);
}

export function getVoorbeeldPagina(formType) {
  if (formType === "begeleidingsbrief") return OFFICIEEL_A4;
  return OFFICIEEL_A4;
}

export function getVoorbeeldPdf(formType) {
  return FORM_PDF[formType] || null;
}

export function getVoorbeeldVeldenA4(formType) {
  if (formType === "begeleidingsbrief") return BEGELEIDINGSBRIEF_VELDEN_A4;
  if (formType === "cmr") return CMR_VELDEN_A4;
  return null;
}

import { partijNaarTekst } from "./formulierHelpers";

export function printBegeleidingsbrief(data) {
  printOverlayBegeleidingsbrief(data, null, { metAchtergrond: true });
}

export function printCMR(data) { printOverlayCMR(data); }
export function printAnnex7(data) { printOverlayAnnex7(data); }
