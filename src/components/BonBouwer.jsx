import { useState } from "react";
import { MATERIALEN } from "../data/stamdata";
import { maakBonnummer, printBon } from "../utils/helpers";

export default function BonBouwer({ prijzen }) {
const [klant, setKlant]             = useState({
  naam: "", bedrijf: "", contactpersoon: "",
  adres: "", postcode: "", plaats: "",
  btw: "", kvk: "", email: "", telefoon: "",
  legitimatieType: "", legitimatieNummer: ""  // NIEUW
});
  const [bonRegels, setBonRegels]     = useState([]);
  const [bonnummer]                   = useState(maakBonnummer());
  const [invMat, setInvMat]           = useState(null);
  const [invKenteken, setInvKenteken] = useState("");
  const [invGewicht, setInvGewicht]   = useState("");
  const [klantType, setKlantType]     = useState("bedrijf");

  const totaalKg   = bonRegels.reduce((s, r) => s + r.gewicht, 0);
  const totaalEuro = bonRegels.reduce((s, r) => s + r.totaal, 0);

  function updateKlant(veld, waarde) {
    setKlant(prev => ({ ...prev, [veld]: waarde }));
  }

  function voegRegelToe() {
    if (!invMat || !invGewicht || parseFloat(invGewicht) <= 0) return;
    const gewicht = parseFloat(invGewicht);
    const prijs   = parseFloat(prijzen[invMat.id] || 0);
    setBonRegels(prev => [...prev, {
      id: Date.now(),
      kenteken: invKenteken.trim().toUpperCase() || "–",
      materiaal: invMat,
      gewicht, prijs, totaal: gewicht * prijs,
      tijd:  new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
      datum: new Date().toLocaleDateString("nl-NL"),
    }]);
    setInvGewicht(""); setInvKenteken(""); setInvMat(null);
  }

  function verwijderRegel(id) { setBonRegels(prev => prev.filter(r => r.id !== id)); }
  function nieuweBon()        { setBonRegels([]); setKlant({ naam: "", bedrijf: "", contactpersoon: "", adres: "", postcode: "", plaats: "", btw: "", kvk: "", email: "", telefoon: "" }); }
  function afdrukken()        { printBon({ bonnummer, klant, klantType, regels: bonRegels, totaalKg, totaalEuro }); }

  // Velden op basis van klantType
  const isBedrijf = klantType === "bedrijf";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
      <div className="weeg-paneel">
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">📄 Bon samenstellen</span>
          <span className="badge">{bonnummer}</span>
        </div>
        <div style={{ padding: 16 }}>

          {/* Klantgegevens */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setKlantType("bedrijf")}
                style={{
                  flex: 1, padding: "8px", borderRadius: 7,
                  border: "1px solid " + (isBedrijf ? "var(--accent2)" : "var(--border)"),
                  background: isBedrijf ? "rgba(46,125,50,0.1)" : "var(--surface2)",
                  color: isBedrijf ? "var(--accent2)" : "var(--muted)",
                  cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12
                }}
              >🏢 Bedrijf</button>
              <button
                onClick={() => setKlantType("particulier")}
                style={{
                  flex: 1, padding: "8px", borderRadius: 7,
                  border: "1px solid " + (!isBedrijf ? "var(--accent2)" : "var(--border)"),
                  background: !isBedrijf ? "rgba(46,125,50,0.1)" : "var(--surface2)",
                  color: !isBedrijf ? "var(--accent2)" : "var(--muted)",
                  cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12
                }}
              >👤 Particulier</button>
            </div>

            {/* Klant-specifieke velden */}
            {isBedrijf ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  className="weeg-veld-input"
                  placeholder="Bedrijfsnaam *"
                  value={klant.bedrijf}
                  onChange={e => updateKlant("bedrijf", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Contactpersoon"
                  value={klant.contactpersoon}
                  onChange={e => updateKlant("contactpersoon", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Adres"
                  value={klant.adres}
                  onChange={e => updateKlant("adres", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Postcode"
                  value={klant.postcode}
                  onChange={e => updateKlant("postcode", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Plaats"
                  value={klant.plaats}
                  onChange={e => updateKlant("plaats", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="BTW-nummer"
                  value={klant.btw}
                  onChange={e => updateKlant("btw", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="KvK-nummer"
                  value={klant.kvk}
                  onChange={e => updateKlant("kvk", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="E-mail"
                  type="email"
                  value={klant.email}
                  onChange={e => updateKlant("email", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  className="weeg-veld-input"
                  placeholder="Naam *"
                  value={klant.naam}
                  onChange={e => updateKlant("naam", e.target.value)}
                  style={{ marginBottom: 0, gridColumn: "span 2" }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Adres"
                  value={klant.adres}
                  onChange={e => updateKlant("adres", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Postcode + Plaats"
                  value={klant.plaats}
                  onChange={e => updateKlant("plaats", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                                <div style={{ gridColumn: "span 2", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Legitimatie:</span>
                  <select
                    value={klant.legitimatieType}
                    onChange={e => updateKlant("legitimatieType", e.target.value)}
                    className="weeg-veld-input"
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <option value="">— kies type —</option>
                    <option value="Rijbewijs">Rijbewijs</option>
                    <option value="Paspoort">Paspoort</option>
                    <option value="ID-kaart">ID-kaart</option>
                  </select>
                </div>
                <input
                  className="weeg-veld-input"
                  placeholder="Legitimatienummer"
                  value={klant.legitimatieNummer}
                  onChange={e => updateKlant("legitimatieNummer", e.target.value)}
                  style={{ marginBottom: 0, gridColumn: "span 2" }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="Telefoon"
                  value={klant.telefoon}
                  onChange={e => updateKlant("telefoon", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <input
                  className="weeg-veld-input"
                  placeholder="E-mail"
                  type="email"
                  value={klant.email}
                  onChange={e => updateKlant("email", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
            )}
          </div>

          {/* Materiaal + regels */}
          <div style={{ marginBottom: 16, padding: 14, background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)" }}>
            <div className="weeg-mat-grid" style={{ marginBottom: 10 }}>
              {MATERIALEN.map(m => (
                <button
                  key={m.id}
                  className={"weeg-mat-btn" + (invMat && invMat.id === m.id ? " actief" : "")}
                  onClick={() => setInvMat(m)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.kleur, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{m.naam}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, padding: "7px 10px", borderRadius: 6, outline: "none", textTransform: "uppercase" }}
                placeholder="NL-AB-123"
                value={invKenteken}
                onChange={e => setInvKenteken(e.target.value)}
              />
              <input
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, padding: "7px 10px", borderRadius: 6, outline: "none" }}
                placeholder="Gewicht (kg)"
                type="number" min="0"
                value={invGewicht}
                onChange={e => setInvGewicht(e.target.value)}
                onKeyDown={e => e.key === "Enter" && voegRegelToe()}
              />
            </div>
            <button
              onClick={voegRegelToe}
              disabled={!invMat || !invGewicht || parseFloat(invGewicht) <= 0}
              style={{ padding: "8px 16px", background: (!invMat || !invGewicht) ? "var(--surface2)" : "var(--accent)", color: (!invMat || !invGewicht) ? "var(--muted)" : "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}
            >+ Toevoegen aan bon</button>
          </div>

          {bonRegels.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", background: "var(--surface2)", borderRadius: 8, border: "1px dashed var(--border)" }}>
              Voeg regels toe om een bon te maken
            </div>
          ) : (
            <div>
              {bonRegels.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface2)", borderRadius: 7, marginBottom: 6, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", width: 20 }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.materiaal.naam}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      {r.kenteken} · {r.gewicht.toLocaleString("nl-NL")} kg · € {r.prijs.toFixed(2)}/kg
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent2)", fontFamily: "var(--mono)" }}>
                    € {r.totaal.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button onClick={() => verwijderRegel(r.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}>✕</button>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--surface)", border: "2px solid var(--accent)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL GEWICHT</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)" }}>{totaalKg.toLocaleString("nl-NL")} kg</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL BEDRAG</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent2)", fontFamily: "var(--mono)" }}>
                    € {totaalEuro.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <button onClick={nieuweBon} style={{ flex: 1, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>
            🗑 Nieuwe bon
          </button>
          <button
            onClick={afdrukken}
            disabled={bonRegels.length === 0}
            style={{ flex: 2, padding: "10px", background: bonRegels.length === 0 ? "var(--surface2)" : "var(--accent)", color: bonRegels.length === 0 ? "var(--muted)" : "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: bonRegels.length === 0 ? "not-allowed" : "pointer", fontFamily: "var(--sans)" }}
          >🖨 Bon afdrukken</button>
        </div>
      </div>
    </div>
  );
}
