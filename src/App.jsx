import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

import { PRODUCT_NAAM, LMA_INGESCHAKELD } from "./data/product";
import { MATERIALEN, INIT_PRIJZEN, INIT_OPBRENGST, OPBRENGST_KORTING } from "./data/stamdata";
import {
  getCachedPrijzenState, bewaarPrijzenInLS, bewaarOpbrengstInLS,
  inkoopVanOpbrengst, prijzenVanOpbrengst,
} from "./utils/prijzen";
import { vastlegOpbrengstVoorDag, zorgVoorDagSnapshot, vandaagDatumKey } from "./utils/opbrengstDag";
import {
  laadBonOmzet, BON_OMZET_LS_KEY, berekenTotaleOmzet, berekenOmzetVandaag,
} from "./utils/bonOmzet";
import { getInitKlanten, getZakelijk, getParticulier } from "./data/klanten";

import LoginScherm from "./components/LoginScherm";
import EersteSetup from "./components/EersteSetup";
import ChauffeurScherm from "./components/ChauffeurScherm";
import WeegPagina from "./components/WeegPagina";
import XMLImport from "./components/XMLImport";
import BonBouwer from "./components/BonBouwer";
import RapportPagina from "./components/RapportPagina";
import Calculator from "./components/Calculator";
import KlantenSidebar from "./components/KlantenSidebar";
import MultiWindowButtons from "./components/MultiWindowButtons";
import Icon from "./components/Icon";
import FormulierenPagina from "./components/FormulierenPagina";
import InstellingenPagina from "./components/InstellingenPagina";
import AfvalstromenPagina from "./components/AfvalstromenPagina";
import LMAPagina from "./components/LMAPagina";
import { laadServerIP, bewaarServerIP, laadServerKey, bewaarServerKey, magWeegserverVerbinden, maakWeegserverWsUrl, stuurStoplicht } from "./utils/weegserver";
import { heeftAuthConfig } from "./utils/authStore";
import { laadBedrijfConfig, heeftBedrijfConfig } from "./utils/bedrijfConfig";
import { pasThemaToe } from "./utils/thema";
import { migreerOpslagSleutels } from "./utils/migratie";

import { WEGINGEN_LS_KEY, laadWegingenUitLS, bewaarWegingenInLS } from "./utils/wegingen";

