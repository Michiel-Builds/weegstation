import { OPBRENGST_KORTING } from "../data/stamdata";

export const PRIJZEN_LS_KEY = "newton-prijzen";
export const OPBRENGST_LS_KEY = "newton-opbrengst";

export function inkoopVanOpbrengst(opbrengst) {
  const n = parseFloat(opbrengst);
  if (isNaN(n) || opbrengst === "") return "";
  return (n * (1 - OPBRENGST_KORTING)).toFixed(2);
}

export function opbrengstVanInkoop(inkoop) {
  const n = parseFloat(inkoop);
  if (isNaN(n) || inkoop === "") return "";
  return (n / (1 - OPBRENGST_KORTING)).toFixed(2);
}

export function prijzenVanOpbrengst(opbrengst) {
  return Object.fromEntries(
    Object.entries(opbrengst).map(([id, val]) => [id, inkoopVanOpbrengst(val)])
  );
}

export function laadPrijzenUitLS(fallback) {
  try {
    const raw = localStorage.getItem(PRIJZEN_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function laadOpbrengstUitLS(fallback) {
  try {
    const raw = localStorage.getItem(OPBRENGST_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function bewaarPrijzenInLS(prijzen) {
  try {
    localStorage.setItem(PRIJZEN_LS_KEY, JSON.stringify(prijzen));
  } catch {}
}

export function bewaarOpbrengstInLS(opbrengst) {
  try {
    localStorage.setItem(OPBRENGST_LS_KEY, JSON.stringify(opbrengst));
  } catch {}
}

export function laadPrijzenState(defaultOpbrengst, defaultPrijzen) {
  const opbFromLS = laadOpbrengstUitLS(null);
  if (opbFromLS) {
    return { opbrengst: opbFromLS, prijzen: prijzenVanOpbrengst(opbFromLS) };
  }
  const prijzenFromLS = laadPrijzenUitLS(null);
  if (prijzenFromLS) {
    const opb = Object.fromEntries(
      Object.entries(prijzenFromLS).map(([id, p]) => [id, opbrengstVanInkoop(p)])
    );
    return { opbrengst: opb, prijzen: prijzenFromLS };
  }
  return { opbrengst: defaultOpbrengst, prijzen: defaultPrijzen };
}

let cachedPrijzenState = null;

export function getCachedPrijzenState(defaultOpbrengst, defaultPrijzen) {
  if (!cachedPrijzenState) {
    cachedPrijzenState = laadPrijzenState(defaultOpbrengst, defaultPrijzen);
  }
  return cachedPrijzenState;
}
