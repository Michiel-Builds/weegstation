import { useState } from "react";
import { MATERIALEN } from "../data/stamdata";
import { maakBonnummer, printBon } from "../utils/helpers";

export default function WeegPagina({
  gewichtWeegbrug, gewichtLoods,
  serverVerbonden, simulatieModus,
  onWeging, wegingen, prijzen,
}) {
  const [kenteken, setKenteken]         = useState("");
  const [materiaal, setMateriaal]       = useState(null);
  const [gebruikLoods, setGebruikLoods] = useState(false);
  const [bevestigd, setBevestigd]       = useState(null);
  const [bezig, setBezig]               = useState(false);

  const gewicht = gebruikLoods ? gewichtLoods : gewichtWeegbrug;
  const stabiel = gewicht !== null && gewicht > 20;

  function vastleggen() {
    if (!kenteken.trim() || !materiaal || !stabiel || bezig) return;
    setBezig(true);
    const weging = {
      id:        Date.now(),
      bonnummer: maakBonnummer(),
      kenteken:  kenteken.trim().toUpperCase(),
      materiaal, gewicht,
      prijs:     parseFloat(prijzen[materiaal.id] || 0),
      totaal:    gewicht * parseFloat(prijzen[materiaal.id] || 0),
      tijd:  new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      datum: new Date().toLocaleDateString("nl-NL"),
      bron:  gebruikLoods ? "loods" : "weegbrug",
      isNieuw: true,
    };
    onWeging(weging);
    setBevestigd(weging);
    setBezig(false);
  }

  const kanVastleggen = kenteken.trim().length >= 3 && materiaal && stabiel && !bezig && !bevestigd;

  return (
    <div className="weeg-pagina">
      <div className="weeg-paneel">
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">⚖ Weging vastleggen</span>
          <span className="badge">
            {simulatieModus ? "simulatie" : serverVerbonden ? "live" : "offline"}
          </span>
        </div>
        <div className="weeg-paneel-body">
          <div className={`weeg-live-display${stabiel ? " stabiel" : ""}`}>
            <div className="weeg-live-bron">
              {gebruikLoods ? "Loods weegschaal" : "Weegbrug"} — live
            </div>
            {gewicht !== null ? (
              <div>
                <span className="weeg-live-getal">{gewicht.toLocaleString("nl-NL")}</span>
                <span className="weeg-live-eenheid"> kg</span>
              </div>
            ) : (
              <div style={{ fontSize: 18, color: "var(--muted)", fontFamily: "var(--mono)", padding: "12px 0" }}>
                Wachten op gewicht...
              </div>
            )}
            <div className="weeg-live-status">
              {stabiel ? "✓ Stabiel gewicht" : gewicht !== null ? "⟳ Stabiliseert..." : "Geen verbinding"}
            </div>
          </div>
          <div className="weeg-bron-keuze">
            <button className={`weeg-bron-btn${!gebruikLoods ? " actief" : ""}`} onClick={() => setGebruikLoods(false)}>
              🚛 Weegbrug {gewichtWeegbrug !== null ? `(${gewichtWeegbrug.toLocaleString("nl-NL")} kg)` : ""}
            </button>
            <button className={`weeg-bron-btn${gebruikLoods ? " actief" : ""}`} onClick={() => setGebruikLoods(true)}>
              ⚖ Loods schaal {gewichtLoods !== null ? `(${gewichtLoods.toLocaleString("nl-NL")} kg)` : ""}
            </button>
          </div>
          <div className="weeg-veld">
            <label className="weeg-veld-label">Kenteken voertuig</label>
            <input
              className="weeg-veld-input"
              placeholder="NL-AB-123"
              value={kenteken}
              onChange={e => setKenteken(e.target.value)}
              onKeyDown={e => e.key === "Enter" && kanVastleggen && vastleggen()}
              maxLength={10}
              autoFocus
            />
          </div>
          <div className="weeg-veld">
            <label className="weeg-veld-label">Materiaalsoort</label>
            <div className="weeg-mat-grid">
              {MATERIALEN.map(m => (
                <button
                  key={m.id}
                  className={`weeg-mat-btn${materiaal?.id === m.id ? " actief" : ""}`}
                  onClick={() => setMateriaal(m)}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.kleur, flexShrink: 0 }} />
                  <span className="weeg-mat-naam">{m.naam}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                    € {prijzen[m.id]}/kg
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button className="weeg-vastleg-btn" onClick={vastleggen} disabled={!kanVastleggen}>
            {bezig ? "Vastleggen..." : "✓ Weging vastleggen"}
          </button>
          {bevestigd && (
            <div className="weeg-bevestiging">
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>Weging vastgelegd!</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 4 }}>
                Bon {bevestigd.bonnummer}
              </div>
              <div style={{ fontSize: 13, fontFamily: "var(--mono)", marginBottom: 2 }}>
                {bevestigd.kenteken} · {bevestigd.materiaal.naam} · {bevestigd.gewicht.toLocaleString("nl-NL")} kg
              </div>
              <div style={{ fontSize: 15, color: "var(--accent2)", fontWeight: 700, fontFamily: "var(--mono)", marginBottom: 16 }}>
                € {bevestigd.totaal.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => printBon(bevestigd)}
                  style={{ flex: 2, padding: "10px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)" }}
                >🖨 Bon afdrukken</button>
                <button
                  onClick={() => { setKenteken(""); setMateriaal(null); setBevestigd(null); }}
                  style={{ flex: 1, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}
                >Volgende</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="weeg-paneel">
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">Vandaag vastgelegd</span>
          <span className="badge">
            {wegingen.filter(w => w.datum === new Date().toLocaleDateString("nl-NL")).length} wegingen
          </span>
        </div>
        <div className="weeg-recente">
          <table>
            <thead>
              <tr><th>Tijd</th><th>Kenteken</th><th>Materiaal</th><th>Gewicht</th><th>Waarde</th></tr>
            </thead>
            <tbody>
              {wegingen.filter(w => w.datum === new Date().toLocaleDateString("nl-NL")).slice(0, 20).map(w => (
                <tr key={w.id} className={w.isNieuw ? "new-row" : ""}>
                  <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{w.tijd}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{w.kenteken}</td>
                  <td><span className={`tag ${w.materiaal.tag}`}>{w.materiaal.naam}</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{w.gewicht.toLocaleString("nl-NL")} kg</td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--accent2)" }}>
                    € {(w.gewicht * parseFloat(prijzen[w.materiaal.id] || 0)).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
