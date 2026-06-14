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
});
