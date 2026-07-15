export const SERVER_IP_LS_KEY = "ws-server-ip";
export const SERVER_KEY_LS_KEY = "ws-server-key";

export function laadServerKey() {
  try {
    return localStorage.getItem(SERVER_KEY_LS_KEY) || "";
  } catch {
    return "";
  }
}

export function bewaarServerKey(key) {
  try {
    localStorage.setItem(SERVER_KEY_LS_KEY, key || "");
  } catch {}
}

export function maakWeegserverWsUrl(ip, sleutel, poort = 3000) {
  const host = (ip || "localhost").trim();
  const key = encodeURIComponent((sleutel || "").trim());
  return `ws://${host}:${poort}?key=${key}`;
}

export function laadServerIP() {
  try {
    return localStorage.getItem(SERVER_IP_LS_KEY) || "localhost";
  } catch {
    return "localhost";
  }
}

export function bewaarServerIP(ip) {
  try {
    localStorage.setItem(SERVER_IP_LS_KEY, ip);
  } catch {}
}

export function stuurStoplicht(ws, kleur) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const type = kleur === "groen" ? "stoplicht_groen" : "stoplicht_rood";
  try {
    ws.send(JSON.stringify({ type }));
    return true;
  } catch {
    return false;
  }
}

export function magWeegserverVerbinden() {
  if (typeof window === "undefined") return false;
  try {
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {}
  if (navigator.userAgent?.includes("Electron")) return true;
  const host = window.location.hostname;
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}
