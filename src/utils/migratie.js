/** Eenmalige migratie van oude newton-/bulters-sleutels naar ws- prefix. */
const KOPPELINGEN = [
  ["newton-server-ip", "ws-server-ip"],
  ["newton-server-key", "ws-server-key"],
  ["newton-wegingen", "ws-wegingen"],
  ["newton-bonnen", "ws-bonnen"],
  ["newton-bon-omzet", "ws-bon-omzet"],
  ["newton-bon-teller", "ws-bon-teller"],
  ["newton-prijzen", "ws-prijzen"],
  ["newton-opbrengst", "ws-opbrengst"],
  ["newton-opbrengst-dag", "ws-opbrengst-dag"],
  ["newton-klanten", "ws-klanten"],
  ["newton-formulieren", "ws-formulieren"],
  ["newton-formulier-kalibratie", "ws-formulier-kalibratie"],
  ["bulters-auth-config", "ws-auth-config"],
];

export function migreerOpslagSleutels() {
  if (typeof window === "undefined") return;
  try {
    KOPPELINGEN.forEach(([oud, nieuw]) => {
      const val = localStorage.getItem(oud);
      if (val !== null && localStorage.getItem(nieuw) === null) {
        localStorage.setItem(nieuw, val);
      }
    });
  } catch {}
}
