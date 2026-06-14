import {
  DEFAULT_ACCENT, DEFAULT_ACCENT2,
  DEFAULT_ACCENT_LIGHT, DEFAULT_ACCENT2_LIGHT,
} from "../data/product";

export const CONFIG_LS_KEY = "ws-bedrijf-config";

export const DEFAULT_BEDRIJF_CONFIG = {
  bedrijfsnaam: "",
  thema: "dark",
  accent: DEFAULT_ACCENT,
  accent2: DEFAULT_ACCENT2,
};

export async function laadBedrijfConfig() {
  if (typeof window !== "undefined" && window.electronAPI?.laadBedrijfConfig) {
    const cfg = await window.electronAPI.laadBedrijfConfig();
    return cfg ? normaliseer(cfg) : null;
  }
  try {
    const raw = localStorage.getItem(CONFIG_LS_KEY);
    return raw ? normaliseer(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function bewaarBedrijfConfig(config) {
  const cfg = normaliseer(config);
  if (typeof window !== "undefined" && window.electronAPI?.bewaarBedrijfConfig) {
    return window.electronAPI.bewaarBedrijfConfig(cfg);
  }
  try {
    localStorage.setItem(CONFIG_LS_KEY, JSON.stringify(cfg));
  } catch {}
  return cfg;
}

export async function heeftBedrijfConfig() {
  const cfg = await laadBedrijfConfig();
  return !!(cfg && cfg.bedrijfsnaam && cfg.bedrijfsnaam.trim());
}

function normaliseer(cfg) {
  const thema = cfg.thema === "light" ? "light" : "dark";
  const defaults = thema === "light"
    ? { accent: DEFAULT_ACCENT_LIGHT, accent2: DEFAULT_ACCENT2_LIGHT }
    : { accent: DEFAULT_ACCENT, accent2: DEFAULT_ACCENT2 };
  return {
    bedrijfsnaam: String(cfg.bedrijfsnaam || "").trim(),
    thema,
    accent: cfg.accent || defaults.accent,
    accent2: cfg.accent2 || defaults.accent2,
  };
}
