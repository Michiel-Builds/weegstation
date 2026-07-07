import { useState, useEffect } from "react";
import WeegPagina from "./WeegPagina";
import { getInitKlanten } from "../data/klanten";
import { INIT_PRIJZEN, INIT_OPBRENGST } from "../data/stamdata";
import { PRODUCT_NAAM } from "../data/product";
import { laadBedrijfConfig } from "../utils/bedrijfConfig";
import { laadPrijzenState } from "../utils/prijzen";
import { laadServerIP, laadServerKey, stuurStoplicht } from "../utils/weegserver";
import { useWeegserverWs } from "../utils/useWeegserverWs";

import { WEGINGEN_LS_KEY as WEGINGEN_KEY, laadWegingenUitLS } from "../utils/wegingen";
const KLANTEN_KEY   = "ws-klanten";

function laadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

const initPrijzen = laadPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN);

export default function WegenVenster() {
  const [klanten, setKlanten] = useState(() => getInitKlanten());
  const [wegingen, setWegingen] = useState(() => laadWegingenUitLS());
  const [gewichtWeegbrug, setGewichtWeegbrug] = useState(null);
  const [gewichtLoods, setGewichtLoods] = useState(null);
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [stoplicht, setStoplicht] = useState({ kleur: "rood", enabled: false });
  const sleutel = laadServerKey();
  const ip = laadServerIP();

  const { wsRef, verbonden: serverVerbonden } = useWeegserverWs({
    actief: !!sleutel.trim(),
    ip,
    sleutel,
    onBericht: (data) => {
      if (data.type === "init") {
        if (data.weegbrug !== null && data.weegbrug !== undefined) setGewichtWeegbrug(data.weegbrug);
        if (data.loods !== null && data.loods !== undefined) setGewichtLoods(data.loods);
        if (data.stoplicht) setStoplicht(data.stoplicht);
      }
      if (data.type === "stoplicht") setStoplicht({ kleur: data.kleur, enabled: data.enabled });
      if (data.type === "gewicht_weegbrug") setGewichtWeegbrug(data.gewicht);
      if (data.type === "gewicht_loods") setGewichtLoods(data.gewicht);
    },
  });

  useEffect(() => {
    document.title = `${PRODUCT_NAAM} — Wegen-venster`;
    laadBedrijfConfig().then(cfg => {
      if (cfg?.bedrijfsnaam) setBedrijfsnaam(cfg.bedrijfsnaam);
    });
  }, []);

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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "registreer_weging", weging }));
    } else {
      weging.id = Date.now();
      weging.bron = "lokaal";
      weging.isNieuw = true;
      const updated = [weging, ...wegingen].slice(0, 200);
      setWegingen(updated);
      try { localStorage.setItem(WEGINGEN_KEY, JSON.stringify(updated)); } catch (e) {}
    }
  }

  function bedienStoplicht(kleur) {
    stuurStoplicht(wsRef.current, kleur);
  }

  function sluitVenster() {
    if (window.electronAPI) window.electronAPI.sluitHuidigVenster();
    else window.close();
  }

  const naam = bedrijfsnaam || PRODUCT_NAAM;

  return (
    <div className="mw-layout">
      <div className="topbar">
        <div className="page-title">⚖ Wegen-venster</div>
        <div className="topbar-center">{bedrijfsnaam || "—"}</div>
        <div className="topbar-right">
          <span className="status-pill">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: serverVerbonden ? "var(--green)" : "var(--red)", display: "inline-block" }} />
            {serverVerbonden ? "Live" : "Offline"}
          </span>
          <span className="last-update">{wegingen.length} wegingen</span>
          <button className="btn-open-mw" onClick={sluitVenster}>✕ Sluiten</button>
        </div>
      </div>
      <div className="mw-content">
        <WeegPagina
          gewichtWeegbrug={gewichtWeegbrug}
          gewichtLoods={gewichtLoods}
          serverVerbonden={serverVerbonden}
          onWeging={verstuurWeging}
          wegingen={wegingen}
          prijzen={initPrijzen.prijzen}
          opbrengst={initPrijzen.opbrengst}
          klanten={klanten}
          bedrijfsnaam={naam}
          stoplichtKleur={stoplicht.kleur}
          stoplichtEnabled={stoplicht.enabled}
          onStoplicht={bedienStoplicht}
        />
      </div>
    </div>
  );
}
