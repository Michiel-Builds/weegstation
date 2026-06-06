const { app, BrowserWindow, dialog, Menu } = require("electron");
const path = require("path");
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.console.level = "info";
log.info("=== NewTon+ opgestart ===");

let mainWindow = null;
let splashWindow = null;

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "build", "icon.ico"),
    title: "NewTon+ | Metaalrecycling Bulters",
    backgroundColor: "#0f1011",
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  mainWindow.once("ready-to-show", function () { mainWindow.show(); });
}

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
