const { app, BrowserWindow, dialog, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.console.level = "info";
log.info("=== WeegStation opgestart ===");
log.info("App packaged:", app.isPackaged);
log.info("App path:", app.getAppPath());
log.info("__dirname:", __dirname);

// Resources pad bepalen
const getResourcesPath = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked");
  }
  return __dirname;
};

const RESOURCES_PATH = getResourcesPath();
log.info("RESOURCES_PATH:", RESOURCES_PATH);

let mainWindow = null;
let bonWindow = null;
let wegenWindow = null;
let splashWindow = null;

const POSITIE_BESTAND = () => path.join(app.getPath("userData"), "posities.json");
const AUTH_BESTAND = () => path.join(app.getPath("userData"), "auth.json");
const BEDRIJF_BESTAND = () => path.join(app.getPath("userData"), "bedrijf.json");

// =============================================
// Duurzame data-opslag (wettelijke 5-jaars bewaarplicht)
// Elke sleutel als eigen JSON-bestand in userData/data, met .bak back-up.
// =============================================
const DATA_DIR = () => path.join(app.getPath("userData"), "data");
const AUDIT_DIR = () => path.join(app.getPath("userData"), "lma-audit");

function zorgVoorMap(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    log.error("Map aanmaken mislukt:", dir, e);
  }
}

function dataBestand(key) {
  const veilig = String(key).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR(), veilig + ".json");
}

function laadDataSleutel(key) {
  try {
    const f = dataBestand(key);
    if (fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, "utf-8"));
    }
    // Fallback naar back-up als hoofdbestand corrupt/weg is
    const bak = f + ".bak";
    if (fs.existsSync(bak)) {
      return JSON.parse(fs.readFileSync(bak, "utf-8"));
    }
  } catch (e) {
    log.error("Data laden mislukt voor", key, e);
    try {
      const bak = dataBestand(key) + ".bak";
      if (fs.existsSync(bak)) return JSON.parse(fs.readFileSync(bak, "utf-8"));
    } catch (e2) { log.error("Back-up laden mislukt voor", key, e2); }
  }
  return null;
}

function bewaarDataSleutel(key, value) {
  zorgVoorMap(DATA_DIR());
  const f = dataBestand(key);
  try {
    // Roteer huidige naar .bak voordat we overschrijven
    if (fs.existsSync(f)) {
      try { fs.copyFileSync(f, f + ".bak"); } catch (e) { log.warn("Back-up maken mislukt:", e); }
    }
    fs.writeFileSync(f, JSON.stringify(value, null, 2), "utf-8");
    return true;
  } catch (e) {
    log.error("Data bewaren mislukt voor", key, e);
    throw e;
  }
}

function laadPosities() {
  try {
    if (fs.existsSync(POSITIE_BESTAND())) {
      return JSON.parse(fs.readFileSync(POSITIE_BESTAND(), "utf-8"));
    }
  } catch (e) {
    log.error("Posities laden mislukt:", e);
  }
  return {};
}

function bewaarPosities(posities) {
  try {
    fs.writeFileSync(POSITIE_BESTAND(), JSON.stringify(posities, null, 2));
  } catch (e) {
    log.error("Posities bewaren mislukt:", e);
  }
}

