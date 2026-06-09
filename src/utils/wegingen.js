import { berekenOmzetWeging } from "./opbrengstDag";

export const WEGINGEN_LS_KEY = "newton-wegingen";
const WEGINGEN_RESET_KEY = "newton-wegingen-reset-v1";

function eenmaligeWegingenReset() {
  try {
    if (!localStorage.getItem(WEGINGEN_RESET_KEY)) {
      localStorage.removeItem(WEGINGEN_LS_KEY);
      localStorage.setItem(WEGINGEN_RESET_KEY, "1");
    }
  } catch {}
}

export function laadWegingenUitLS() {
  if (typeof window === "undefined") return [];
  eenmaligeWegingenReset();
  try {
    const raw = localStorage.getItem(WEGINGEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarWegingenInLS(wegingen) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WEGINGEN_LS_KEY, JSON.stringify(wegingen));
  } catch {}
}

export function berekenRapportPerMateriaal(wegingen, materialen, dagSnapshots = {}) {
  const totals = {};
  materialen.forEach(m => {
    totals[m.id] = {
      id: m.id,
      naam: m.naam,
      tag: m.tag,
      kleur: m.kleur,
      kgInkomend: 0,
      kgUitgaand: 0,
      omzetInkomend: 0,
      omzetUitgaand: 0,
      regelsInkomend: 0,
      regelsUitgaand: 0,
      kg: 0,
      omzet: 0,
      regels: 0,
    };
  });

  wegingen.forEach(w => {
    const matId = w.materiaal?.id;
    if (!matId || !totals[matId]) return;
    const kg = parseFloat(w.netto ?? w.gewicht) || 0;
    const omzet = berekenOmzetWeging(w, dagSnapshots);
    const uitgaand = w.richting === "uitgaand";

    if (uitgaand) {
      totals[matId].kgUitgaand += kg;
      totals[matId].omzetUitgaand += omzet;
      totals[matId].regelsUitgaand += 1;
    } else {
      totals[matId].kgInkomend += kg;
      totals[matId].omzetInkomend += omzet;
      totals[matId].regelsInkomend += 1;
    }
  });

  return materialen.map(m => {
    const t = totals[m.id];
    return {
      ...t,
      kg: t.kgInkomend - t.kgUitgaand,
      omzet: t.omzetInkomend - t.omzetUitgaand,
      regels: t.regelsInkomend + t.regelsUitgaand,
    };
  });
}
