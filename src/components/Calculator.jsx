import { useState } from "react";
import { MATERIALEN, INIT_PRIJZEN } from "../data/stamdata";

export default function Calculator() {
  // Materialen + prijzen
  const [prijzen, setPrijzen] = useState(INIT_PRIJZEN);
  const [materiaalId, setMateriaalId] = useState(MATERIALEN[0].id);
  const [gewicht, setGewicht] = useState(0);

  // Extra opties
  const [margePct, setMargePct] = useState(0);
  const [btwPct, setBtwPct] = useState(21);
  const [kosten, setKosten] = useState(0); // verwijderingskosten / transport

  // Helpers
  const materiaal = MATERIALEN.find(m => m.id === materiaalId);
  const prijsPerKg = parseFloat(prijzen[materiaalId]) || 0;

  const subtotaal = prijsPerKg * gewicht;
  const margeBedrag = subtotaal * (margePct / 100);
  const naMarge = subtotaal + margeBedrag;
  const btwBedrag = naMarge * (btwPct / 100);
  const eindprijs = naMarge + btwBedrag;
  const netto = eindprijs - btwBedrag;
  const naKosten = netto - kosten;
  const winstmarge = naKosten;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* INVOER */}
      <div className="weeg-paneel">
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">🧮 Calculator</span>
          <span className="badge">Snelle prijsberekening</span>
        </div>
        <div style={{ padding: 16 }}>

          <div className="weeg-veld">
            <label className="weeg-veld-label">Materiaal</label>
            <div className="weeg-mat-grid">
              {MATERIALEN.map(m => (
                <button
                  key={m.id}
                  className={"weeg-mat-btn" + (materiaalId === m.id ? " actief" : "")}
                  onClick={() => setMateriaalId(m.id)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.kleur, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.naam}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="weeg-veld">
            <label className="weeg-veld-label">Gewicht (kg)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={gewicht || ""}
              onChange={e => setGewicht(parseFloat(e.target.value) || 0)}
              className="weeg-veld-input"
              placeholder="bijv. 1500"
              style={{ fontSize: 18 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div className="weeg-veld" style={{ marginBottom: 0 }}>
              <label className="weeg-veld-label">Marge %</label>
              <input
                type="number"
                min="0"
                step="1"
                value={margePct}
                onChange={e => setMargePct(parseFloat(e.target.value) || 0)}
                className="weeg-veld-input"
                placeholder="0"
              />
            </div>
            <div className="weeg-veld" style={{ marginBottom: 0 }}>
              <label className="weeg-veld-label">BTW %</label>
              <select
                value={btwPct}
                onChange={e => setBtwPct(parseFloat(e.target.value))}
                className="weeg-veld-input"
              >
                <option value="0">0% (Verlegd)</option>
                <option value="9">9% (Laag)</option>
                <option value="21">21% (Hoog)</option>
              </select>
            </div>
          </div>

          <div className="weeg-veld" style={{ marginTop: 16 }}>
            <label className="weeg-veld-label">Extra kosten (€) — transport, verwerking</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={kosten || ""}
              onChange={e => setKosten(parseFloat(e.target.value) || 0)}
              className="weeg-veld-input"
              placeholder="0,00"
            />
          </div>

          <div style={{ marginTop: 16, padding: 12, background: "var(--surface2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            <strong style={{ color: "var(--text)" }}>Prijs per kg:</strong> {materiaal.naam} = € {prijsPerKg.toFixed(2)}
          </div>
        </div>
      </div>

      {/* RESULTAAT */}
      <div className="weeg-paneel">
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">Resultaat</span>
          <span className="badge">{materiaal.naam}</span>
        </div>
        <div style={{ padding: 16 }}>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>Gewicht</span>
            <span className="mono" style={{ fontWeight: 600 }}>{gewicht.toLocaleString("nl-NL")} kg</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>Subtotaal ({gewicht} kg × € {prijsPerKg.toFixed(2)})</span>
            <span className="mono" style={{ fontWeight: 600 }}>€ {subtotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {margePct > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>+ Marge ({margePct}%)</span>
              <span className="mono" style={{ color: "var(--accent2)" }}>€ {margeBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>+ BTW ({btwPct}%)</span>
            <span className="mono">€ {btwBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style={{ marginTop: 14, padding: 16, background: "var(--surface2)", borderRadius: 10, border: "2px solid var(--accent)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Eindprijs (incl. BTW)</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 900, color: "var(--accent2)" }}>
              € {eindprijs.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontFamily: "var(--mono)" }}>
              waarvan € {btwBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BTW
            </div>
          </div>

          {kosten > 0 && (
            <div style={{ marginTop: 14, padding: 14, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                <span>Netto (excl. BTW)</span>
                <span className="mono">€ {netto.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                <span>− Extra kosten</span>
                <span className="mono" style={{ color: "var(--red)" }}>€ {kosten.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span>Winstmarge</span>
                <span className="mono" style={{ color: winstmarge >= 0 ? "var(--accent2)" : "var(--red)" }}>
                  € {winstmarge.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setGewicht(0);
              setMargePct(0);
              setKosten(0);
              setBtwPct(21);
            }}
            style={{ width: "100%", marginTop: 16, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}
          >Reset</button>
        </div>
      </div>
    </div>
  );
}
