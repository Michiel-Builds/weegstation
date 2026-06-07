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

  const opties = {
    width: p.w || defaultW,
    height: p.h || defaultH,
    icon: path.join(__dirname, "build", "icon.ico"),
    title: label,
    backgroundColor: "#0f1011",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron", "preload.js"),
    },
  };
  if (p.x !== undefined) opties.x = p.x;
  if (p.y !== undefined) opties.y = p.y;

  const win = new BrowserWindow(opties);
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, "dist", "index.html"), { hash });
  win.once("ready-to-show", () => win.show());

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
  var splashPath;
  if (process.resourcesPath) {
    splashPath = path.join(process.resourcesPath, "splash.html");
  } else {
    splashPath = path.join(__dirname, "build", "splash.html");
  }
  log.info("Splash-pad:", splashPath);
  splashWindow.loadFile(splashPath);
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

// IPC handlers
ipcMain.handle("open-bon-venster", () => openBonVenster());
ipcMain.handle("open-wegen-venster", () => openWegenVenster());
ipcMain.handle("sluit-venster", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win !== mainWindow) win.close();
});
ipcMain.handle("laad-posities", () => laadPosities());
ipcMain.handle("sla-positie", (event, { vensterType, positie }) => {
  const posities = laadPosities();
  posities[vensterType] = positie;
  bewaarPosities(posities);
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
autoUpdater.on("error", function (err) { log.error("Update-fout:", err.message); });

app.whenReady().then(function () {
  createSplash();
  setTimeout(function () {
    createWindow();
    setTimeout(function () {
      if (splashWindow) splashWindow.close();
    }, 800);
  }, 600);
  setTimeout(function () {
    autoUpdater.checkForUpdates().catch(function (err) { log.error("Check mislukt:", err.message); });
  }, 5000);
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
