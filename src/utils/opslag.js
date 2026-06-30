// =============================================
// DUURZAME OPSLAG (renderer-zijde)
// In Electron worden wettelijk te bewaren gegevens (wegingen, afvalstromen,
// LMA-meldingen, begeleidingsbrieven) gespiegeld naar bestanden in userData,
// met automatische .bak back-up. localStorage blijft de snelle leescache zodat
// de bestaande synchrone code blijft werken.
// =============================================

// Sleutels die duurzaam (op schijf) bewaard moeten blijven (5-jaars bewaarplicht).
export const DUURZAME_SLEUTELS = [
  "ws-wegingen",
  "ws-afvalstromen",
  "ws-lma-meldingen",
  "ws-begeleidingsbrieven",
  "ws-bon-omzet",
];

function heeftElectronData() {
  return typeof window !== "undefined" && !!window.electronAPI?.dataBewaar;
}

// Laad alle duurzame sleutels van schijf naar localStorage (1x bij opstarten).
export async function hydrateerDuurzameOpslag() {
  if (typeof window === "undefined") return;
  if (!window.electronAPI?.dataLaadAlles) return;
  try {
    const opSchijf = await window.electronAPI.dataLaadAlles(DUURZAME_SLEUTELS);
    for (const key of DUURZAME_SLEUTELS) {
      const waarde = opSchijf?.[key];
      if (waarde !== undefined && waarde !== null) {
        try { localStorage.setItem(key, JSON.stringify(waarde)); } catch {}
      }
    }
  } catch (e) {
    console.error("Hydrateren duurzame opslag mislukt:", e);
  }
}

// Schrijf een sleutel naar localStorage EN (in Electron) naar schijf.
export function bewaarDuurzaam(key, value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  if (heeftElectronData()) {
    // fire-and-forget; fouten worden in main gelogd
    Promise.resolve(window.electronAPI.dataBewaar(key, value)).catch(() => {});
  }
}

// Lees een sleutel uit localStorage (cache). Geeft fallback bij ontbreken/fout.
export function laadDuurzaam(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

// Exporteer een back-up van alle duurzame data naar een door de gebruiker
// gekozen bestand (alleen in Electron).
export async function exporteerBackup() {
  if (!window.electronAPI?.dataExporteer) {
    return { ok: false, fout: "Alleen beschikbaar in de desktop-app" };
  }
  return window.electronAPI.dataExporteer({ keys: DUURZAME_SLEUTELS });
}
