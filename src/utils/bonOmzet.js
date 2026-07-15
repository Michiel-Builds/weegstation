import { MATERIALEN } from "../data/stamdata";

import { bewaarDuurzaam } from "./opslag";

export const BON_OMZET_LS_KEY = "ws-bon-omzet";

function vindMateriaalOpNaam(naam) {
  if (!naam?.trim()) return null;
  const q = naam.trim().toLowerCase();
  const exact = MATERIALEN.find(m => m.naam.toLowerCase() === q);
  if (exact) return exact;
  const starts = MATERIALEN.filter(m => m.naam.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];
  return null;
}

function klantNaamVanBon(klant, klantType) {
  if (klantType === "bedrijf") return (klant?.bedrijf || "").trim();
  return (klant?.naam || "").trim();
}

function normaliseerRegel(r) {
  const volKg = parseFloat(r.volKg ?? r.vol) || 0;
  const leegKg = parseFloat(r.leegKg ?? r.leeg) || 0;
  const aftrekKg = parseFloat(r.aftrekKg ?? r.aftrek) || 0;
  const nettoKg = parseFloat(r.nettoKg ?? r.kg ?? r.totaal) || Math.max(0, volKg - leegKg - aftrekKg);
  return {
    materiaal: r.materiaal || "",
    volKg,
    leegKg,
    aftrekKg,
    nettoKg,
    kg: nettoKg,
    prijs: parseFloat(r.prijs) || 0,
    subtotaal: Math.round((parseFloat(r.subtotaal) || 0) * 100) / 100,
  };
}

export function laadBonOmzet() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BON_OMZET_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarBonOmzet(regels) {
  if (typeof window === "undefined") return;
  bewaarDuurzaam(BON_OMZET_LS_KEY, regels);
  try {
    window.dispatchEvent(new CustomEvent("ws-bon-omzet-update"));
  } catch {}
}

export function registreerBonOmzet({ bonnummer, totaalEuro, totaalKg, klant, klantType, klantId = null, regels = [] }) {
  const nu = new Date();
  const normRegels = regels.map(normaliseerRegel);
  const totaalAftrekKg = normRegels.reduce((s, r) => s + r.aftrekKg, 0);
  const totaalNettoKg = normRegels.reduce((s, r) => s + r.nettoKg, 0);
  const entry = {
    id: bonnummer,
    bonnummer,
    totaalEuro: Math.round(parseFloat(totaalEuro) * 100) / 100,
    totaalKg: parseFloat(totaalKg) || totaalNettoKg,
    totaalAftrekKg: Math.round(totaalAftrekKg * 100) / 100,
    totaalNettoKg: Math.round(totaalNettoKg * 100) / 100,
    klantId: klantId ?? null,
    klantNaam: klantNaamVanBon(klant, klantType),
    klantType,
    regels: normRegels,
    datum: nu.toLocaleDateString("nl-NL"),
    tijd: nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
    opgeslagenOp: nu.toISOString(),
  };

  const bestaand = laadBonOmzet();
  const idx = bestaand.findIndex(b => b.bonnummer === bonnummer);
  const updated = idx >= 0
    ? bestaand.map((b, i) => (i === idx ? entry : b))
    : [entry, ...bestaand];

  bewaarBonOmzet(updated.slice(0, 500));
  return entry;
}

export function berekenTotaleOmzet(regels) {
  return regels.reduce((s, b) => s + (parseFloat(b.totaalEuro) || 0), 0);
}

export function berekenOmzetVandaag(regels) {
  const vandaag = new Date().toLocaleDateString("nl-NL");
  return regels
    .filter(b => b.datum === vandaag)
    .reduce((s, b) => s + (parseFloat(b.totaalEuro) || 0), 0);
}

export function berekenTotaalAftrek(bonnen) {
  return bonnen.reduce((s, b) => s + (parseFloat(b.totaalAftrekKg) || 0), 0);
}

