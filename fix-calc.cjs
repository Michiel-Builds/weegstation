const fs = require("fs");

const calcPath = "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/components/Calculator.jsx";
const calcContent = 'import { useState } from "react";\n' +
'import { MATERIALEN, INIT_PRIJZEN } from "../data/stamdata";\n' +
'\n' +
'export default function Calculator() {\n' +
'  const [prijzen] = useState(INIT_PRIJZEN);\n' +
'  const [materiaalId, setMateriaalId] = useState(MATERIALEN[0].id);\n' +
'  const [gewicht, setGewicht] = useState(0);\n' +
'  const [margePct, setMargePct] = useState(0);\n' +
'  const [btwPct, setBtwPct] = useState(21);\n' +
'  const [kosten, setKosten] = useState(0);\n' +
'\n' +
'  const materiaal = MATERIALEN.find(m => m.id === materiaalId);\n' +
'  const prijsPerKg = parseFloat(prijzen[materiaalId]) || 0;\n' +
'\n' +
'  const subtotaal = prijsPerKg * gewicht;\n' +
'  const margeBedrag = subtotaal * (margePct / 100);\n' +
'  const naMarge = subtotaal + margeBedrag;\n' +
'  const btwBedrag = naMarge * (btwPct / 100);\n' +
'  const eindprijs = naMarge + btwBedrag;\n' +
'  const netto = eindprijs - btwBedrag;\n' +
'  const winstmarge = netto - kosten;\n' +
'\n' +
'  return (\n' +
'    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>\n' +
'      <div className="weeg-paneel">\n' +
'        <div className="weeg-paneel-header">\n' +
'          <span className="weeg-paneel-title">Calculator</span>\n' +
'          <span className="badge">Snelle prijsberekening</span>\n' +
'        </div>\n' +
'        <div style={{ padding: 16 }}>\n' +
'          <div className="weeg-veld">\n' +
'            <label className="weeg-veld-label">Materiaal</label>\n' +
'            <div className="weeg-mat-grid">\n' +
'              {MATERIALEN.map(m => (\n' +
'                <button\n' +
'                  key={m.id}\n' +
'                  className={"weeg-mat-btn" + (materiaalId === m.id ? " actief" : "")}\n' +
'                  onClick={() => setMateriaalId(m.id)}\n' +
'                >\n' +
'                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.kleur, flexShrink: 0 }} />\n' +
'                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.naam}</span>\n' +
'                </button>\n' +
'              ))}\n' +
'            </div>\n' +
'          </div>\n' +
'          <div className="weeg-veld">\n' +
'            <label className="weeg-veld-label">Gewicht (kg)</label>\n' +
'            <input\n' +
'              type="number"\n' +
'              min="0"\n' +
'              step="0.1"\n' +
'              value={gewicht || ""}\n' +
'              onChange={e => setGewicht(parseFloat(e.target.value) || 0)}\n' +
'              className="weeg-veld-input"\n' +
'              placeholder="bijv. 1500"\n' +
'              style={{ fontSize: 18 }}\n' +
'            />\n' +
'          </div>\n' +
'          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>\n' +
'            <div className="weeg-veld" style={{ marginBottom: 0 }}>\n' +
'              <label className="weeg-veld-label">Marge %</label>\n' +
'              <input\n' +
'                type="number"\n' +
'                min="0"\n' +
'                step="1"\n' +
'                value={margePct}\n' +
'                onChange={e => setMargePct(parseFloat(e.target.value) || 0)}\n' +
'                className="weeg-veld-input"\n' +
'                placeholder="0"\n' +
'              />\n' +
'            </div>\n' +
'            <div className="weeg-veld" style={{ marginBottom: 0 }}>\n' +
'              <label className="weeg-veld-label">BTW %</label>\n' +
'              <select\n' +
'                value={btwPct}\n' +
'                onChange={e => setBtwPct(parseFloat(e.target.value))}\n' +
'                className="weeg-veld-input"\n' +
'              >\n' +
'                <option value="0">0% (Verlegd)</option>\n' +
'                <option value="9">9% (Laag)</option>\n' +
'                <option value="21">21% (Hoog)</option>\n' +
'              </select>\n' +
'            </div>\n' +
'          </div>\n' +
'          <div className="weeg-veld" style={{ marginTop: 16 }}>\n' +
'            <label className="weeg-veld-label">Extra kosten (euro) — transport, verwerking</label>\n' +
'            <input\n' +
'              type="number"\n' +
'              min="0"\n' +
'              step="0.01"\n' +
'              value={kosten || ""}\n' +
'              onChange={e => setKosten(parseFloat(e.target.value) || 0)}\n' +
'              className="weeg-veld-input"\n' +
'              placeholder="0,00"\n' +
'            />\n' +
'          </div>\n' +
'        </div>\n' +
'      </div>\n' +
'      <div className="weeg-paneel">\n' +
'        <div className="weeg-paneel-header">\n' +
'          <span className="weeg-paneel-title">Resultaat</span>\n' +
'          <span className="badge">{materiaal.naam}</span>\n' +
'        </div>\n' +
'        <div style={{ padding: 16 }}>\n' +
'          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>\n' +
'            <span style={{ color: "var(--muted)" }}>Gewicht</span>\n' +
'            <span className="mono" style={{ fontWeight: 600 }}>{gewicht.toLocaleString("nl-NL")} kg</span>\n' +
'          </div>\n' +
'          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>\n' +
'            <span style={{ color: "var(--muted)" }}>Subtotaal ({gewicht} kg x euro {prijsPerKg.toFixed(2)})</span>\n' +
'            <span className="mono" style={{ fontWeight: 600 }}>euro {subtotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>\n' +
'          </div>\n' +
'          {margePct > 0 && (\n' +
'            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>\n' +
'              <span style={{ color: "var(--muted)" }}>+ Marge ({margePct}%)</span>\n' +
'              <span className="mono" style={{ color: "var(--accent2)" }}>euro {margeBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>\n' +
'            </div>\n' +
'          )}\n' +
'          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>\n' +
'            <span style={{ color: "var(--muted)" }}>+ BTW ({btwPct}%)</span>\n' +
'            <span className="mono">euro {btwBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>\n' +
'          </div>\n' +
'          <div style={{ marginTop: 14, padding: 16, background: "var(--surface2)", borderRadius: 10, border: "2px solid var(--accent)" }}>\n' +
'            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Eindprijs (incl. BTW)</div>\n' +
'            <div className="mono" style={{ fontSize: 28, fontWeight: 900, color: "var(--accent2)" }}>\n' +
'              euro {eindprijs.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n' +
'            </div>\n' +
'            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontFamily: "var(--mono)" }}>\n' +
'              waarvan euro {btwBedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BTW\n' +
'            </div>\n' +
'          </div>\n' +
'          <button\n' +
'            onClick={() => { setGewicht(0); setMargePct(0); setKosten(0); setBtwPct(21); }}\n' +
'            style={{ width: "100%", marginTop: 16, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}\n' +
'          >Reset</button>\n' +
'        </div>\n' +
'      </div>\n' +
'    </div>\n' +
'  );\n' +
'}\n';

fs.writeFileSync(calcPath, calcContent, "utf8");
console.log("OK Calculator.jsx aangemaakt");
