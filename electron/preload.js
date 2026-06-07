const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Multi-window
  openBonVenster: () => ipcRenderer.invoke("open-bon-venster"),
  openWegenVenster: () => ipcRenderer.invoke("open-wegen-venster"),
  sluitHuidigVenster: () => ipcRenderer.invoke("sluit-venster"),

  // Posities
  laadPosities: () => ipcRenderer.invoke("laad-posities"),
  slaPositieOp: (vensterType, positie) =>
    ipcRenderer.invoke("sla-positie", { vensterType, positie }),
});
