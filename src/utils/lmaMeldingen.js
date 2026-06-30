// =============================================
// LMA-MELDINGEN: maand-aggregatie + meldingen-administratie
// Aggregeert alleen MELDPLICHTIGE inkomende wegingen per maand per ASN.
// Particuliere / vrijgestelde wegingen worden expliciet uitgesloten.
// =============================================

import { bewaarDuurzaam } from "./opslag";

export const MELDINGEN_LS_KEY = "ws-lma-meldingen";

export const MELDING_TYPE = {
  EERSTE: "eerste_ontvangst",
  MAANDELIJKS: "maandelijkse_ontvangst",
  NUL: "nulmelding",
  AFGIFTE: "afgifte",
};

export const MELDING_TYPE_LABEL = {
  [MELDING_TYPE.EERSTE]: "Eerste ontvangstmelding",
  [MELDING_TYPE.MAANDELIJKS]: "Maandelijkse ontvangstmelding",
  [MELDING_TYPE.NUL]: "Nulmelding",
  [MELDING_TYPE.AFGIFTE]: "Afgiftemelding",
};

export const MELDING_STATUS = {
  CONCEPT: "concept",
  GEEXPORTEERD: "geexporteerd",
  VERZONDEN: "verzonden",
  GEMELD: "gemeld",
  AFGEKEURD: "afgekeurd",
};

export const MELDING_STATUS_LABEL = {
  [MELDING_STATUS.CONCEPT]: "Concept",
  [MELDING_STATUS.GEEXPORTEERD]: "Geexporteerd (XML)",
  [MELDING_STATUS.VERZONDEN]: "Verzonden",
  [MELDING_STATUS.GEMELD]: "Gemeld (geaccepteerd)",
  [MELDING_STATUS.AFGEKEURD]: "Afgekeurd",
};

export const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function maandLabel(jaar, maand) {
  return `${MAANDEN[maand - 1] || "?"} ${jaar}`;
}

// Bepaal jaar/maand (1-12) van een weging. Voorkeur: numerieke id (ms-timestamp);
// fallback: datum-string "d-m-jjjj" (nl-NL).
export function wegingPeriode(weging) {
  if (typeof weging.id === "number" && weging.id > 1e12) {
    const d = new Date(weging.id);
    return { jaar: d.getFullYear(), maand: d.getMonth() + 1 };
  }
  if (typeof weging.datum === "string" && weging.datum.includes("-")) {
    const delen = weging.datum.split("-").map(n => parseInt(n, 10));
    if (delen.length === 3) {
      // nl-NL toLocaleDateString → d-m-jjjj
      return { jaar: delen[2], maand: delen[1] };
    }
  }
  const d = new Date();
  return { jaar: d.getFullYear(), maand: d.getMonth() + 1 };
}

function inMaand(weging, jaar, maand) {
  const p = wegingPeriode(weging);
  return p.jaar === jaar && p.maand === maand;
}

function isMeldplichtigeOntvangst(w) {
  const inkomend = (w.richting || "inkomend") !== "uitgaand";
  return inkomend && !!w.lma?.meldplichtig && !!w.lma?.afvalstroomnummer;
}

// Aggregeer meldplichtige inkomende wegingen per ASN voor een maand.
export function aggregeerOntvangstPerAsn(wegingen, jaar, maand) {
  const perAsn = new Map();
  wegingen.forEach(w => {
    if (!inMaand(w, jaar, maand)) return;
    if (!isMeldplichtigeOntvangst(w)) return;
    const asn = w.lma.afvalstroomnummer;
    const kg = parseFloat(w.netto ?? w.gewicht) || 0;
    if (!perAsn.has(asn)) {
      perAsn.set(asn, {
        asn,
        afvalstroomId: w.lma.afvalstroomId || null,
        euralCode: w.lma.euralCode || "",
        gevaarlijk: !!w.lma.gevaarlijk,
        verwerkingsmethode: w.lma.verwerkingsmethode || "",
        klantId: w.klantId ?? null,
        klantNaam: w.klantNaam || "",
        kg: 0,
        aantalVrachten: 0,
        wegingIds: [],
      });
    }
    const rij = perAsn.get(asn);
    rij.kg += kg;
    rij.aantalVrachten += 1;
    rij.wegingIds.push(w.id);
  });
  return Array.from(perAsn.values()).map(r => ({ ...r, kg: Math.round(r.kg) }));
}

