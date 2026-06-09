// Officiële formulier-posities (mm), afgeleid van:
// - Begeleidingsbrief: LMA/Beurtvaartadres voorbeeld-PDF (A4 210×297 mm)
// - CMR: standaard internationaal CMR-vrachtbrief raster (A4 210×297 mm)
//
// Beurtvaartadres matrix kettingformulier = 240 mm breed → horizontaal geschaald.
// Hoogte 12" = 304,8 mm (iets hoger dan A4; Y-offset via kalibratie).

export const OFFICIEEL_A4 = { breedte: 210, hoogte: 297 };
export const BVA_MATRIX = { breedte: 240, hoogte: 304.8 };
export const BVA_SCHAAL_X = BVA_MATRIX.breedte / OFFICIEEL_A4.breedte; // 1.142857

/** Schaal positie van officieel A4 naar Beurtvaartadres 240 mm */
export function schaalPositie(pos, schaalX = BVA_SCHAAL_X) {
  return { ...pos, x: +(pos.x * schaalX).toFixed(2), w: +(pos.w * schaalX).toFixed(2) };
}

export function schaalVelden(velden, schaalX = BVA_SCHAAL_X) {
  const out = {};
  for (const [k, v] of Object.entries(velden)) out[k] = schaalPositie(v, schaalX);
  return out;
}

// ── Begeleidingsbrief (officieel LMA/Beurtvaartadres v2.3) ──────────────────
// Labels uit PDF: vak 1 t/m 6, afvalstroomnummer, eural, kenteken, VIHB, enz.
const BEGELEIDINGSBRIEF_A4 = {
  // Vak 1 — afzender
  vak1_naam:    { x: 50,  y: 49.5, w: 55, lines: 1, size: 9 },
  vak1_straat:  { x: 62,  y: 53.5, w: 45, lines: 1, size: 9 },
  vak1_plaats:  { x: 68,  y: 57.5, w: 42, lines: 1, size: 9 },
  vak1_vihb:    { x: 58,  y: 61.5, w: 45, lines: 1, size: 9 },
  // Vak 2 — factuuradres
  vak2:         { x: 50,  y: 68.5, w: 55, lines: 3, size: 9 },
  // Vak 3a — ontdoener (links)
  vak3a:        { x: 50,  y: 83.5, w: 55, lines: 3, size: 9 },
  // Vak 3b — locatie herkomst (rechts)
  vak3b:        { x: 130, y: 83.5, w: 75, lines: 3, size: 9 },
  vak3b_datum:  { x: 158, y: 95.5, w: 45, lines: 1, size: 9 },
  // Vak 4 — inzamelaar/vervoerder (links)
  vak4:         { x: 50,  y: 102.5, w: 55, lines: 4, size: 9 },
  // Vak 4a — locatie bestemming (rechts)
  vak4a:        { x: 130, y: 102.5, w: 75, lines: 3, size: 9 },
  // Vak 5 — ontvanger / verwerkingsinstallatie
  vak5:         { x: 50,  y: 124.5, w: 55, lines: 4, size: 9 },
  vak5_vihb:    { x: 125, y: 124.5, w: 50, lines: 1, size: 9 },
  vak5_kenteken:{ x: 125, y: 132.5, w: 50, lines: 1, size: 9 },
  // Vak 6 — afvalstofgegevens (rij onder vak 5)
  afvalstroom:  { x: 55,  y: 145, w: 38, lines: 1, size: 9 },
  afvalstof:    { x: 95,  y: 145, w: 70, lines: 1, size: 9 },
  verpakking:   { x: 55,  y: 149, w: 28, lines: 1, size: 9 },
  eural:        { x: 148, y: 145, w: 28, lines: 1, size: 9 },
  verwerking:   { x: 175, y: 145, w: 12, lines: 1, size: 9 },
  gewicht:      { x: 170, y: 149, w: 35, lines: 1, size: 9 },
  opmerkingen:  { x: 25,  y: 153, w: 180, lines: 2, size: 8 },
};

export const BEGELEIDINGSBRIEF_VELDEN = schaalVelden(BEGELEIDINGSBRIEF_A4);
export const BEGELEIDINGSBRIEF_VELDEN_A4 = BEGELEIDINGSBRIEF_A4;

// ── CMR (standaard 24-vakken layout, eerste/rode exemplaar) ─────────────────
const CMR_A4 = {
  vak1:   { x: 10,  y: 38,  w: 95,  lines: 5, size: 8 },
  vak2:   { x: 108, y: 38,  w: 95,  lines: 5, size: 8 },
  vak3:   { x: 10,  y: 76,  w: 95,  lines: 2, size: 8 },
  vak4:   { x: 108, y: 76,  w: 95,  lines: 2, size: 8 },
  vak5:   { x: 10,  y: 90,  w: 95,  lines: 2, size: 8 },
  vak6:   { x: 108, y: 90,  w: 95,  lines: 1, size: 8 },
  vak7:   { x: 10,  y: 104, w: 44,  lines: 1, size: 8 },
  vak8:   { x: 56,  y: 104, w: 49,  lines: 1, size: 8 },
  vak9:   { x: 108, y: 104, w: 95,  lines: 2, size: 8 },
  vak10:  { x: 10,  y: 118, w: 44,  lines: 1, size: 8 },
  vak11:  { x: 56,  y: 118, w: 49,  lines: 1, size: 8 },
  vak12:  { x: 108, y: 118, w: 44,  lines: 1, size: 8 },
  vak13:  { x: 154, y: 118, w: 49,  lines: 2, size: 8 },
  vak16:  { x: 10,  y: 148, w: 193, lines: 4, size: 8 },
  vak17:  { x: 10,  y: 176, w: 95,  lines: 2, size: 8 },
  vak18:  { x: 108, y: 176, w: 95,  lines: 2, size: 8 },
  kenteken: { x: 10, y: 192, w: 55, lines: 1, size: 8 },
};

export const CMR_VELDEN = schaalVelden(CMR_A4);
export const CMR_VELDEN_A4 = CMR_A4;

// Annex VII — EU standaard (A4)
const ANNEX7_A4 = {
  blok1:    { x: 10,  y: 32,  w: 190, lines: 5, size: 8 },
  blok2:    { x: 10,  y: 78,  w: 190, lines: 5, size: 8 },
  blok3:    { x: 10,  y: 124, w: 190, lines: 4, size: 8 },
  blok4:    { x: 10,  y: 158, w: 190, lines: 2, size: 8 },
  quantity: { x: 10,  y: 172, w: 45,  lines: 1, size: 8 },
  date:     { x: 60,  y: 172, w: 45,  lines: 1, size: 8 },
  ewc:      { x: 10,  y: 186, w: 190, lines: 2, size: 8 },
  basel:    { x: 10,  y: 200, w: 80,  lines: 1, size: 8 },
  packaging:{ x: 95,  y: 200, w: 55,  lines: 1, size: 8 },
  transport:{ x: 155, y: 200, w: 45,  lines: 1, size: 8 },
  remarks:  { x: 10,  y: 214, w: 190, lines: 2, size: 8 },
};

export const ANNEX7_VELDEN = schaalVelden(ANNEX7_A4);

export const FORM_PDF = {
  begeleidingsbrief: "/forms/begeleidingsbrief-officieel.pdf",
  // CMR: standaard layout-posities; achtergrond-PDF volgt in volgende update
  cmr: null,
};

export const PAGINA_BVA = BVA_MATRIX;
