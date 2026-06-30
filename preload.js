const { contextBridge, ipcRenderer } = require("electron");

// Global error handler
process.on("uncaughtException", (err) => {
  console.error("PRELOAD UNCAUGHT ERROR:", err);
  ipcRenderer.send("preload-error", err.toString());
});

window.addEventListener("error", (e) => {
  console.error("PRELOAD WINDOW ERROR:", e.error);
  ipcRenderer.send("preload-error", e.error?.toString() || "Unknown error");
});

contextBridge.exposeInMainWorld("electronAPI", {
  // Multi-window
  openBonVenster: () => ipcRenderer.invoke("open-bon-venster"),
  openWegenVenster: () => ipcRenderer.invoke("open-wegen-venster"),
  sluitHuidigVenster: () => ipcRenderer.invoke("sluit-venster"),

  // Posities
  laadPosities: () => ipcRenderer.invoke("laad-posities"),
  slaPositieOp: (vensterType, positie) =>
    ipcRenderer.invoke("sla-positie", { vensterType, positie }),

  laadAuthConfig: () => ipcRenderer.invoke("laad-auth"),
  bewaarAuthConfig: (config) => ipcRenderer.invoke("bewaar-auth", config),

  laadBedrijfConfig: () => ipcRenderer.invoke("laad-bedrijf"),
  bewaarBedrijfConfig: (config) => ipcRenderer.invoke("bewaar-bedrijf", config),

  // Duurzame opslag (bewaarplicht)
  dataLaad: (key) => ipcRenderer.invoke("data-laad", key),
  dataLaadAlles: (keys) => ipcRenderer.invoke("data-laad-alles", keys),
  dataBewaar: (key, value) => ipcRenderer.invoke("data-bewaar", { key, value }),
  dataExporteer: (opties) => ipcRenderer.invoke("data-exporteer", opties),

  // LMA / AMICE
  lmaExporteerXml: (opties) => ipcRenderer.invoke("lma-exporteer-xml", opties),
  lmaMelden: (opties) => ipcRenderer.invoke("lma-melden", opties),
  lmaStatusOpvragen: (opties) => ipcRenderer.invoke("lma-status-opvragen", opties),
  lmaToetsAsn: (opties) => ipcRenderer.invoke("lma-toets-asn", opties),
  lmaCertInfo: (opties) => ipcRenderer.invoke("lma-cert-info", opties),
});