function maakVenster(hash, label, defaultW = 1100, defaultH = 800) {
  const posities = laadPosities();
  const p = posities[hash] || {};

  // Check if required files exist
  const iconPath = path.join(RESOURCES_PATH, "build", "icon.ico");
  const indexPath = path.join(RESOURCES_PATH, "dist", "index.html");
  const preloadPath = path.join(RESOURCES_PATH, "preload.js");

  if (!fs.existsSync(indexPath)) {
    log.error("KRITIEKE FOUT: dist/index.html niet gevonden op:", indexPath);
    dialog.showErrorBox("Fout", "Gebouwde bestanden ontbreken.\nZorg ervoor dat 'npm run build' is uitgevoerd.");
    app.quit();
    return null;
  }

  if (!fs.existsSync(preloadPath)) {
    log.error("KRITIEKE FOUT: preload.js niet gevonden op:", preloadPath);
    dialog.showErrorBox("Fout", "Preload script ontbreekt.");
    app.quit();
    return null;
  }

  const opties = {
    width: p.w || defaultW,
    height: p.h || defaultH,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: label,
    backgroundColor: "#0f1011",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
      preload: preloadPath,
    },
  };
  if (p.x !== undefined) opties.x = p.x;
  if (p.y !== undefined) opties.y = p.y;

  const win = new BrowserWindow(opties);
  Menu.setApplicationMenu(null);

  log.info("  - index.html laden van:", indexPath);
  win.loadFile(indexPath, { hash }).catch((err) => {
    log.error("  ✗ loadFile error:", err);
  });

  win.webContents.on("did-finish-load", () => {
    log.info("  ✓ did-finish-load");
  });

  win.webContents.on("did-fail-load", (e, code, desc) => {
    log.error("  ✗ did-fail-load:", code, desc);
  });

  log.info("  - ready-to-show wachten...");
  win.once("ready-to-show", () => {
    log.info("  ✓ ready-to-show → window tonen");
    win.show();
    if (!app.isPackaged) {
      log.info("  - DevTools openen (dev mode)");
      win.webContents.openDevTools();
    }
  });

  // Timeout check
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      log.warn("  ⚠ Window nog steeds niet zichtbaar na 3 seconden!");
    }
  }, 3000);

  if (!app.isPackaged) {
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12") {
        win.webContents.toggleDevTools();
      }
    });
  }

  const slaOp = () => {
    if (win.isDestroyed()) return;
    const b = win.getBounds();
    const posities = laadPosities();
    posities[hash] = { x: b.x, y: b.y, w: b.width, h: b.height };
    bewaarPosities(posities);
  };
  win.on("moved", slaOp);
  win.on("resized", slaOp);

  return win;
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: "#0f1011",
    icon: path.join(RESOURCES_PATH, "build", "icon.ico"),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.setResizable(false);
  splashWindow.center();
  
  // Prioriteit: RESOURCES_PATH > process.resourcesPath
  const devPath = path.join(RESOURCES_PATH, "build", "splash.html");
  const resourcesPath = process.resourcesPath ? path.join(process.resourcesPath, "splash.html") : null;
  
  let splashPath;
  if (fs.existsSync(devPath)) {
    splashPath = devPath;
  } else if (resourcesPath && fs.existsSync(resourcesPath)) {
    splashPath = resourcesPath;
  } else {
    log.warn("Splash screen overgeslagen - bestand niet gevonden");
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    return;
  }
  
  log.info("Splash-pad:", splashPath);
  splashWindow.loadFile(splashPath).catch((err) => {
    log.error("Splash laden mislukt:", err);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  });
}

function createWindow() {
  log.info("→ createWindow() gestart");
  mainWindow = maakVenster("", "WeegStation", 1400, 900);
  log.info("← createWindow() klaar, mainWindow:", mainWindow ? "CREATED" : "NULL");
}

function openBonVenster() {
  if (bonWindow && !bonWindow.isDestroyed()) {
    if (bonWindow.isMinimized()) bonWindow.restore();
    bonWindow.focus();
    return;
  }
  bonWindow = maakVenster("bon", "WeegStation — Bon-venster", 1100, 850);
  bonWindow.on("closed", () => { bonWindow = null; });
}

function openWegenVenster() {
  if (wegenWindow && !wegenWindow.isDestroyed()) {
    if (wegenWindow.isMinimized()) wegenWindow.restore();
    wegenWindow.focus();
    return;
  }
  wegenWindow = maakVenster("wegen", "WeegStation — Wegen-venster", 1000, 850);
  wegenWindow.on("closed", () => { wegenWindow = null; });
}

ipcMain.handle("open-bon-venster", () => {
  try {
    openBonVenster();
  } catch (err) {
    log.error("Fout bij openen bon-venster:", err);
    throw err;
  }
});

ipcMain.handle("open-wegen-venster", () => {
  try {
    openWegenVenster();
  } catch (err) {
    log.error("Fout bij openen wegen-venster:", err);
    throw err;
  }
});

ipcMain.handle("sluit-venster", (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win !== mainWindow) win.close();
  } catch (err) {
    log.error("Fout bij sluiten venster:", err);
    throw err;
  }
});

ipcMain.handle("laad-posities", () => {
  try {
    return laadPosities();
  } catch (err) {
    log.error("Fout bij laden posities:", err);
    return {};
  }
});

ipcMain.handle("sla-positie", (event, { vensterType, positie }) => {
  try {
    const posities = laadPosities();
    posities[vensterType] = positie;
    bewaarPosities(posities);
  } catch (err) {
    log.error("Fout bij bewaren positie:", err);
    throw err;
  }
});

ipcMain.handle("laad-auth", () => {
  try {
    if (fs.existsSync(AUTH_BESTAND())) {
      return JSON.parse(fs.readFileSync(AUTH_BESTAND(), "utf-8"));
    }
  } catch (err) {
    log.error("Auth laden mislukt:", err);
  }
  return null;
});

