import { useState, useEffect } from "react";
import BonBouwer from "./BonBouwer";
import { getInitKlanten } from "../data/klanten";
import { INIT_PRIJZEN, INIT_OPBRENGST } from "../data/stamdata";
import { PRODUCT_NAAM } from "../data/product";
import { laadBedrijfConfig } from "../utils/bedrijfConfig";
import {
  getCachedPrijzenState, PRIJZEN_LS_KEY, OPBRENGST_LS_KEY, prijzenVanOpbrengst,
} from "../utils/prijzen";

import { WEGINGEN_LS_KEY as WEGINGEN_KEY, laadWegingenUitLS } from "../utils/wegingen";
const KLANTEN_KEY   = "ws-klanten";

function laadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

export default function BonVenster() {
  const [klanten,  setKlanten]  = useState(() => getInitKlanten());
  const [wegingen, setWegingen] = useState(() => laadWegingenUitLS());
  const [prijzen,  setPrijzen]  = useState(() => getCachedPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN).prijzen);
  const [toast,    setToast]    = useState(null);
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");

  useEffect(() => {
    document.title = `${PRODUCT_NAAM} — Bon-venster`;
    laadBedrijfConfig().then(cfg => {
      if (cfg?.bedrijfsnaam) setBedrijfsnaam(cfg.bedrijfsnaam);
    });
  }, []);

  // Sync van andere vensters
  useEffect(() => {
    const handler = (e) => {
      if (e.key === WEGINGEN_KEY && e.newValue) {
        try { setWegingen(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === KLANTEN_KEY && e.newValue) {
        try { setKlanten(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === PRIJZEN_LS_KEY && e.newValue) {
        try { setPrijzen(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === OPBRENGST_LS_KEY && e.newValue) {
        try { setPrijzen(prijzenVanOpbrengst(JSON.parse(e.newValue))); } catch (err) {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function sluitVenster() {
    if (window.electronAPI) window.electronAPI.sluitHuidigVenster();
    else window.close();
  }

  return (
    <div className="mw-layout">
      <div className="topbar">
        <div className="page-title">📄 Bon-venster</div>
        <div className="topbar-center">{bedrijfsnaam || "—"}</div>
        <div className="topbar-right">
          <span className="status-pill">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Standalone
          </span>
          <span className="last-update">{wegingen.length} wegingen · {klanten.length} klanten</span>
          <button className="btn-open-mw" onClick={sluitVenster}>✕ Sluiten</button>
        </div>
      </div>
      <div className="mw-content">
        <BonBouwer
          prijzen={prijzen}
          wegingen={wegingen}
          klanten={klanten}
          bedrijfsnaam={bedrijfsnaam || PRODUCT_NAAM}
        />
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
