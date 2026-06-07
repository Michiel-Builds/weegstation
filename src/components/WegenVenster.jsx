import { useState, useEffect } from "react";
import WeegPagina from "./WeegPagina";
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

export default function WegenVenster() {
  const [klanten,  setKlanten]  = useState(() => getInitKlanten());
  const [wegingen, setWegingen] = useState(() => laadLS(WEGINGEN_KEY, []));

  // Simpele live-gewichts-simulatie (geen echte weegbrug in dit venster)
  const [huidigGewicht, setHuidigGewicht] = useState(null);

  useEffect(() => { document.title = "NewTon+ Wegen-venster"; }, []);

  useEffect(() => {
    let g = 0, dir = 1;
    const t = setInterval(() => {
      g += dir * (Math.random() * 100 + 20);
      if (g > 8000) dir = -1;
      if (g < 0) { g = 0; dir = 1; }
      setHuidigGewicht(Math.round(g / 20) * 20);
    }, 800);
    return () => clearInterval(t);
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
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function verstuurWeging(weging) {
    const updated = [weging, ...wegingen].slice(0, 200);
    setWegingen(updated);
    try { localStorage.setItem(WEGINGEN_KEY, JSON.stringify(updated)); } catch (e) {}
  }

  function sluitVenster() {
    if (window.electronAPI) window.electronAPI.sluitHuidigVenster();
    else window.close();
  }

  return (
    <div className="mw-layout">
      <div className="topbar">
        <div className="page-title">⚖ Wegen-venster</div>
        <div className="topbar-center">Metaalrecycling Bulters</div>
        <div className="topbar-right">
          <span className="status-pill">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Standalone
          </span>
          <span className="last-update">{wegingen.length} wegingen</span>
          <button className="btn-open-mw" onClick={sluitVenster}>✕ Sluiten</button>
        </div>
      </div>
      <div className="mw-content">
        <WeegPagina
          gewichtWeegbrug={huidigGewicht}
          gewichtLoods={null}
          serverVerbonden={true}
          simulatieModus={true}
          onWeging={verstuurWeging}
          wegingen={wegingen}
          prijzen={INIT_PRIJZEN}
          klanten={klanten}
        />
      </div>
    </div>
  );
}