ipcMain.handle("bewaar-auth", (event, config) => {
  try {
    fs.writeFileSync(AUTH_BESTAND(), JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    log.error("Auth bewaren mislukt:", err);
    throw err;
  }
});

ipcMain.handle("laad-bedrijf", () => {
  try {
    if (fs.existsSync(BEDRIJF_BESTAND())) {
      return JSON.parse(fs.readFileSync(BEDRIJF_BESTAND(), "utf-8"));
    }
  } catch (err) {
    log.error("Bedrijfconfig laden mislukt:", err);
  }
  return null;
});

ipcMain.handle("bewaar-bedrijf", (event, config) => {
  try {
    fs.writeFileSync(BEDRIJF_BESTAND(), JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    log.error("Bedrijfconfig bewaren mislukt:", err);
    throw err;
  }
});

// --- Duurzame data-opslag IPC ---
ipcMain.handle("data-laad", (event, key) => {
  try { return laadDataSleutel(key); }
  catch (err) { log.error("data-laad fout:", err); return null; }
});

ipcMain.handle("data-laad-alles", (event, keys) => {
  const result = {};
  try {
    (Array.isArray(keys) ? keys : []).forEach(k => {
      const v = laadDataSleutel(k);
      if (v !== null && v !== undefined) result[k] = v;
    });
  } catch (err) { log.error("data-laad-alles fout:", err); }
  return result;
});

ipcMain.handle("data-bewaar", (event, { key, value }) => {
  try { return bewaarDataSleutel(key, value); }
  catch (err) { log.error("data-bewaar fout:", err); throw err; }
});

ipcMain.handle("data-exporteer", async (event, { keys, suggestedName } = {}) => {
  try {
    const bundel = { exportDatum: new Date().toISOString(), data: {} };
    (Array.isArray(keys) ? keys : []).forEach(k => {
      bundel.data[k] = laadDataSleutel(k);
    });
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Back-up exporteren",
      defaultPath: suggestedName || ("weegstation-backup-" + new Date().toISOString().slice(0, 10) + ".json"),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { ok: false, geannuleerd: true };
    fs.writeFileSync(filePath, JSON.stringify(bundel, null, 2), "utf-8");
    return { ok: true, pad: filePath };
  } catch (err) {
    log.error("data-exporteer fout:", err);
    return { ok: false, fout: err.message };
  }
});

// --- LMA / AMICE IPC ---
function laadLmaModules() {
  const xmlBouwer = require(path.join(__dirname, "server", "lma", "xmlBouwer.cjs"));
  const amiceClient = require(path.join(__dirname, "server", "lma", "amiceClient.cjs"));
  return { xmlBouwer, amiceClient };
}

function bewaarAudit(naam, inhoud) {
  try {
    zorgVoorMap(AUDIT_DIR());
    const stempel = new Date().toISOString().replace(/[:.]/g, "-");
    const veilig = String(naam).replace(/[^a-zA-Z0-9_-]/g, "_");
    const pad = path.join(AUDIT_DIR(), `${stempel}_${veilig}`);
    fs.writeFileSync(pad, inhoud, "utf-8");
    return pad;
  } catch (e) {
    log.error("Audit bewaren mislukt:", e);
    return null;
  }
}

ipcMain.handle("lma-exporteer-xml", async (event, { type, payload, suggestedName } = {}) => {
  try {
    const { xmlBouwer } = laadLmaModules();
    const xml = xmlBouwer.bouwMelding(type, payload);
    bewaarAudit(`${type}_${payload?.asn || "melding"}.xml`, xml);
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "LMA-melding exporteren (XML)",
      defaultPath: suggestedName || `lma-${type}-${payload?.asn || ""}.xml`,
      filters: [{ name: "XML", extensions: ["xml"] }],
    });
    if (canceled || !filePath) return { ok: false, geannuleerd: true, xml };
    fs.writeFileSync(filePath, xml, "utf-8");
    return { ok: true, pad: filePath, xml };
  } catch (err) {
    log.error("lma-exporteer-xml fout:", err);
    return { ok: false, fout: err.message };
  }
});

ipcMain.handle("lma-melden", async (event, { type, payload, omgeving, certConfig } = {}) => {
  try {
    const { xmlBouwer, amiceClient } = laadLmaModules();
    const xml = xmlBouwer.bouwMelding(type, payload);
    const result = await amiceClient.verzendMelding({ xml, omgeving, certConfig });
    bewaarAudit(`${type}_${payload?.asn || "melding"}_verzonden.xml`, result.verzondenXml || xml);
    if (result.body) bewaarAudit(`${type}_${payload?.asn || "melding"}_retour.xml`, result.body);
    return result;
  } catch (err) {
    log.error("lma-melden fout:", err);
    return { ok: false, fout: err.message };
  }
});

ipcMain.handle("lma-status-opvragen", async (event, opties = {}) => {
  try {
    const { amiceClient } = laadLmaModules();
    return await amiceClient.opvraagStatus(opties);
  } catch (err) {
    log.error("lma-status-opvragen fout:", err);
    return { ok: false, fout: err.message };
  }
});

