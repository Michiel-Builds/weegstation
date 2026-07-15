import { useState } from "react";
import {
  berekenKlantRapport, filterBonOmzetPeriode, berekenTotaalAftrek,
} from "../utils/bonOmzet";

function fmtKg(n) {
  return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 }) + " kg";
}
function fmtEuro(n) {
  return "€ " + Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function KlantRapportPagina({ bonOmzet = [], klanten = [] }) {
  const [periode, setPeriode] = useState("maand");
  const [geselecteerd, setGeselecteerd] = useState(null);

  const rapport = berekenKlantRapport(bonOmzet, { periode, alleenZakelijk: true });
  const gefilterd = filterBonOmzetPeriode(bonOmzet, periode).filter(b => b.klantType === "bedrijf");
  const totaalAftrek = berekenTotaalAftrek(gefilterd);
  const totaalOmzet = gefilterd.reduce((s, b) => s + (parseFloat(b.totaalEuro) || 0), 0);

  const detail = geselecteerd
    ? rapport.find(r => (r.klantId != null ? r.klantId === geselecteerd.klantId : r.klantNaam === geselecteerd.klantNaam))
    : null;

  const klantInfo = detail?.klantId
    ? klanten.find(k => k.id === detail.klantId)
    : klanten.find(k => k.type === "zakelijk" && k.naam === detail?.klantNaam);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Klantenrapport</span>
        <span className="badge">Alleen zakelijk</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { key: "vandaag", label: "Vandaag" },
            { key: "maand", label: "Deze maand" },
            { key: "jaar", label: "Dit jaar" },
            { key: "alles", label: "Alles" },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              className={`thema-btn${periode === p.key ? " actief" : ""}`}
              onClick={() => { setPeriode(p.key); setGeselecteerd(null); }}
            >{p.label}</button>
          ))}
        </div>

        <div className="kpi-row" style={{ marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-label">Zakelijke klanten</div>
            <div className="kpi-value">{rapport.length}</div>
            <div className="kpi-sub">met bonnen in periode</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Omzet (zakelijk)</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{fmtEuro(totaalOmzet)}</div>
            <div className="kpi-sub">{gefilterd.length} bon(nen)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Totaal vuil aftrek</div>
            <div className="kpi-value">{fmtKg(totaalAftrek)}</div>
            <div className="kpi-sub">op bonnen in periode</div>
          </div>
        </div>

        {rapport.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
            Geen zakelijke bonnen in deze periode.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 1fr" : "1fr", gap: 20 }}>
            <table style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th>Klant</th>
                  <th>Bonnen</th>
                  <th>Netto kg</th>
                  <th>Vuil aftrek</th>
                  <th>Omzet</th>
                </tr>
              </thead>
              <tbody>
                {rapport.map(r => (
                  <tr
                    key={(r.klantId ?? r.klantNaam) + periode}
                    onClick={() => setGeselecteerd(r)}
                    style={{
                      cursor: "pointer",
                      background: geselecteerd?.klantNaam === r.klantNaam && geselecteerd?.klantId === r.klantId
                        ? "rgba(46,125,50,0.08)" : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{r.klantNaam}</td>
                    <td className="mono">{r.bonnen}</td>
                    <td className="mono">{fmtKg(r.nettoKg)}</td>
                    <td className="mono">{fmtKg(r.aftrekKg)}</td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent2)" }}>{fmtEuro(r.omzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail && (
              <div style={{
                padding: 16, background: "var(--surface2)", borderRadius: 8,
                border: "1px solid var(--border)", alignSelf: "start",
              }}>
                <h3 style={{ margin: "0 0 8px" }}>{detail.klantNaam}</h3>
                {klantInfo && (
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
                    {[klantInfo.plaats, klantInfo.kvk ? "KvK " + klantInfo.kvk : ""].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  <div><span style={{ fontSize: 11, color: "var(--muted)" }}>Omzet</span><div className="mono" style={{ fontWeight: 700 }}>{fmtEuro(detail.omzet)}</div></div>
                  <div><span style={{ fontSize: 11, color: "var(--muted)" }}>Bonnen</span><div className="mono">{detail.bonnen}</div></div>
                  <div><span style={{ fontSize: 11, color: "var(--muted)" }}>Netto kg</span><div className="mono">{fmtKg(detail.nettoKg)}</div></div>
                  <div><span style={{ fontSize: 11, color: "var(--muted)" }}>Vuil aftrek</span><div className="mono">{fmtKg(detail.aftrekKg)}</div></div>
                </div>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Per materiaal</h4>
                {detail.materialen.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>Geen materiaalregels.</p>
                ) : (
                  <table style={{ width: "100%", fontSize: 13 }}>
                    <thead>
                      <tr><th>Materiaal</th><th>Netto</th><th>Vuil</th></tr>
                    </thead>
                    <tbody>
                      {detail.materialen.map(m => (
                        <tr key={m.naam}>
                          <td>{m.naam}</td>
                          <td className="mono">{fmtKg(m.nettoKg)}</td>
                          <td className="mono">{fmtKg(m.aftrekKg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
