import { Preferences } from "@capacitor/preferences";
import { hashWachtwoord } from "./auth";

export const MOBILE_SETUP_LS_KEY = "ws-mobile-setup-done";

export async function isMobieleSetupKlaar() {
  const { value } = await Preferences.get({ key: MOBILE_SETUP_LS_KEY });
  return value === "1";
}

export async function markeerMobieleSetupKlaar() {
  await Preferences.set({ key: MOBILE_SETUP_LS_KEY, value: "1" });
}

export async function maakMobieleChauffeurAuth({ naam, wachtwoord, bedrijfsnaam }) {
  const hash = await hashWachtwoord(wachtwoord);
  const config = {
    gebruikersnaam: "chauffeur",
    naam: naam.trim() || "Chauffeur",
    rol: "Chauffeur",
    wachtwoordHash: hash,
  };
  try {
    localStorage.setItem("ws-auth-config", JSON.stringify(config));
    localStorage.setItem("ws-bedrijf-config", JSON.stringify({
      bedrijfsnaam: bedrijfsnaam.trim() || "WeegStation",
      thema: "dark",
      accent: "#2e7d32",
      accent2: "#66bb6a",
      bonnenBasismap: "",
      lma: {},
    }));
  } catch {}
  await markeerMobieleSetupKlaar();
  return config;
}