export function berekenAftrekPerKlant(bonnen) {
  const perKlant = {};
  bonnen.forEach(bon => {
    const key = bon.klantId != null ? String(bon.klantId) : (bon.klantNaam || "onbekend");
    if (!perKlant[key]) {
      perKlant[key] = {
        klantId: bon.klantId ?? null,
        klantNaam: bon.klantNaam || "Onbekend",
        klantType: bon.klantType,
        aftrekKg: 0,
        nettoKg: 0,
        omzet: 0,
        bonnen: 0,
      };
    }
    perKlant[key].aftrekKg += parseFloat(bon.totaalAftrekKg) || 0;
    perKlant[key].nettoKg += parseFloat(bon.totaalNettoKg ?? bon.totaalKg) || 0;
    perKlant[key].omzet += parseFloat(bon.totaalEuro) || 0;
    perKlant[key].bonnen += 1;
  });
  return Object.values(perKlant).sort((a, b) => b.omzet - a.omzet);
}

export function filterBonOmzetPeriode(bonnen, periode) {
  const nu = new Date();
  const vandaag = nu.toLocaleDateString("nl-NL");
  const maand = nu.getMonth();
  const jaar = nu.getFullYear();

  return bonnen.filter(b => {
    if (periode === "alles") return true;
    if (periode === "vandaag") return b.datum === vandaag;
    const parts = (b.datum || "").split("-").map(Number);
    if (parts.length !== 3) return false;
    const [dd, mm, yyyy] = parts;
    const d = new Date(yyyy, mm - 1, dd);
    if (periode === "maand") return d.getMonth() === maand && d.getFullYear() === jaar;
    if (periode === "jaar") return d.getFullYear() === jaar;
    return true;
  });
}

export function berekenRapportPerMateriaal(bonnen) {
  const totals = {};
  MATERIALEN.forEach(m => {
    totals[m.id] = {
      id: m.id,
      naam: m.naam,
      tag: m.tag,
      kleur: m.kleur,
      kg: 0,
      omzet: 0,
      regels: 0,
    };
  });

  bonnen.forEach(bon => {
    (bon.regels || []).forEach(r => {
      const mat = vindMateriaalOpNaam(r.materiaal);
      if (!mat || !totals[mat.id]) return;
      totals[mat.id].kg += r.nettoKg ?? r.kg ?? 0;
      totals[mat.id].omzet += r.subtotaal || 0;
      totals[mat.id].regels += 1;
    });
  });

  return MATERIALEN.map(m => totals[m.id]);
}

export function berekenKlantRapport(bonnen, { periode = "alles", alleenZakelijk = true } = {}) {
  let gefilterd = filterBonOmzetPeriode(bonnen, periode);
  if (alleenZakelijk) {
    gefilterd = gefilterd.filter(b => b.klantType === "bedrijf");
  }

  const perKlant = {};
  gefilterd.forEach(bon => {
    const key = bon.klantId != null ? String(bon.klantId) : (bon.klantNaam || "onbekend");
    if (!perKlant[key]) {
      perKlant[key] = {
        klantId: bon.klantId ?? null,
        klantNaam: bon.klantNaam || "Onbekend",
        omzet: 0,
        aftrekKg: 0,
        nettoKg: 0,
        bonnen: 0,
        materialen: {},
      };
    }
    const k = perKlant[key];
    k.omzet += parseFloat(bon.totaalEuro) || 0;
    k.aftrekKg += parseFloat(bon.totaalAftrekKg) || 0;
    k.nettoKg += parseFloat(bon.totaalNettoKg ?? bon.totaalKg) || 0;
    k.bonnen += 1;
    (bon.regels || []).forEach(r => {
      const naam = r.materiaal || "Onbekend";
      if (!k.materialen[naam]) k.materialen[naam] = { naam, nettoKg: 0, aftrekKg: 0 };
      k.materialen[naam].nettoKg += r.nettoKg ?? r.kg ?? 0;
      k.materialen[naam].aftrekKg += r.aftrekKg ?? 0;
    });
  });

  return Object.values(perKlant)
    .map(k => ({
      ...k,
      materialen: Object.values(k.materialen).sort((a, b) => b.nettoKg - a.nettoKg),
    }))
    .sort((a, b) => b.omzet - a.omzet);
}
