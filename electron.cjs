const { app, BrowserWindow, dialog, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.console.level = "info";
log.info("=== NewTon+ opgestart ===");

let mainWindow = null;
let bonWindow = null;
let wegenWindow = null;
let splashWindow = null;

const POSITIE_BESTAND = () => path.join(app.getPath("userData"), "posities.json");

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
  const iconPath = path.join(__dirname, "build", "icon.ico");
  const indexPath = path.join(__dirname, "dist", "index.html");
  const preloadPath = path.join(__dirname, "preload.js");

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
      devTools: true,
      preload: preloadPath,
    },
  };
  if (p.x !== undefined) opties.x = p.x;
  if (p.y !== undefined) opties.y = p.y;

  const win = new BrowserWindow(opties);
  Menu.setApplicationMenu(null);

  win.loadFile(indexPath, { hash });
  win.once("ready-to-show", () => win.show());

  // F12 om DevTools te openen
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      win.webContents.toggleDevTools();
    }
  });

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
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.setResizable(false);
  splashWindow.center();
  
  // Prioriteit: dev > bundled resources > fallback
  const devPath = path.join(__dirname, "build", "splash.html");
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
  mainWindow = maakVenster("", "NewTon+ | Metaalrecycling Bulters", 1400, 900);
}

function openBonVenster() {
  if (bonWindow && !bonWindow.isDestroyed()) {
    if (bonWindow.isMinimized()) bonWindow.restore();
    bonWindow.focus();
    return;
  }
  bonWindow = maakVenster("bon", "NewTon+ Bon-venster", 1100, 850);
  bonWindow.on("closed", () => { bonWindow = null; });
}

function openWegenVenster() {
  if (wegenWindow && !wegenWindow.isDestroyed()) {
    if (wegenWindow.isMinimized()) wegenWindow.restore();
    wegenWindow.focus();
    return;
  }
  wegenWindow = maakVenster("wegen", "NewTon+ Wegen-venster", 1000, 850);
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

const { autoUpdater } = require("electron-updater");

autoUpdater.on("checking-for-update", function () { log.info("Controleren op updates..."); });
autoUpdater.on("update-available", function (info) {
  log.info("Update beschikbaar:", info.version);
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update beschikbaar",
      message: "NewTon+ versie " + info.version + " is beschikbaar.",
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
  log.error("Update-fout:", err.message);
  if (mainWindow) {
    dialog.showErrorBox("Update Fout", "Er was een probleem bij het controleren op updates:\n" + err.message);
  }
});

app.whenReady().then(function () {
  try {
    createSplash();
    setTimeout(function () {
      try {
        createWindow();
        if (!mainWindow) {
          log.error("Venster aanmaking mislukt");
          app.quit();
          return;
        }
        setTimeout(function () {
          if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        }, 800);
      } catch (err) {
        log.error("Fout bij venster aanmaking:", err);
        app.quit();
      }
    }, 600);
    setTimeout(function () {
      autoUpdater.checkForUpdates().catch(function (err) { 
        log.error("Check updates mislukt:", err.message); 
      });
    }, 5000);
  } catch (err) {
    log.error("KRITIEKE FOUT bij app startup:", err);
    dialog.showErrorBox("Startup Fout", "NewTon+ kon niet starten:\n" + err.message);
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
      "NewTon+ is gecrashd:\n" + err.message + "\n\nZie log bestanden voor details."
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
  log.info("=== NewTon+ wordt afgesloten ===");
});
