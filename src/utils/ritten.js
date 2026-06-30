export const OPEN_RITTEN_LS_KEY = "ws-open-ritten";

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
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OPEN_RITTEN_LS_KEY, JSON.stringify(openRitten));
  } catch {}
}
