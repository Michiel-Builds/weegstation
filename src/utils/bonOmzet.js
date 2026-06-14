import { MATERIALEN } from "../data/stamdata";

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

function klantNaamVanBon(klant, klantType) {  if (klantType === "bedrijf") return (klant?.bedrijf || "").trim();
  return (klant?.naam || "").trim();
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
  try {
    localStorage.setItem(BON_OMZET_LS_KEY, JSON.stringify(regels));
    window.dispatchEvent(new CustomEvent("ws-bon-omzet-update"));
  } catch {}
}

export function registreerBonOmzet({ bonnummer, totaalEuro, totaalKg, klant, klantType, regels = [] }) {
  const nu = new Date();
  const entry = {
    id: bonnummer,
    bonnummer,
    totaalEuro: Math.round(parseFloat(totaalEuro) * 100) / 100,
    totaalKg: parseFloat(totaalKg) || 0,
    klantNaam: klantNaamVanBon(klant, klantType),
    klantType,
    regels: regels.map(r => ({
      materiaal: r.materiaal,
      kg: parseFloat(r.kg ?? r.totaal) || 0,
      subtotaal: Math.round((parseFloat(r.subtotaal) || 0) * 100) / 100,
      prijs: parseFloat(r.prijs) || 0,
    })),
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
      totals[mat.id].kg += r.kg || 0;
      totals[mat.id].omzet += r.subtotaal || 0;
      totals[mat.id].regels += 1;
    });
  });

  return MATERIALEN.map(m => totals[m.id]);
}
