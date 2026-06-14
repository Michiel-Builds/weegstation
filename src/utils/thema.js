import { DEFAULT_ACCENT, DEFAULT_ACCENT2, DEFAULT_ACCENT_LIGHT, DEFAULT_ACCENT2_LIGHT } from "../data/product";

const LICHT = {
  "--bg": "#f0f2f5",
  "--surface": "#ffffff",
  "--surface2": "#f4f6f8",
  "--border": "#dde2e8",
  "--text": "#1a2430",
  "--muted": "#6b7c8a",
  "--green": "#2e7d52",
  "--red": "#c62828",
};

const DONKER = {
  "--bg": "#0f1011",
  "--surface": "#181a1b",
  "--surface2": "#212426",
  "--border": "#2e3133",
  "--text": "#e8e4de",
  "--muted": "#7a7570",
  "--green": "#4caf7d",
  "--red": "#e05252",
};

export function pasThemaToe(cfg) {
  if (typeof document === "undefined" || !cfg) return;
  const root = document.documentElement;
  const licht = cfg.thema === "light";
  root.setAttribute("data-theme", licht ? "light" : "dark");
  const basis = licht ? LICHT : DONKER;
  Object.entries(basis).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty("--accent", cfg.accent || (licht ? DEFAULT_ACCENT_LIGHT : DEFAULT_ACCENT));
  root.style.setProperty("--accent2", cfg.accent2 || (licht ? DEFAULT_ACCENT2_LIGHT : DEFAULT_ACCENT2));
}
