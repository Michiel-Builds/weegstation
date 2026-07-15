/** LAN sync-API voor mobiele kantoor-modus (alleen op kantoor-PC). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SYNC_PORT = 3847;
const SYNC_TOKEN_BESTAND = (userDataDir) => path.join(userDataDir, "sync-api-token.txt");

function normalizeIp(ip) {
  return (ip || "").replace(/^::ffff:/, "");
}

function isPrivateLan(ip) {
  const n = normalizeIp(ip);
  return (
    n === "127.0.0.1" ||
    n === "::1" ||
    /^192\.168\./.test(n) ||
    /^10\./.test(n) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(n)
  );
}

function haalSyncToken(userDataDir) {
  const f = SYNC_TOKEN_BESTAND(userDataDir);
  try {
    if (fs.existsSync(f)) return fs.readFileSync(f, "utf-8").trim();
  } catch {}
  const token = crypto.randomBytes(24).toString("hex");
  try {
    fs.writeFileSync(f, token, "utf-8");
  } catch {}
  return token;
}

function jsonAntwoord(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
  });
  res.end(JSON.stringify(body));
}

function startSyncApiServer({ userDataDir, laadDataSleutel, log, versie }) {
  const token = haalSyncToken(userDataDir);
  const server = http.createServer((req, res) => {
    const clientIp = normalizeIp(req.socket.remoteAddress);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
      });
      return res.end();
    }

    if (!isPrivateLan(clientIp)) {
      return jsonAntwoord(res, 403, { error: "Alleen LAN" });
    }

    const url = (req.url || "/").split("?")[0];
    const clientToken = req.headers["x-sync-token"];
    if (clientToken !== token) {
      return jsonAntwoord(res, 401, { error: "Unauthorized" });
    }

    if (url === "/api/status") {
      return jsonAntwoord(res, 200, { ok: true, versie, poort: SYNC_PORT });
    }
    if (url === "/api/klanten") {
      return jsonAntwoord(res, 200, laadDataSleutel("ws-klanten") || []);
    }
    if (url === "/api/wegingen") {
      return jsonAntwoord(res, 200, laadDataSleutel("ws-wegingen") || []);
    }
    if (url === "/api/bon-omzet") {
      return jsonAntwoord(res, 200, laadDataSleutel("ws-bon-omzet") || []);
    }

    jsonAntwoord(res, 404, { error: "Niet gevonden" });
  });

  server.listen(SYNC_PORT, "0.0.0.0", () => {
    log.info("Sync-API actief op poort " + SYNC_PORT + " (LAN, token in userData/sync-api-token.txt)");
  });

  server.on("error", (err) => {
    log.warn("Sync-API kon niet starten:", err.message);
  });

  return { server, token, poort: SYNC_PORT };
}

module.exports = { startSyncApiServer, SYNC_PORT };
