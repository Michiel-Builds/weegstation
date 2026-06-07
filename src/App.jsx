import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

import { MATERIALEN, INIT_PRIJZEN } from "./data/stamdata";
import { initWegingen } from "./utils/helpers";
import { getInitKlanten, getZakelijk, getParticulier } from "./data/klanten";

import LoginScherm from "./components/LoginScherm";
import ChauffeurScherm from "./components/ChauffeurScherm";
import WeegPagina from "./components/WeegPagina";
import XMLImport from "./components/XMLImport";
import BonBouwer from "./components/BonBouwer";
import BarChart from "./components/BarChart";
import Calculator from "./components/Calculator";
import KlantenSidebar from "./components/KlantenSidebar";
import MultiWindowButtons from "./components/MultiWindowButtons";

const WEGINGEN_LS_KEY = "newton-wegingen";

function laadWegingenUitLS() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WEGINGEN_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function bewaarWegingenInLS(wegingen) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(WEGINGEN_LS_KEY, JSON.stringify(wegingen)); } catch (e) {}
}

export default function App() {
  const [gebruiker, setGebruiker] = useState(null);
  const [pagina, setPagina] = useState("dashboard");
  const [wegingen, setWegingen] = useState(() => laadWegingenUitLS());
  const [prijzen, setPrijzen] = useState(INIT_PRIJZEN);
  const [tempPrijzen, setTempPrijzen] = useState(INIT_PRIJZEN);
  const [toast, setToast] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [rapTab, setRapTab] = useState("kg");
  const [gewichtWeegbrug, setGewichtWeegbrug] = useState(null);
  const [gewichtLoods, setGewichtLoods] = useState(null);
  const [serverVerbonden, setServerVerbonden] = useState(false);
  const [serverIP, setServerIP] = useState("localhost");
  const [simulatieModus, setSimulatieModus] = useState(false);

  const [klanten, setKlanten] = useState(() => getInitKlanten());
  const wsRef = useRef(null);

  useEffect(() => {
    document.title = "NewTon+ v1.1.1 | Metaalrecycling Bulters";
  }, []);

  useEffect(() => {
    if (!gebruiker) return;
    const isLokaal = typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
       window.location.hostname === "127.0.0.1" ||
       /^192\.168\./.test(window.location.hostname));
    if (!isLokaal) { 
      console.warn("WAARSCHUWING: App draait niet lokaal. Server-verbinding uitgeschakeld."); 
      activeerSimulatie(); 
      return; 
    }
    function verbindServer(ip) {
      let ws;
      try { 
        ws = new WebSocket(`ws://${ip}:3000`); 
      } catch (e) { 
        console.error("WebSocket constructie fout:", e);
        activeerSimulatie(); 
        return; 
      }
      wsRef.current = ws;
      ws.onopen = () => { 
        console.log("✓ Server verbonden op ws://" + ip + ":3000");
        setServerVerbonden(true); 
        setSimulatieModus(false); 
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
          }
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
        setTimeout(() => gebruiker && verbindServer(ip), 5000); 
      };
      ws.onerror = (err) => { 
        console.error("WebSocket fout:", err);
        setServerVerbonden(false); 
        activeerSimulatie(); 
        toonToast("⚠ Server niet bereikbaar - Simulatie modus"); 
      };
    }
    verbindServer(serverIP);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [gebruiker, serverIP]);

  useEffect(() => {
    bewaarWegingenInLS(wegingen);
  }, [wegingen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (e.key === WEGINGEN_LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setWegingen(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function activeerSimulatie() {
    console.warn("⚠ SIMULATIE MODUS GEACTIVEERD - Gewichten zijn demo data!");
    if (wegingen.length === 0) {
      const initData = initWegingen();
      setWegingen(initData);
      bewaarWegingenInLS(initData);
    }
    setSimulatieModus(true);
    let gew = 0; let richting = 1;
    const sim = setInterval(() => {
      if (!gebruiker) { clearInterval(sim); return; }
      gew += richting * (Math.random() * 150 + 30);
      if (gew > 10000) richting = -1;
      if (gew < 0) { gew = 0; richting = 1; }
      setGewichtWeegbrug(Math.round(gew / 20) * 20);
    }, 600);
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
  function slaOp() { setPrijzen({ ...tempPrijzen }); toonToast("Prijzen opgeslagen ✓"); }
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
  const totaalOmzet = wegingen.reduce((s, w) => s + w.gewicht * parseFloat(prijzen[w.materiaal.id] || 0), 0);
  const vandaag = wegingen.filter(w => w.datum === new Date().toLocaleDateString("nl-NL"));
  const kanPrijzen = gebruiker && (gebruiker.rol === "Admin" || gebruiker.rol === "Prijzen");

  if (!gebruiker) return <LoginScherm onLogin={setGebruiker} />;
  if (gebruiker.rol === "Chauffeur") return (
    <>
      <ChauffeurScherm
        gebruiker={gebruiker}
        onLogout={() => setGebruiker(null)}
        gewichtWeegbrug={gewichtWeegbrug}
        gewichtLoods={gewichtLoods}
        simulatieModus={simulatieModus}
        onWeging={verstuurWeging}
      />
      {toast && <div className="toast">{toast}</div>}
    </>
  );

  const navItems = [
    { key: "dashboard", icon: "🟢", label: "Dashboard" },
    { key: "calculator", icon: "🧮", label: "Calculator" },
    { key: "wegen", icon: "✓", label: "Wegen" },
    { key: "bon", icon: "📄", label: "Bon maken" },
    { key: "wegingen", icon: "☰", label: "Overzicht" },
    ...(kanPrijzen ? [{ key: "prijzen", icon: "€", label: "Prijzen" }] : []),
    { key: "rapport", icon: "📊", label: "Rapport" },
    { key: "import", icon: "📥", label: "XML Import" },
  ];

  const titels = {
    dashboard: "Dashboard",
    calculator: "Calculator",
    wegingen: "Wegingen",
    prijzen: "Prijsbeheer",
    rapport: "Rapportage",
    import: "XML Import"
  };

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-label">Metaalrecycling Bulters</div>
            <div className="logo-name">NewTon+</div>
          </div>
          <nav className="nav">
            {navItems.map(item => (
              <button
                key={item.key}
                className={`nav-item${pagina === item.key ? " active" : ""}`}
                onClick={() => setPagina(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === "dashboard" && <span className="live-dot" />}
              </button>
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
            <div className="topbar-center">Metaalrecycling Bulters</div>
            <div className="topbar-right">
              <MultiWindowButtons />
              <div className="status-pill">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                {serverVerbonden ? "Live" : simulatieModus ? "Simulatie" : "Offline"}
              </div>
              <span className="last-update">Bijgewerkt: {lastUpdate.toLocaleTimeString("nl-NL")}</span>
            </div>
          </div>
          <div className="content">
            {pagina === "dashboard" && (
              <>
                <div className="server-balk">
                  <div className={`server-dot ${serverVerbonden ? "verbonden" : simulatieModus ? "simulatie" : "verbroken"}`} />
                  <span style={{ color: serverVerbonden ? "var(--green)" : simulatieModus ? "#d4b84a" : "var(--red)" }}>
                    {serverVerbonden ? "Live verbonden met weegserver" : simulatieModus ? "Simulatiemodus (server niet bereikbaar)" : "Verbinding verbroken — herverbinden..."}
                  </span>
                  {!serverVerbonden && (
                    <input
                      className="server-ip-input"
                      value={serverIP}
                      onChange={e => setServerIP(e.target.value)}
                      placeholder="192.168.1.100"
                    />
                  )}
                </div>
                <div className="live-gewicht-balk">
                  <div className={`gewicht-kaart${gewichtWeegbrug !== null ? " actief" : ""}`}>
                    <div className="gewicht-icon">🚛</div>
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
                    <div className="gewicht-icon">⚖</div>
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
                  <div className="kpi-card"><div className="kpi-label">Totale omzet</div><div className="kpi-value" style={{ fontSize: 22 }}>€ {totaalOmzet.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}</div><div className="kpi-sub">op basis van prijzen</div></div>
                  <div className="kpi-card"><div className="kpi-label">Klanten in DB</div><div className="kpi-value">{klanten.length}</div><div className="kpi-sub">{getZakelijk(klanten).length} zakelijk · {getParticulier(klanten).length} particulier</div></div>
                </div>
                <div className="two-col">
                  <div className="panel">
                    <div className="panel-header"><span className="panel-title">Recente wegingen</span><span className="badge">live</span></div>
                    <table>
                      <thead><tr><th>Tijd</th><th>Kenteken</th><th>Materiaal</th><th>Gewicht</th><th>Waarde</th></tr></thead>
                      <tbody>
                        {wegingen.slice(0, 8).map((w, index) => (
                          <tr key={w.id + "_" + index} className={w.isNieuw ? "new-row" : ""}>
                            <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.tijd}</td>
                            <td className="mono" style={{ fontSize: 12 }}>{w.kenteken}</td>
                            <td><span className={`tag ${w.materiaal.tag}`}>{w.materiaal.naam}</span></td>
                            <td className="mono">{w.gewicht.toLocaleString("nl-NL")} kg</td>
                            <td className="mono" style={{ color: "var(--accent2)" }}>€ {(w.gewicht * parseFloat(prijzen[w.materiaal.id] || 0)).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel">
                    <div className="panel-header"><span className="panel-title">Huidige prijzen</span>{kanPrijzen && <button className="save-btn" onClick={() => setPagina("prijzen")}>Bewerken</button>}</div>
                    <div className="price-list">
                      {MATERIALEN.map(m => (
                        <div key={m.id} className="price-item">
                          <div className="price-item-left">
                            <div className="price-dot" style={{ background: m.kleur }} />
                            <span className="price-name">{m.naam}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span className="mono" style={{ fontSize: 14, color: "var(--accent2)" }}>€ {prijzen[m.id]}</span>
                            <span className="price-unit">/kg</span>
                          </div>
                        </div>
                      ))}
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
                  <thead><tr><th>Datum</th><th>Tijd</th><th>Kenteken</th><th>Materiaal</th><th>Gewicht</th><th>Prijs/kg</th><th>Totaalwaarde</th><th>Bron</th></tr></thead>
                  <tbody>
                    {wegingen.map((w, index) => (
                      <tr key={w.id + "_" + index} className={w.isNieuw ? "new-row" : ""}>
                        <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.datum}</td>
                        <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{w.tijd}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{w.kenteken}</td>
                        <td><span className={`tag ${w.materiaal.tag}`}>{w.materiaal.naam}</span></td>
                        <td className="mono">{w.gewicht.toLocaleString("nl-NL")} kg</td>
                        <td className="mono" style={{ color: "var(--muted)" }}>€ {prijzen[w.materiaal.id] || "–"}</td>
                        <td className="mono" style={{ color: "var(--accent2)", fontWeight: 600 }}>€ {(w.gewicht * parseFloat(prijzen[w.materiaal.id] || 0)).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td><span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{w.bron}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pagina === "prijzen" && kanPrijzen && (
              <div style={{ maxWidth: 480 }}>
                <div className="panel">
                  <div className="panel-header"><span className="panel-title">Prijs per materiaalsoort</span><button className="save-btn" onClick={slaOp}>Opslaan</button></div>
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
                            value={tempPrijzen[m.id]}
                            onChange={e => setTempPrijzen(p => ({ ...p, [m.id]: e.target.value }))} />
                          <span className="price-unit">/ kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {pagina === "rapport" && (
              <div className="panel">
                <div className="panel-header"><span className="panel-title">Overzicht per materiaal</span></div>
                <div className="rapport-tabs">
                  <button className={`rtab${rapTab === "kg" ? " active" : ""}`} onClick={() => setRapTab("kg")}>Gewicht (kg)</button>
                  <button className={`rtab${rapTab === "omzet" ? " active" : ""}`} onClick={() => setRapTab("omzet")}>Omzet (€)</button>
                </div>
                <BarChart wegingen={wegingen} prijzen={prijzen} periode={rapTab} />
                <div style={{ padding: "0 20px 20px" }}>
                  <table style={{ marginTop: 8 }}>
                    <thead><tr><th>Materiaal</th><th>Vrachten</th><th>Totaal gewicht</th><th>Prijs/kg</th><th>Totale omzet</th></tr></thead>
                    <tbody>
                      {MATERIALEN.map(m => {
                        const rijen = wegingen.filter(w => w.materiaal.id === m.id);
                        const kg = rijen.reduce((s, w) => s + w.gewicht, 0);
                        const omzet = kg * parseFloat(prijzen[m.id] || 0);
                        return (
                          <tr key={m.id}>
                            <td><span className={`tag ${m.tag}`}>{m.naam}</span></td>
                            <td className="mono">{rijen.length}</td>
                            <td className="mono">{kg.toLocaleString("nl-NL")} kg</td>
                            <td className="mono">€ {prijzen[m.id]}</td>
                            <td className="mono" style={{ color: "var(--accent2)", fontWeight: 600 }}>€ {omzet.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {pagina === "bon" && <BonBouwer prijzen={prijzen} wegingen={wegingen} klanten={klanten} />}
            {pagina === "wegen" && (
              <WeegPagina
                gewichtWeegbrug={gewichtWeegbrug}
                gewichtLoods={gewichtLoods}
                serverVerbonden={serverVerbonden}
                simulatieModus={simulatieModus}
                onWeging={verstuurWeging}
                wegingen={wegingen}
                prijzen={prijzen}
                klanten={klanten}
              />
            )}
            {pagina === "import" && (
              <div className="panel">
                <div className="panel-header"><span className="panel-title">XML-bestand importeren</span><span className="badge">NewTon XML-module</span></div>
                <div style={{ padding: 20 }}><XMLImport onImport={importeerWegingen} /></div>
              </div>
            )}
          </div>
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
