export const AUTH_LS_KEY = "ws-auth-config";

export async function laadAuthConfig() {
  if (typeof window !== "undefined" && window.electronAPI?.laadAuthConfig) {
    return window.electronAPI.laadAuthConfig();
  }
  try {
    const raw = localStorage.getItem(AUTH_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function bewaarAuthConfig(config) {
  if (typeof window !== "undefined" && window.electronAPI?.bewaarAuthConfig) {
    return window.electronAPI.bewaarAuthConfig(config);
  }
  try {
    localStorage.setItem(AUTH_LS_KEY, JSON.stringify(config));
  } catch {}
}

export async function heeftAuthConfig() {
  const cfg = await laadAuthConfig();
  return !!(cfg && cfg.wachtwoordHash);
}