export default function App() {
  const [authStatus, setAuthStatus] = useState("laden");
  const [gebruiker, setGebruiker] = useState(null);
  const [pagina, setPagina] = useState("dashboard");

  useEffect(() => {
    if (!LMA_INGESCHAKELD && (pagina === "lma" || pagina === "afvalstromen")) {
      setPagina("dashboard");
    }
  }, [pagina]);
  const [wegingen, setWegingen] = useState(() => laadWegingenUitLS());
  const [bonOmzet, setBonOmzet] = useState(() => laadBonOmzet());
  const [opbrengst, setOpbrengst] = useState(() => getCachedPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN).opbrengst);
  const [prijzen, setPrijzen] = useState(() => getCachedPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN).prijzen);
  const [tempOpbrengst, setTempOpbrengst] = useState(() => getCachedPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN).opbrengst);
  const [tempPrijzen, setTempPrijzen] = useState(() => getCachedPrijzenState(INIT_OPBRENGST, INIT_PRIJZEN).prijzen);
  const [toast, setToast] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [gewichtWeegbrug, setGewichtWeegbrug] = useState(null);
  const [gewichtLoods, setGewichtLoods] = useState(null);
  const [serverVerbonden, setServerVerbonden] = useState(false);
  const [stoplicht, setStoplicht] = useState({ kleur: "rood", enabled: false });
  const [serverIP, setServerIP] = useState(() => laadServerIP());
  const [serverKey, setServerKey] = useState(() => laadServerKey());
  const [bedrijf, setBedrijf] = useState(null);
  const [klanten, setKlanten] = useState(() => getInitKlanten());
  const wsRef = useRef(null);

  useEffect(() => {
    migreerOpslagSleutels();
    Promise.all([heeftAuthConfig(), heeftBedrijfConfig()]).then(([auth, bedrijfOk]) => {
      setAuthStatus(auth && bedrijfOk ? "klaar" : "setup");
    });
    laadBedrijfConfig().then(cfg => {
      if (cfg) {
        setBedrijf(cfg);
        pasThemaToe(cfg);
        document.title = `${PRODUCT_NAAM} | ${cfg.bedrijfsnaam}`;
      } else {
        document.title = PRODUCT_NAAM;
      }
    });
  }, []);

  useEffect(() => {
    zorgVoorDagSnapshot(vandaagDatumKey(), opbrengst);
  }, []);

  useEffect(() => {
    if (!gebruiker || authStatus !== "klaar") return;
    if (!serverKey.trim()) return;
    if (!magWeegserverVerbinden()) {
      console.warn("WAARSCHUWING: App draait niet in lokaal netwerk. Server-verbinding uitgeschakeld.");
      return;
    }
    function verbindServer(ip, key) {
      let ws;
      try {
        ws = new WebSocket(maakWeegserverWsUrl(ip, key));
      } catch (e) {
        console.error("WebSocket constructie fout:", e);
        setServerVerbonden(false);
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        console.log("✓ Server verbonden op " + ip + ":3000");
        setServerVerbonden(true);
        toonToast("✓ Live verbonden");
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setLastUpdate(new Date());
          if (data.type === "init") {
            if (data.wegingen) {
              setWegingen(data.wegingen);
              bewaarWegingenInLS(data.wegingen);
            }
            if (data.weegbrug !== null && data.weegbrug !== undefined) setGewichtWeegbrug(data.weegbrug);
            if (data.loods !== null && data.loods !== undefined) setGewichtLoods(data.loods);
            if (data.stoplicht) setStoplicht(data.stoplicht);
          }
          if (data.type === "stoplicht") setStoplicht({ kleur: data.kleur, enabled: data.enabled });
          if (data.type === "gewicht_weegbrug") setGewichtWeegbrug(data.gewicht);
          if (data.type === "gewicht_loods") setGewichtLoods(data.gewicht);
          if (data.type === "nieuwe_weging") {
            setWegingen(prev => {
              const updated = [data.weging, ...prev].slice(0, 200);
              bewaarWegingenInLS(updated);
              return updated;
            });
          }
        } catch (e) {
          console.error("Fout bij WebSocket bericht verwerking:", e);
        }
      };
      ws.onclose = () => { 
        console.warn("Server verbinding verbroken. Herverbinden in 5 seconden...");
        setServerVerbonden(false); 
        setTimeout(() => gebruiker && verbindServer(ip, key), 5000); 
      };
      ws.onerror = (err) => {
        console.error("WebSocket fout:", err);
        setServerVerbonden(false);
        toonToast("⚠ Server niet bereikbaar");
      };
    }
    verbindServer(serverIP, serverKey);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [gebruiker, serverIP, serverKey, authStatus]);

  useEffect(() => {
    bewaarWegingenInLS(wegingen);
  }, [wegingen]);

  useEffect(() => {
    bewaarServerIP(serverIP);
  }, [serverIP]);

  useEffect(() => {
    bewaarServerKey(serverKey);
  }, [serverKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const verversBonOmzet = () => setBonOmzet(laadBonOmzet());
    const handler = (e) => {
      if (e.key === WEGINGEN_LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setWegingen(parsed);
        } catch (err) {}
      }
      if (e.key === BON_OMZET_LS_KEY) verversBonOmzet();
    };
    window.addEventListener("storage", handler);
    window.addEventListener("ws-bon-omzet-update", verversBonOmzet);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("ws-bon-omzet-update", verversBonOmzet);
    };
  }, []);

  function bedienStoplicht(kleur) {
    if (stuurStoplicht(wsRef.current, kleur)) {
      toonToast(kleur === "groen" ? "🟢 Groen licht" : "🔴 Rood licht");
    } else {
      toonToast("⚠ Geen verbinding met weegserver");
    }
  }

  function verstuurWeging(weging) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "registreer_weging", weging }));
    } else {
      weging.id = Date.now();
      weging.bron = "lokaal";
      weging.isNieuw = true;
      setWegingen(prev => {
        const updated = [weging, ...prev].slice(0, 200);
        bewaarWegingenInLS(updated);
        return updated;
      });
      setTimeout(() => setWegingen(prev => prev.map(w => w.id === weging.id ? { ...w, isNieuw: false } : w)), 2000);
    }
    setLastUpdate(new Date());
  }

  function toonToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function wijzigOpbrengst(materiaalId, waarde) {
    setTempOpbrengst(p => ({ ...p, [materiaalId]: waarde }));
    setTempPrijzen(p => ({ ...p, [materiaalId]: inkoopVanOpbrengst(waarde) }));
  }

  function slaOp() {
    const nieuweOpbrengst = { ...tempOpbrengst };
    const nieuwePrijzen = prijzenVanOpbrengst(nieuweOpbrengst);
    setOpbrengst(nieuweOpbrengst);
    setPrijzen(nieuwePrijzen);
    setTempPrijzen(nieuwePrijzen);
    bewaarOpbrengstInLS(nieuweOpbrengst);
    bewaarPrijzenInLS(nieuwePrijzen);
    vastlegOpbrengstVoorDag(vandaagDatumKey(), nieuweOpbrengst);
    toonToast("Prijzen opgeslagen ✓");
  }
  function importeerWegingen(nieuwe) {
    setWegingen(prev => {
      const updated = [...nieuwe, ...prev].slice(0, 200);
      bewaarWegingenInLS(updated);
      return updated;
    });
    setLastUpdate(new Date());
    toonToast(`${nieuwe.length} weging(en) ingeladen ✓`);
  }

  const totaalKg = wegingen.reduce((s, w) => s + w.gewicht, 0);
  const totaalOmzet = berekenTotaleOmzet(bonOmzet);
  const omzetVandaag = berekenOmzetVandaag(bonOmzet);
  const vandaag = wegingen.filter(w => w.datum === new Date().toLocaleDateString("nl-NL"));
  const kanPrijzen = gebruiker && (gebruiker.rol === "Admin" || gebruiker.rol === "Prijzen");

  if (authStatus === "laden") return null;
  if (authStatus === "setup") {
    return (
      <EersteSetup
        onKlaar={(cfg) => {
          setBedrijf(cfg);
          pasThemaToe(cfg);
          document.title = `${PRODUCT_NAAM} | ${cfg.bedrijfsnaam}`;
          setAuthStatus("klaar");
          setServerKey(laadServerKey());
        }}
      />
    );
  }
  if (!gebruiker) return <LoginScherm onLogin={setGebruiker} />;
  if (gebruiker.rol === "Chauffeur") return (
    <>
      <ChauffeurScherm
        gebruiker={gebruiker}
        onLogout={() => setGebruiker(null)}
        gewichtWeegbrug={gewichtWeegbrug}
        gewichtLoods={gewichtLoods}
        serverVerbonden={serverVerbonden}
        onWeging={verstuurWeging}
        bedrijfsnaam={bedrijf?.bedrijfsnaam || PRODUCT_NAAM}
      />
      {toast && <div className="toast">{toast}</div>}
    </>
  );

  const navSecties = [
    {
      titel: "Operatie",
      items: [
        { key: "dashboard", icon: "dashboard", label: "Dashboard" },
        { key: "calculator", icon: "calculator", label: "Calculator" },
        { key: "wegen", icon: "weeg", label: "Wegen" },
        { key: "bon", icon: "document", label: "Bon maken" },
      ],
    },
    {
      titel: "Beheer",
      items: [
        { key: "wegingen", icon: "lijst", label: "Overzicht" },
        ...(kanPrijzen ? [{ key: "prijzen", icon: "euro", label: "Prijzen" }] : []),
        ...(kanPrijzen ? [{ key: "instellingen", icon: "instellingen", label: "Instellingen" }] : []),
        { key: "rapport", icon: "rapport", label: "Rapport" },
        ...(LMA_INGESCHAKELD ? [
          { key: "afvalstromen", icon: "lijst", label: "Afvalstromen (LMA)" },
          { key: "lma", icon: "rapport", label: "LMA / Afvalmelding" },
        ] : []),
        { key: "import", icon: "import", label: "XML Import" },
        { key: "formulieren", icon: "formulieren", label: "Formulieren" },
      ],
    },
  ];

  const titels = {
    dashboard: "Dashboard",
    calculator: "Calculator",
    wegingen: "Wegingen",
    prijzen: "Prijsbeheer",
    rapport: "Rapportage",
    afvalstromen: "Afvalstromen (LMA)",
    lma: "LMA / Afvalmelding",
    import: "XML Import",
    formulieren: "Formulieren",
    instellingen: "Instellingen",
  };

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-label">{bedrijf?.bedrijfsnaam || "—"}</div>
            <div className="logo-name">{PRODUCT_NAAM}</div>
          </div>
          <nav className="nav">
            {navSecties.map(sectie => (
              <div className="nav-sectie" key={sectie.titel}>
                <div className="nav-sec-titel">{sectie.titel}</div>
                {sectie.items.map(item => (
                  <button
                    key={item.key}
                    className={`nav-item${pagina === item.key ? " active" : ""}`}
                    onClick={() => setPagina(item.key)}
                  >
                    <span className="nav-icon"><Icon name={item.icon} /></span>
                    <span>{item.label}</span>
                    {item.key === "dashboard" && <span className="live-dot" />}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <KlantenSidebar
            klanten={klanten}
            setKlanten={setKlanten}
          />

          <div className="sidebar-footer">
            <div className="user-info">
              <span className="user-name">{gebruiker.naam}</span>
              <span className="user-role">{gebruiker.rol}</span>
            </div>
            <button
              className="logout-btn"
              onClick={() => { setGebruiker(null); setPagina("dashboard"); }}
            >Uitloggen</button>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div className="page-title">{titels[pagina]}</div>
            <div className="topbar-center">{bedrijf?.bedrijfsnaam}</div>
            <div className="topbar-right">
              <MultiWindowButtons />
              <div className="status-pill">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                {serverVerbonden ? "Live" : "Offline"}
              </div>
              <span className="last-update">Bijgewerkt: {lastUpdate.toLocaleTimeString("nl-NL")}</span>
            </div>
          </div>
          <div className="content">
            {pagina === "dashboard" && (
              <>
                <div className="server-balk">
                  <div className={`server-dot ${serverVerbonden ? "verbonden" : "verbroken"}`} />
                  <span style={{ color: serverVerbonden ? "var(--green)" : "var(--red)" }}>
                    {serverVerbonden
                      ? "Live verbonden met weegserver"
                      : !serverKey.trim()
                        ? "Vul weegserver-sleutel in"
                        : "Verbinding verbroken — herverbinden..."}
                  </span>
                  {!serverVerbonden && (
                    <div className="server-instellingen">
                      <input
                        className="server-ip-input"
                        value={serverIP}
                        onChange={e => setServerIP(e.target.value)}
                        placeholder="IP weegbrug"
                        title="IP-adres weegbrug-PC"
                      />
                      <input
                        className="server-ip-input server-key-input"
                        type="password"
                        value={serverKey}
                        onChange={e => setServerKey(e.target.value)}
                        placeholder="Weegserver-sleutel"
                        title="Zelfde sleutel als WEEGSERVER_KEY op weegbrug-PC"
                      />
                    </div>
                  )}
                </div>
                <div className="live-gewicht-balk">
                  <div className={`gewicht-kaart${gewichtWeegbrug !== null ? " actief" : ""}`}>
                    <div className="gewicht-icon"><Icon name="truck" size={30} strokeWidth={1.75} /></div>
                    <div className="gewicht-info">
                      <div className="gewicht-bron">Weegbrug — live</div>
                      {gewichtWeegbrug !== null ? (
                        <div>
                          <span className="gewicht-getal-groot">{gewichtWeegbrug.toLocaleString("nl-NL")}</span>
                          <span className="gewicht-eenheid-groot"> kg</span>
                        </div>
                      ) : <div className="gewicht-wachten">Wachten op weegbrug...</div>}
                    </div>
                  </div>
                  <div className={`gewicht-kaart${gewichtLoods !== null ? " actief" : ""}`}>
                    <div className="gewicht-icon"><Icon name="scale" size={30} strokeWidth={1.75} /></div>
                    <div className="gewicht-info">
                      <div className="gewicht-bron">Loods schaal — live</div>
                      {gewichtLoods !== null ? (
                        <div>
                          <span className="gewicht-getal-groot">{gewichtLoods.toLocaleString("nl-NL")}</span>
                          <span className="gewicht-eenheid-groot"> kg</span>
                        </div>
                      ) : <div className="gewicht-wachten">Wachten op loods schaal...</div>}
                    </div>
                  </div>
                </div>
                <div className="kpi-row">
                  <div className="kpi-card"><div className="kpi-label">Wegingen vandaag</div><div className="kpi-value">{vandaag.length}</div><div className="kpi-sub">vrachten geregistreerd</div></div>
                  <div className="kpi-card"><div className="kpi-label">Totaal gewicht</div><div className="kpi-value">{(totaalKg / 1000).toFixed(1)}<span style={{ fontSize: 16, color: "var(--muted)" }}>t</span></div><div className="kpi-sub">alle wegingen</div></div>
                  <div className="kpi-card"><div className="kpi-label">Totale omzet</div><div className="kpi-value" style={{ fontSize: 22 }}>€ {totaalOmzet.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="kpi-sub">{bonOmzet.length} bon(nen) opgeslagen · vandaag € {omzetVandaag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                  <div className="kpi-card"><div className="kpi-label">Klanten in DB</div><div className="kpi-value">{klanten.length}</div><div className="kpi-sub">{getZakelijk(klanten).length} zakelijk · {getParticulier(klanten).length} particulier</div></div>
                </div>
                <div className="two-col">
                  <div className="panel">
                    <div className="panel-header">
                      <span className="panel-title">Recente wegingen</span>
                      <span className="badge">{wegingen.length > 0 ? "live" : "leeg"}</span>
                    </div>
                    {wegingen.length === 0 ? (
                      <div style={{ padding: "24px 20px", color: "var(--muted)", fontSize: 13 }}>
                        Nog geen wegingen geregistreerd.
                      </div>
                    ) : (
                      <table>
                        <thead><tr><th>Tijd</th><th>Klant</th><th>Richting</th><th>Materiaal</th><th>Gewicht</th></tr></thead>
                        <tbody>
                          {wegingen.slice(0, 8).map((w, index) => (
                            <tr key={w.id + "_" + index} className={w.isNieuw ? "new-row" : ""}>
                              <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.tijd}</td>
                              <td style={{ fontSize: 12 }}>{w.klantNaam || "—"}</td>
                              <td className={w.richting === "uitgaand" ? "richting-uitgaand" : w.richting === "inkomend" ? "richting-inkomend" : ""} style={{ fontSize: 12 }}>
                                {w.richting === "uitgaand" ? "↑ Uitgaand" : w.richting === "inkomend" ? "↓ Inkomend" : "—"}
                              </td>
                              <td><span className={`tag ${w.materiaal.tag}`}>{w.materiaal.naam}</span></td>
                              <td className="mono">{w.gewicht.toLocaleString("nl-NL")} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="panel">
                    <div className="panel-header"><span className="panel-title">Huidige prijzen</span>{kanPrijzen && <button className="save-btn" onClick={() => setPagina("prijzen")}>Bewerken</button>}</div>
                    <div className="dashboard-prijzen-kolommen">
                      <div>
                        <div className="prijzen-kolom-titel">Inkoop</div>
                        <div className="price-list">
                          {MATERIALEN.map(m => (
                            <div key={m.id} className="price-item">
                              <div className="price-item-left">
                                <div className="price-dot" style={{ background: m.kleur }} />
                                <span className="price-name">{m.naam}</span>
                              </div>
                              <div className="price-waarde">
                                <span className="mono" style={{ fontSize: 14, color: "var(--accent2)" }}>€ {prijzen[m.id]}</span>
                                <span className="price-unit">/kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="prijzen-kolom-titel">Opbrengst</div>
                        <div className="price-list">
                          {MATERIALEN.map(m => (
                            <div key={m.id} className="price-item">
                              <div className="price-item-left">
                                <div className="price-dot" style={{ background: m.kleur }} />
                                <span className="price-name">{m.naam}</span>
                              </div>
                              <div className="price-waarde">
                                <span className="mono" style={{ fontSize: 14, color: "var(--green)" }}>€ {opbrengst[m.id]}</span>
                                <span className="price-unit">/kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {pagina === "calculator" && <Calculator />}
            {pagina === "wegingen" && (
              <div className="panel">
                <div className="panel-header"><span className="panel-title">Alle wegingen</span><span className="badge">{wegingen.length} records</span></div>
                <table>
                  <thead><tr><th>Datum</th><th>Tijd</th><th>Klant</th><th>Richting</th><th>Materiaal</th><th>Gewicht</th><th>Bron</th></tr></thead>
                  <tbody>
                    {wegingen.map((w, index) => (
                      <tr key={w.id + "_" + index} className={w.isNieuw ? "new-row" : ""}>
                        <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.datum}</td>
                        <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.tijd}</td>
                        <td style={{ fontSize: 12 }}>{w.klantNaam || "—"}</td>
                        <td className={w.richting === "uitgaand" ? "richting-uitgaand" : w.richting === "inkomend" ? "richting-inkomend" : ""} style={{ fontSize: 12 }}>{w.richting === "uitgaand" ? "Uitgaand" : w.richting === "inkomend" ? "Inkomend" : "—"}</td>
                        <td><span className={`tag ${w.materiaal.tag}`}>{w.materiaal.naam}</span></td>
                        <td className="mono">{w.gewicht.toLocaleString("nl-NL")} kg</td>
                        <td><span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{w.bron}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pagina === "prijzen" && kanPrijzen && (
              <div className="prijzen-grid">
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Opbrengst</span>
                    <button className="save-btn" onClick={slaOp}>Opslaan</button>
                  </div>
                  <p className="prijzen-hint">Verkoopprijs — inkoopprijzen worden automatisch {Math.round(OPBRENGST_KORTING * 100)}% lager berekend.</p>
                  <div className="price-list" style={{ padding: 16 }}>
                    {MATERIALEN.map(m => (
                      <div key={m.id} className="price-item" style={{ marginBottom: 10 }}>
                        <div className="price-item-left">
                          <div className="price-dot" style={{ background: m.kleur, width: 10, height: 10 }} />
                          <span className="price-name" style={{ fontSize: 14 }}>{m.naam}</span>
                        </div>
                        <div className="price-input-wrap">
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>€</span>
                          <input className="price-input" type="number" step="0.01" min="0"
                            value={tempOpbrengst[m.id] ?? ""}
                            onChange={e => wijzigOpbrengst(m.id, e.target.value)} />
                          <span className="price-unit">/ kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Inkoop</span>
                    <span className="badge">−{Math.round(OPBRENGST_KORTING * 100)}% van opbrengst</span>
                  </div>
                  <p className="prijzen-hint">Klantprijs — automatisch berekend, gebruikt voor bonnen en wegingen.</p>
                  <div className="price-list" style={{ padding: 16 }}>
                    {MATERIALEN.map(m => (
                      <div key={m.id} className="price-item price-item-berekend" style={{ marginBottom: 10 }}>
                        <div className="price-item-left">
                          <div className="price-dot" style={{ background: m.kleur, width: 10, height: 10 }} />
                          <span className="price-name" style={{ fontSize: 14 }}>{m.naam}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="mono" style={{ fontSize: 14, color: "var(--accent2)" }}>
                            € {tempPrijzen[m.id] ?? "—"}
                          </span>
                          <span className="price-unit">/ kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {pagina === "rapport" && (
              <RapportPagina wegingen={wegingen} materialen={MATERIALEN} />
            )}
            {pagina === "bon" && (
              <BonBouwer
                prijzen={prijzen}
                wegingen={wegingen}
                klanten={klanten}
                bedrijfsnaam={bedrijf?.bedrijfsnaam || PRODUCT_NAAM}
              />
            )}
            {pagina === "wegen" && (
              <WeegPagina
                gewichtWeegbrug={gewichtWeegbrug}
                gewichtLoods={gewichtLoods}
                serverVerbonden={serverVerbonden}
                onWeging={verstuurWeging}
                wegingen={wegingen}
                prijzen={prijzen}
                opbrengst={opbrengst}
                klanten={klanten}
                setKlanten={setKlanten}
                bedrijfsnaam={bedrijf?.bedrijfsnaam || PRODUCT_NAAM}
                stoplichtKleur={stoplicht.kleur}
                stoplichtEnabled={stoplicht.enabled}
                onStoplicht={bedienStoplicht}
              />
            )}
            {pagina === "import" && (
              <div className="panel">
                <div className="panel-header"><span className="panel-title">XML-bestand importeren</span><span className="badge">XML-import</span></div>
                <div style={{ padding: 20 }}><XMLImport onImport={importeerWegingen} /></div>
              </div>
            )}
            {pagina === "formulieren" && (
              <FormulierenPagina klanten={klanten} bedrijfsnaam={bedrijf?.bedrijfsnaam || ""} />
            )}
            {LMA_INGESCHAKELD && pagina === "afvalstromen" && (
              <AfvalstromenPagina klanten={klanten} bedrijf={bedrijf} />
            )}
            {LMA_INGESCHAKELD && pagina === "lma" && (
              <LMAPagina wegingen={wegingen} bedrijf={bedrijf} klanten={klanten} />
            )}
            {pagina === "instellingen" && (
              <InstellingenPagina
                bedrijf={bedrijf}
                onBijgewerkt={(cfg) => {
                  setBedrijf(cfg);
                  pasThemaToe(cfg);
                  document.title = `${PRODUCT_NAAM} | ${cfg.bedrijfsnaam}`;
                }}
                onToast={toonToast}
              />
            )}
          </div>
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
