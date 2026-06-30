/**
 * Stoplicht-aansturing op weegbrug-PC.
 * Standaard ROOD; GROEN alleen op commando van de app.
 *
 * Drivers:
 *   none  — uitgeschakeld (standaard)
 *   mock  — alleen loggen (testen zonder hardware)
 *   serial — commando's naar COM-poort (USB-relais, I/O-module)
 */
const { SerialPort } = require("serialport");

let huidigeKleur = "rood";
let groenTimer = null;
let laatsteGroenTijd = 0;

function log(fn, msg) {
  if (fn) fn(msg);
}

function parseBool(val, fallback = false) {
  if (val === undefined || val === null || val === "") return fallback;
  return /^(1|true|yes|ja|on)$/i.test(String(val).trim());
}

function maakConfig(env) {
  return {
    enabled: parseBool(env.TRAFFIC_LIGHT_ENABLED, false),
    driver: (env.TRAFFIC_LIGHT_DRIVER || "none").toLowerCase(),
    com: env.TRAFFIC_LIGHT_COM || "",
    cmdGroen: env.TRAFFIC_LIGHT_CMD_GROEN || "GROEN",
    cmdRood: env.TRAFFIC_LIGHT_CMD_ROOD || "ROOD",
    autoRoodKg: parseInt(env.TRAFFIC_LIGHT_AUTO_ROOD_KG || "300", 10),
    autoRoodSec: parseInt(env.TRAFFIC_LIGHT_AUTO_ROOD_SEC || "3", 10),
    groenTimeoutSec: parseInt(env.TRAFFIC_LIGHT_GROEN_TIMEOUT_SEC || "120", 10),
  };
}

let serialPort = null;
let serialBusy = false;

function openSerial(com, logFn) {
  if (serialPort && serialPort.isOpen) return serialPort;
  if (!com) throw new Error("TRAFFIC_LIGHT_COM ontbreekt");
  serialPort = new SerialPort({ path: com, baudRate: 9600, autoOpen: false });
  return new Promise((resolve, reject) => {
    serialPort.open((err) => {
      if (err) {
        log(logFn, "Stoplicht COM open mislukt: " + err.message);
        reject(err);
        return;
      }
      log(logFn, "Stoplicht verbonden op " + com);
      resolve(serialPort);
    });
  });
}

