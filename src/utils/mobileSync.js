/** Fetch helpers voor kantoor sync-API (Fase 2, LAN). */
import { Preferences } from "@capacitor/preferences";

export const KANTOOR_IP_KEY = "ws-kantoor-sync-ip";
export const KANTOOR_TOKEN_KEY = "ws-kantoor-sync-token";
const SYNC_POORT = 3847;

export async function laadKantoorSyncConfig() {
  const [ipRes, tokenRes] = await Promise.all([
    Preferences.get({ key: KANTOOR_IP_KEY }),
    Preferences.get({ key: KANTOOR_TOKEN_KEY }),
  ]);
  return { ip: ipRes.value || "", token: tokenRes.value || "" };
}

export async function bewaarKantoorSyncConfig(ip, token) {
  await Preferences.set({ key: KANTOOR_IP_KEY, value: ip || "" });
  await Preferences.set({ key: KANTOOR_TOKEN_KEY, value: token || "" });
}

export async function fetchSyncEndpoint(ip, token, pad) {
  if (!ip?.trim() || !token?.trim()) {
    return { ok: false, fout: "Kantoor IP en sync-token vereist" };
  }
  const url = `http://${ip.trim()}:${SYNC_POORT}${pad}`;
  try {
    const res = await fetch(url, {
      headers: { "x-sync-token": token.trim() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, fout: err.error || res.statusText };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, fout: e.message || "Netwerkfout" };
  }
}

export async function testKantoorSync(ip, token) {
  return fetchSyncEndpoint(ip, token, "/api/status");
}

export async function haalKlantenVanKantoor(ip, token) {
  return fetchSyncEndpoint(ip, token, "/api/klanten");
}

export async function haalWegingenVanKantoor(ip, token) {
  return fetchSyncEndpoint(ip, token, "/api/wegingen");
}

export async function haalBonOmzetVanKantoor(ip, token) {
  return fetchSyncEndpoint(ip, token, "/api/bon-omzet");
}
