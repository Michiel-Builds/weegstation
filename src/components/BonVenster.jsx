import { useState, useEffect } from "react";
import BonBouwer from "./BonBouwer";
import { getInitKlanten } from "../data/klanten";
import { INIT_PRIJZEN } from "../data/stamdata";

const WEGINGEN_KEY = "newton-wegingen";
const KLANTEN_KEY   = "newton-klanten";

function laadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

export default function BonVenster() {
  const [klanten,  setKlanten]  = useState(() => getInitKlanten());
  const [wegingen, setWegingen] = useState(() => laadLS(WEGINGEN_KEY, []));
  const [toast,    setToast]    = useState(null);

  useEffect(() => { document.title = "NewTon+ Bon-venster"; }, []);

  // Sync van andere vensters
  useEffect(() => {
    const handler = (e) => {
      if (e.key === WEGINGEN_KEY && e.newValue) {
        try { setWegingen(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === KLANTEN_KEY && e.newValue) {
        try { setKlanten(JSON.parse(e.newValue)); } catch (err) {}
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
        <div className="topbar-center">Metaalrecycling Bulters</div>
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
          prijzen={INIT_PRIJZEN}
          wegingen={wegingen}
          klanten={klanten}
        />
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
