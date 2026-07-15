import { bewaarDuurzaam } from "./opslag";

export const OPEN_RITTEN_LS_KEY = "ws-open-ritten";
export const ACTIEVE_WEGINGEN_LS_KEY = "ws-actieve-wegingen";

export function laadOpenRitten() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OPEN_RITTEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function bewaarOpenRitten(openRitten) {
  bewaarDuurzaam(OPEN_RITTEN_LS_KEY, openRitten);
}

export function bewaarActieveWegingen(sessies) {
  bewaarDuurzaam(ACTIEVE_WEGINGEN_LS_KEY, sessies);
}

export function laadActieveWegingen() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIEVE_WEGINGEN_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