function parseCommandoReeks(cmd) {
  if (!cmd || !String(cmd).trim()) return [];
  return String(cmd)
    .split(/[|;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function wacht(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function stuurSerialCommando(cmd, cfg, logFn) {
  const reeks = parseCommandoReeks(cmd);
  if (reeks.length === 0) return;
  await openSerial(cfg.com, logFn);
  for (let i = 0; i < reeks.length; i++) {
    const regel = reeks[i];
    const data = regel.endsWith("\n") || regel.endsWith("\r") ? regel : regel + "\r\n";
    await new Promise((resolve, reject) => {
      if (serialBusy) {
        resolve();
        return;
      }
      serialBusy = true;
      serialPort.write(data, (err) => {
        serialBusy = false;
        if (err) reject(err);
        else resolve();
      });
    });
    if (i < reeks.length - 1) await wacht(80);
  }
}

async function zetKleur(kleur, cfg, logFn) {
  const norm = kleur === "groen" ? "groen" : "rood";
  if (!cfg.enabled || cfg.driver === "none") {
    huidigeKleur = norm;
    return { ok: true, kleur: norm, driver: "none" };
  }

  try {
    if (cfg.driver === "mock") {
      const cmds = parseCommandoReeks(norm === "groen" ? cfg.cmdGroen : cfg.cmdRood);
      log(logFn, "Stoplicht → " + norm.toUpperCase() + " (mock): " + cmds.join(" → "));
    } else if (cfg.driver === "serial") {
      const cmd = norm === "groen" ? cfg.cmdGroen : cfg.cmdRood;
      await stuurSerialCommando(cmd, cfg, logFn);
      log(logFn, "Stoplicht → " + norm.toUpperCase() + " via " + cfg.com);
    } else {
      log(logFn, "Onbekende stoplicht-driver: " + cfg.driver);
      return { ok: false, fout: "Onbekende driver" };
    }
    huidigeKleur = norm;
    if (norm === "groen") {
      laatsteGroenTijd = Date.now();
      planGroenTimeout(cfg, logFn);
    } else {
      clearGroenTimeout();
    }
    return { ok: true, kleur: norm, driver: cfg.driver };
  } catch (e) {
    log(logFn, "Stoplicht fout: " + e.message);
    return { ok: false, fout: e.message };
  }
}

function clearGroenTimeout() {
  if (groenTimer) {
    clearTimeout(groenTimer);
    groenTimer = null;
  }
}

function planGroenTimeout(cfg, logFn, onAutoRood) {
  clearGroenTimeout();
  if (!cfg.groenTimeoutSec || cfg.groenTimeoutSec <= 0) return;
  groenTimer = setTimeout(() => {
    if (huidigeKleur === "groen" && onAutoRood) {
      log(logFn, "Stoplicht timeout → automatisch ROOD");
      onAutoRood("timeout");
    }
  }, cfg.groenTimeoutSec * 1000);
}

/** Bij leeg gewicht op brug: terug naar rood (truck weg). */
function controleerAutoRood(gewicht, cfg, logFn, onAutoRood) {
  if (!cfg.enabled || huidigeKleur !== "groen") return;
  if (gewicht === null || gewicht === undefined) return;
  const kg = Number(gewicht);
  if (kg < cfg.autoRoodKg) {
    const nu = Date.now();
    if (!controleerAutoRood.sinds) controleerAutoRood.sinds = nu;
    if (nu - controleerAutoRood.sinds >= cfg.autoRoodSec * 1000) {
      controleerAutoRood.sinds = null;
      log(logFn, "Brug leeg (" + kg + " kg) → automatisch ROOD");
      if (onAutoRood) onAutoRood("leeg");
    }
  } else {
    controleerAutoRood.sinds = null;
  }
}

function getStatus(cfg) {
  return {
    kleur: huidigeKleur,
    enabled: cfg.enabled && cfg.driver !== "none",
    driver: cfg.driver,
  };
}

function maakStoplicht(cfgInput, logFn) {
  const cfg = typeof cfgInput === "object" && cfgInput.enabled !== undefined
    ? cfgInput
    : maakConfig(cfgInput || process.env);

  let broadcastFn = null;

  async function broadcastStatus() {
    if (broadcastFn) {
      broadcastFn({
        type: "stoplicht",
        kleur: huidigeKleur,
        enabled: cfg.enabled && cfg.driver !== "none",
      });
    }
  }

  async function naarRood(reden) {
    const res = await zetKleur("rood", cfg, logFn);
    if (res.ok) await broadcastStatus();
    return { ...res, reden: reden || "handmatig" };
  }

  async function naarGroen() {
    const res = await zetKleur("groen", cfg, logFn);
    if (res.ok) await broadcastStatus();
    return res;
  }

  async function init() {
    huidigeKleur = "rood";
    if (cfg.enabled && cfg.driver !== "none") {
      await zetKleur("rood", cfg, logFn);
      log(logFn, "Stoplicht actief (" + cfg.driver + ") — start ROOD");
    }
    return getStatus(cfg);
  }

  function onGewicht(gewicht) {
    controleerAutoRood(gewicht, cfg, logFn, (reden) => {
      naarRood(reden);
    });
  }

  function setBroadcast(fn) {
    broadcastFn = fn;
  }

  return {
    cfg,
    init,
    naarRood,
    naarGroen,
    onGewicht,
    setBroadcast,
    getStatus: () => getStatus(cfg),
  };
}

module.exports = { maakStoplicht, maakConfig };
