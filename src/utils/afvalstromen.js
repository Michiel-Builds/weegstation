// =============================================
// AFVALSTROMEN / ASN-register (LMA)
// Opslag in localStorage (sleutel: ws-afvalstromen)
// Een afvalstroomnummer (ASN) bestaat uit 12 tekens:
//   - eerste 5 tekens = verwerkersnummer (uit bedrijfConfig.lma)
//   - laatste 7 tekens = vrij te kiezen (cijfers + hoofdletters)
// =============================================

import { isGevaarlijkeEural } from "../data/stamdata";
import { bewaarDuurzaam } from "./opslag";

export const AFVALSTROMEN_LS_KEY = "ws-afvalstromen";

const ASN_VRIJ_LENGTE = 7;
const ASN_TOEGESTAAN = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function laadAfvalstromen() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AFVALSTROMEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarAfvalstromen(stromen) {
  if (typeof window === "undefined") return;
  bewaarDuurzaam(AFVALSTROMEN_LS_KEY, stromen);
}

function nieuwId(stromen) {
  return "asn-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// Genereer een uniek vrij deel (7 tekens) en plak het achter het verwerkersnummer.
export function genereerAsn(verwerkersnummer, bestaande = []) {
  const prefix = String(verwerkersnummer || "").trim().toUpperCase();
  const inGebruik = new Set(bestaande.map(s => (s.asn || "").toUpperCase()));
  for (let poging = 0; poging < 1000; poging++) {
    let vrij = "";
    for (let i = 0; i < ASN_VRIJ_LENGTE; i++) {
      vrij += ASN_TOEGESTAAN[Math.floor(Math.random() * ASN_TOEGESTAAN.length)];
    }
    const asn = prefix + vrij;
    if (!inGebruik.has(asn)) return asn;
  }
  return prefix + Date.now().toString(36).toUpperCase().slice(-ASN_VRIJ_LENGTE);
}

export function maakLegeAfvalstroom(verwerkersnummer, stromen = []) {
  return {
    id: nieuwId(stromen),
    asn: verwerkersnummer ? genereerAsn(verwerkersnummer, stromen) : "",
    actief: true,
    klantId: null,
    ontdoenerNaam: "",
    ontdoenerKvK: "",
    ontdoenerBedrijfsnummer: "",
    locatieHerkomst: "",
    euralCode: "",
    gebruikelijkeBenaming: "",
    gevaarlijk: false,
    verwerkingsmethode: "",
    materiaalId: null,
    inzamelaarNaam: "",
    inzamelaarKvK: "",
    inzamelaarBedrijfsnummer: "",
    aangemaakt: new Date().toISOString(),
  };
}

// Houd de gevaarlijk-vlag in sync met de EURAL-code (sterretje = gevaarlijk).
function normaliseerStroom(stroom) {
  return {
    ...stroom,
    gevaarlijk: stroom.gevaarlijk || isGevaarlijkeEural(stroom.euralCode),
  };
}

export function voegAfvalstroomToe(stromen, stroom) {
  const updated = [...stromen, normaliseerStroom(stroom)];
  bewaarAfvalstromen(updated);
  return updated;
}

export function updateAfvalstroom(stromen, id, wijzigingen) {
  const updated = stromen.map(s =>
    s.id === id ? normaliseerStroom({ ...s, ...wijzigingen }) : s
  );
  bewaarAfvalstromen(updated);
  return updated;
}

export function verwijderAfvalstroom(stromen, id) {
  const updated = stromen.filter(s => s.id !== id);
  bewaarAfvalstromen(updated);
  return updated;
}

// Auto-match bij het wegen: zoek een actieve stroom voor deze klant + materiaal.
export function vindAfvalstroom(stromen, klantId, materiaalId) {
  if (!klantId) return null;
  const actief = stromen.filter(s => s.actief && s.klantId === klantId);
  if (actief.length === 0) return null;
  const opMateriaal = actief.find(s => String(s.materiaalId) === String(materiaalId));
  return opMateriaal || actief[0];
}

export function vindAfvalstroomById(stromen, id) {
  return stromen.find(s => s.id === id) || null;
}

// Geldigheidscontrole van een ASN-formaat (nog niet de AMICE-toets-service).
export function valideerAsnFormaat(asn, verwerkersnummer) {
  const a = String(asn || "").trim().toUpperCase();
  if (a.length !== 12) return { ok: false, fout: "ASN moet 12 tekens zijn" };
  if (!/^[0-9A-Z]+$/.test(a)) return { ok: false, fout: "Alleen cijfers en letters toegestaan" };
  const vn = String(verwerkersnummer || "").trim().toUpperCase();
  if (vn && !a.startsWith(vn)) {
    return { ok: false, fout: "Eerste 5 tekens moeten het verwerkersnummer zijn" };
  }
  return { ok: true, fout: null };
}