// Tel uitgesloten (particuliere/vrijgestelde) inkomende vrachten voor transparantie.
export function telUitgesloten(wegingen, jaar, maand) {
  let vrachten = 0, kg = 0;
  wegingen.forEach(w => {
    if (!inMaand(w, jaar, maand)) return;
    const inkomend = (w.richting || "inkomend") !== "uitgaand";
    if (!inkomend) return;
    if (isMeldplichtigeOntvangst(w)) return;
    vrachten += 1;
    kg += parseFloat(w.netto ?? w.gewicht) || 0;
  });
  return { vrachten, kg: Math.round(kg) };
}

// --- Meldingen-administratie (status per ASN/maand/type) ---

export function laadMeldingen() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MELDINGEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarMeldingen(meldingen) {
  if (typeof window === "undefined") return;
  bewaarDuurzaam(MELDINGEN_LS_KEY, meldingen);
}

export function meldingSleutel(jaar, maand, asn, type) {
  return `${jaar}-${String(maand).padStart(2, "0")}-${asn}-${type}`;
}

export function vindMelding(meldingen, jaar, maand, asn) {
  return meldingen.find(m => m.jaar === jaar && m.maand === maand && m.asn === asn) || null;
}

// Eerste ontvangstmelding als er nog NOOIT een geaccepteerde ontvangstmelding
// voor dit ASN is gedaan; anders maandelijks. Bij 0 kg een nulmelding.
export function bepaalOntvangstType(meldingen, asn, kg) {
  if (kg <= 0) return MELDING_TYPE.NUL;
  const eerderGemeld = meldingen.some(m =>
    m.asn === asn &&
    (m.type === MELDING_TYPE.EERSTE || m.type === MELDING_TYPE.MAANDELIJKS) &&
    (m.status === MELDING_STATUS.GEMELD || m.status === MELDING_STATUS.VERZONDEN)
  );
  return eerderGemeld ? MELDING_TYPE.MAANDELIJKS : MELDING_TYPE.EERSTE;
}

export function upsertMelding(meldingen, melding) {
  const idx = meldingen.findIndex(m =>
    m.jaar === melding.jaar && m.maand === melding.maand &&
    m.asn === melding.asn && m.type === melding.type
  );
  let updated;
  if (idx >= 0) {
    updated = meldingen.map((m, i) => (i === idx ? { ...m, ...melding } : m));
  } else {
    updated = [...meldingen, melding];
  }
  bewaarMeldingen(updated);
  return updated;
}

export function setMeldingStatus(meldingen, id, status, extra = {}) {
  const updated = meldingen.map(m =>
    m.id === id ? { ...m, status, bijgewerkt: new Date().toISOString(), ...extra } : m
  );
  bewaarMeldingen(updated);
  return updated;
}

// Combineer aggregatie + bestaande meldingsstatus tot een overzicht voor de UI.
export function bouwMaandoverzicht(wegingen, meldingen, jaar, maand) {
  const aggr = aggregeerOntvangstPerAsn(wegingen, jaar, maand);
  const regels = aggr.map(rij => {
    const bestaand = meldingen.find(m =>
      m.jaar === jaar && m.maand === maand && m.asn === rij.asn &&
      m.type !== MELDING_TYPE.AFGIFTE
    );
    const type = bestaand?.type || bepaalOntvangstType(meldingen, rij.asn, rij.kg);
    return {
      ...rij,
      type,
      status: bestaand?.status || MELDING_STATUS.CONCEPT,
      meldingId: bestaand?.id || meldingSleutel(jaar, maand, rij.asn, type),
      retour: bestaand?.retour || null,
    };
  });
  return {
    jaar, maand,
    regels,
    uitgesloten: telUitgesloten(wegingen, jaar, maand),
    totaalKg: regels.reduce((s, r) => s + r.kg, 0),
    totaalVrachten: regels.reduce((s, r) => s + r.aantalVrachten, 0),
  };
}

// Valideer of een regel volledig genoeg is om te melden.
export function valideerMeldingRegel(regel, bedrijfLma) {
  const fouten = [];
  if (!bedrijfLma?.verwerkersnummer) fouten.push("Verwerkersnummer ontbreekt (Instellingen)");
  if (!regel.asn || regel.asn.length !== 12) fouten.push("Ongeldig afvalstroomnummer");
  if (!regel.euralCode) fouten.push("EURAL-code ontbreekt");
  if (!regel.verwerkingsmethode) fouten.push("Verwerkingsmethode ontbreekt");
  return fouten;
}
