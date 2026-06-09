import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

import { APP_NAAM, BEDRIJF_NAAM, MATERIALEN, INIT_PRIJZEN, INIT_OPBRENGST, OPBRENGST_KORTING } from "./data/stamdata";
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
import ChauffeurScherm from "./components/ChauffeurScherm";
import WeegPagina from "./components/WeegPagina";
import XMLImport from "./components/XMLImport";
import BonBouwer from "./components/BonBouwer";
import RapportPagina from "./components/RapportPagina";
import Calculator from "./components/Calculator";
import KlantenSidebar from "./components/KlantenSidebar";
import MultiWindowButtons from "./components/MultiWindowButtons";
import FormulierenPagina from "./components/FormulierenPagina";
import { laadServerIP, bewaarServerIP, magWeegserverVerbinden } from "./utils/weegserver";

import { WEGINGEN_LS_KEY, laadWegingenUitLS, bewaarWegingenInLS } from "./utils/wegingen";

export default function App() {
  const [gebruiker, setGebruiker] = useState(null);
  const [pagina, setPagina] = useState("dashboard");
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
  const [serverIP, setServerIP] = useState(() => laadServerIP());
  const [klanten, setKlanten] = useState(() => getInitKlanten());
  const wsRef = useRef(null);

  useEffect(() => {
    document.title = `${APP_NAAM} | ${BEDRIJF_NAAM}`;
  }, []);

  useEffect(() => {
    zorgVoorDagSnapshot(vandaagDatumKey(), opbrengst);
  }, []);

  useEffect(() => {
    if (!gebruiker) return;
    if (!magWeegserverVerbinden()) {
      console.warn("WAARSCHUWING: App draait niet in lokaal netwerk. Server-verbinding uitgeschakeld.");
      return;
    }
    function verbindServer(ip) {
      let ws;
      try {
        ws = new WebSocket(`ws://${ip}:3000`);
      } catch (e) {
        console.error("WebSocket constructie fout:", e);
        setServerVerbonden(false);
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        console.log("✓ Server verbonden op ws://" + ip + ":3000");
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
        toonToast("⚠ Server niet bereikbaar");
      };
    }
    verbindServer(serverIP);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [gebruiker, serverIP]);

  useEffect(() => {
    bewaarWegingenInLS(wegingen);
  }, [wegingen]);

  useEffect(() => {
    bewaarServerIP(serverIP);
  }, [serverIP]);

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
    window.addEventListener("newton-bon-omzet-update", verversBonOmzet);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("newton-bon-omzet-update", verversBonOmzet);
    };
  }, []);

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
    { key: "formulieren", icon: "📋", label: "Formulieren" },
  ];

  const titels = {
    dashboard: "Dashboard",
    calculator: "Calculator",
    wegingen: "Wegingen",
    prijzen: "Prijsbeheer",
    rapport: "Rapportage",
    import: "XML Import",
    formulieren: "Formulieren"
  };

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-label">{BEDRIJF_NAAM}</div>
            <div className="logo-name">{APP_NAAM}</div>
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
            <div className="topbar-center">{BEDRIJF_NAAM}</div>
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
                    {serverVerbonden ? "Live verbonden met weegserver" : "Verbinding verbroken — herverbinden..."}
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
            {pagina === "bon" && <BonBouwer prijzen={prijzen} wegingen={wegingen} klanten={klanten} />}
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
              />
            )}
            {pagina === "import" && (
              <div className="panel">
                <div className="panel-header"><span className="panel-title">XML-bestand importeren</span><span className="badge">XML-import</span></div>
                <div style={{ padding: 20 }}><XMLImport onImport={importeerWegingen} /></div>
              </div>
            )}
            {pagina === "formulieren" && <FormulierenPagina klanten={klanten} />}
          </div>
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
