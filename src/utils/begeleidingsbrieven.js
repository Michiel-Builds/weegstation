// =============================================
// BEGELEIDINGSBRIEVEN-register
// Wettelijk: begeleidingsbrieven 5 jaar bewaren en koppelen aan het ASN.
// Voor gevaarlijk afval: omschrijving aard/samenstelling (evt. ZZS) + vervoerder.
// =============================================

import { bewaarDuurzaam } from "./opslag";

export const BEGELEIDINGSBRIEVEN_LS_KEY = "ws-begeleidingsbrieven";

export function laadBegeleidingsbrieven() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BEGELEIDINGSBRIEVEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarBegeleidingsbrieven(lijst) {
  if (typeof window === "undefined") return;
  bewaarDuurzaam(BEGELEIDINGSBRIEVEN_LS_KEY, lijst);
}

export function maakLegeBegeleidingsbrief(brieven = []) {
  return {
    id: "bb-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    asn: "",
    datum: new Date().toISOString().slice(0, 10),
    kenteken: "",
    vervoerderNaam: "",
    vihb: "",
    omschrijving: "",
    aardSamenstelling: "",
    gevaarlijk: false,
    wegingId: null,
    bestandPad: "",
    aangemaakt: new Date().toISOString(),
  };
}

export function voegBegeleidingsbriefToe(brieven, brief) {
  const updated = [...brieven, brief];
  bewaarBegeleidingsbrieven(updated);
  return updated;
}

export function updateBegeleidingsbrief(brieven, id, wijzigingen) {
  const updated = brieven.map(b => (b.id === id ? { ...b, ...wijzigingen } : b));
  bewaarBegeleidingsbrieven(updated);
  return updated;
}

export function verwijderBegeleidingsbrief(brieven, id) {
  const updated = brieven.filter(b => b.id !== id);
  bewaarBegeleidingsbrieven(updated);
  return updated;
}

export function brievenVoorAsn(brieven, asn) {
  return brieven.filter(b => b.asn === asn);
}
