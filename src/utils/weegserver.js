export const SERVER_IP_LS_KEY = "newton-server-ip";

/** Moet overeenkomen met WEEGSERVER_KEY op de weegbrug-PC. Overschrijf via .env → VITE_WEEGSERVER_KEY */
export const DEFAULT_WEEGSERVER_KEY = import.meta.env.VITE_WEEGSERVER_KEY || "BultersWs-8kM2pQ9v";

export function laadServerKey() {
  return DEFAULT_WEEGSERVER_KEY;
}

export function maakWeegserverWsUrl(ip, poort = 3000) {
  const host = (ip || "localhost").trim();
  const key = encodeURIComponent(laadServerKey());
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

export function magWeegserverVerbinden() {
  if (typeof window === "undefined") return false;
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