ipcMain.handle("lma-toets-asn", async (event, opties = {}) => {
  try {
    const { amiceClient } = laadLmaModules();
    return await amiceClient.toetsAfvalstroomnummer(opties);
  } catch (err) {
    log.error("lma-toets-asn fout:", err);
    return { ok: false, fout: err.message };
  }
});

ipcMain.handle("lma-cert-info", async (event, { certConfig } = {}) => {
  try {
    const { amiceClient } = laadLmaModules();
    return amiceClient.certInfo(certConfig || {});
  } catch (err) {
    log.error("lma-cert-info fout:", err);
    return { aanwezig: false, fout: err.message };
  }
});

// Error handler van preload
ipcMain.on("preload-error", (event, errorMsg) => {
  log.error("✗ PRELOAD ERROR:", errorMsg);
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox("Fout", "Er is een fout opgetreden:\n" + errorMsg);
  }
});

const { autoUpdater } = require("electron-updater");

autoUpdater.on("checking-for-update", function () { log.info("Controleren op updates..."); });
autoUpdater.on("update-available", function (info) {
  log.info("Update beschikbaar:", info.version);
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update beschikbaar",
      message: "WeegStation versie " + info.version + " is beschikbaar.",
      detail: "De update wordt nu gedownload.",
      buttons: ["OK"]
    });
  }
});
autoUpdater.on("update-not-available", function () { log.info("Geen updates beschikbaar"); });
autoUpdater.on("download-progress", function (p) {
  log.info("Download " + p.percent.toFixed(1) + "%");
});
autoUpdater.on("update-downloaded", function (info) {
  log.info("Update gedownload:", info.version);
  if (mainWindow) {
    var choice = dialog.showMessageBoxSync(mainWindow, {
      type: "info",
      title: "Update klaar",
      message: "Versie " + info.version + " is gedownload.",
      detail: "De app wordt herstart om de update te installeren.",
      buttons: ["Nu herstarten", "Bij afsluiten"]
    });
    if (choice === 0) autoUpdater.quitAndInstall();
  }
});
autoUpdater.on("error", function (err) {
  // Update-fouten mogen het weegproces nooit blokkeren: alleen loggen,
  // geen blokkerende foutmelding tonen (netwerk/GitHub/checksum e.d. zijn
  // niet kritiek voor de dagelijkse werking).
  log.error("Update-fout:", err == null ? "onbekend" : (err.stack || err.message || String(err)));
});

app.whenReady().then(function () {
  try {
    createSplash();
    setTimeout(function () {
      try {
        log.info("→ Hoofdvenster aanmaken...");
        createWindow();
        if (!mainWindow) {
          log.error("✗ Venster aanmaking mislukt - mainWindow is null");
          var logPad = "";
          try { logPad = log.transports.file.getFile().path; } catch (e) { logPad = ""; }
          dialog.showErrorBox(
            "Startup Fout",
            "WeegStation kon het hoofdvenster niet openen.\n\n" +
            (logPad ? "Logbestand:\n" + logPad : "Herinstalleer via WeegStation-Setup.exe")
          );
          app.quit();
          return;
        }
        log.info("✓ Hoofdvenster aangemaakt, wacht 2 seconden voor splash close...");
        setTimeout(function () {
          try {
            if (splashWindow && !splashWindow.isDestroyed()) {
              log.info("Splash screen sluiten");
              splashWindow.close();
            }
          } catch (err) {
            log.error("Fout bij splash sluiten:", err);
          }
        }, 2000);
      } catch (err) {
        log.error("✗ Fout bij venster aanmaking:", err);
        app.quit();
      }
    }, 800);
    setTimeout(function () {
      autoUpdater.checkForUpdates().catch(function (err) { 
        log.error("Check updates mislukt:", err.message); 
      });
    }, 5000);
  } catch (err) {
    log.error("KRITIEKE FOUT bij app startup:", err);
    dialog.showErrorBox("Startup Fout", "WeegStation kon niet starten:\n" + err.message);
    app.quit();
  }
}).catch(function (err) {
  log.error("KRITIEKE FOUT: app.whenReady() rejected:", err);
  app.quit();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Global error handlers
process.on("uncaughtException", function (err) {
  log.error("=== UNCAUGHT EXCEPTION ===");
  log.error(err);
  log.error("========================");
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox(
      "Kritieke Fout",
      "WeegStation is gecrashd:\n" + err.message + "\n\nZie log bestanden voor details."
    );
  }
  app.quit();
});

process.on("unhandledRejection", function (reason, promise) {
  log.error("=== UNHANDLED REJECTION ===");
  log.error("Promise:", promise);
  log.error("Reason:", reason);
  log.error("============================");
});

app.on("before-quit", function () {
  log.info("=== WeegStation wordt afgesloten ===");
});
