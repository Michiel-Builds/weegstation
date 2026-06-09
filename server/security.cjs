/** Gedeelde beveiliging voor weegserver (HTTP + WebSocket). */

function normalizeIp(ip) {
  return (ip || "").replace(/^::ffff:/, "");
}

function parseAllowedIps(envVal) {
  if (!envVal || !String(envVal).trim()) return null;
  return String(envVal).split(",").map(s => s.trim()).filter(Boolean);
}

function isIpAllowed(ip, allowedList) {
  if (!allowedList || allowedList.length === 0) return true;
  const n = normalizeIp(ip);
  return allowedList.some(a => n === a || n.endsWith(":" + a));
}

function parseWsKey(req) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.searchParams.get("key");
  } catch {
    return null;
  }
}

function verifyWsAuth(req, apiKey) {
  if (!apiKey) return true;
  return parseWsKey(req) === apiKey;
}

module.exports = { normalizeIp, parseAllowedIps, isIpAllowed, parseWsKey, verifyWsAuth };
