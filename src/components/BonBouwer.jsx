import { useState } from "react";
import { maakBonnummer, printBon as printBonUtil } from "../utils/helpers";

const AANTAL_RIJEN = 15;

function fmt(n)  { return Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtI(n) { return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 }); }

function fmtDatum(d) {
  const vandaag   = new Date();
  const gisteren  = new Date(vandaag.getTime() - 86400000);
  if (d.toDateString() === vandaag.toDateString())  return "vandaag";
  if (d.toDateString() === gisteren.toDateString()) return "gisteren";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });
}

function parseTijdString(tijdStr, datumStr) {
  try {
    const [h, m, s] = (tijdStr || "0:0:0").split(":").map(Number);
    let d = new Date();
    if (datumStr && /^\d{1,2}-\d{1,2}-\d{4}$/.test(datumStr)) {
      const [dd, mm, yyyy] = datumStr.split("-").map(Number);
      d = new Date(yyyy, mm - 1, dd, h || 0, m || 0, s || 0);
    } else {
      d.setHours(h || 0, m || 0, s || 0, 0);
    }
    return d.getTime();
  } catch (e) {
    return null;
  }
}

function isBinnen24Uur(w) {
  if (!w.tijdMs) return true;
  return (Date.now() - w.tijdMs) <= 24 * 3600 * 1000;
}

export default function BonBouwer({ prijzen, wegingen = [] }) {
  // === STATE ===
  const [klant, setKlant] = useState({
    naam: "", bedrijf: "", contactpersoon: "",
    adres: "", postcode: "", plaats: "",
    btw: "", kvk: "", email: "", telefoon: "",
    legitimatieType: "", legitimatieNummer: ""
  });
  const [bonRegels, setBonRegels] = useState(() =>
    Array.from({ length: AANTAL_RIJEN }, () => ({ materiaal: "", vol: "", leeg: "", aftrek: "", prijs: "" }))
  );
  const [bonnummer]               = useState(maakBonnummer());
  const [klantType, setKlantType] = useState("bedrijf");
  const [toast, setToast]         = useState(null);
  const [toegevoegd, setToegevoegd] = useState(() => new Set());

  // === HELPERS ===
  function updateRij(index, veld, waarde) {
    // Valideer numerieke velden: alleen cijfers + 1 punt
    if (["vol", "leeg", "aftrek", "prijs"].includes(veld)) {
      if (waarde !== "" && !/^\d*\.?\d{0,2}$/.test(waarde)) return;
    }
    setBonRegels(prev => prev.map((r, i) => i === index ? { ...r, [veld]: waarde } : r));
  }
  function updateKlant(veld, waarde) {
    setKlant(prev => ({ ...prev, [veld]: waarde }));
  }
  function rijTotaal(r) {
    const v = parseFloat(r.vol)    || 0;
    const l = parseFloat(r.leeg)   || 0;
    const a = parseFloat(r.aftrek) || 0;
    return Math.max(0, v - l - a);
  }
  function rijSubtotaal(r) {
    return rijTotaal(r) * (parseFloat(r.prijs) || 0);
  }
  function rijIsActief(r) {
    return r.materiaal.trim() !== "" || rijTotaal(r) > 0;
  }
  function haalGeldigeRegels() {
    return bonRegels
      .map((r, i) => ({
        nr: i + 1,
        materiaal: r.materiaal.trim(),
        vol:    parseFloat(r.vol)    || 0,
        leeg:   parseFloat(r.leeg)   || 0,
        aftrek: parseFloat(r.aftrek) || 0,
        prijs:  parseFloat(r.prijs)  || 0,
        totaal: rijTotaal(r),
        subtotaal: rijSubtotaal(r),
        isActief: rijIsActief(r)
      }))
      .filter(r => r.isActief && r.totaal > 0 && r.prijs >= 0);
  }

  const totaalKg   = haalGeldigeRegels().reduce((s, r) => s + r.totaal, 0);
  const totaalEuro = haalGeldigeRegels().reduce((s, r) => s + r.subtotaal, 0);
  const isBedrijf  = klantType === "bedrijf";

  // === WEGINGEN VERRIJKEN + FILTEREN ===
  const wegingen24u = wegingen
    .map(w => ({ ...w, tijdMs: parseTijdString(w.tijd, w.datum) }))
    .filter(isBinnen24Uur)
    .sort((a, b) => (b.tijdMs || 0) - (a.tijdMs || 0));

  // === TOAST ===
  function toonToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // === WEGING TOEVOEGEN ===
  function voegWegingToe(wegingId) {
    if (toegevoegd.has(wegingId)) return;
    const w = wegingen.find(x => x.id === wegingId);
    if (!w) return;

    let doelIndex = bonRegels.findIndex(r =>
      r.materiaal.trim() === "" &&
      !r.vol && !r.leeg && !r.aftrek && !r.prijs
    );
    if (doelIndex === -1) doelIndex = 0;

    const prijs = prijzen[w.materiaal?.id] ?? w.prijs ?? 0;

    setBonRegels(prev => prev.map((r, i) => i === doelIndex ? {
      ...r,
      materiaal: w.materiaal.naam,
      vol:       String(w.gewicht),
      leeg:      "0",
      aftrek:    "0",
      prijs:     String(prijs)
    } : r));

    setToegevoegd(prev => new Set(prev).add(wegingId));
    toonToast(`✓ ${w.materiaal.naam} (${fmtI(w.gewicht)} kg) toegevoegd`);
  }

  // === WEGING ONGEDAAN MAKEN ===
  function verwijderWeging(wegingId) {
    const w = wegingen.find(x => x.id === wegingId);
    if (!w) return;

    const wPrijs = parseFloat(prijzen[w.materiaal?.id] ?? w.prijs ?? 0);

    setBonRegels(prev => prev.map(r => {
      const isMatch = r.materiaal.trim() === w.materiaal.naam &&
                      parseFloat(r.vol) === w.gewicht &&
                      parseFloat(r.prijs) === wPrijs;
      if (isMatch) {
        return { materiaal: "", vol: "", leeg: "", aftrek: "", prijs: "" };
      }
      return r;
    }));

    setToegevoegd(prev => {
      const nieuw = new Set(prev);
      nieuw.delete(wegingId);
      return nieuw;
    });
    toonToast(`↶ ${w.materiaal.naam} verwijderd van bon`);
  }

  // === ACTIES ===
  function nieuweBon() {
    if (!confirm("Huidige bon wissen en opnieuw beginnen?")) return;
    setKlant({
      naam: "", bedrijf: "", contactpersoon: "",
      adres: "", postcode: "", plaats: "",
      btw: "", kvk: "", email: "", telefoon: "",
      legitimatieType: "", legitimatieNummer: ""
    });
    setBonRegels(Array.from({ length: AANTAL_RIJEN }, () => ({ materiaal: "", vol: "", leeg: "", aftrek: "", prijs: "" })));
    setToegevoegd(new Set());
  }

  function afdrukken() {
    const regels = haalGeldigeRegels();
    if (regels.length === 0) { alert("Vul minstens één regel in."); return; }
    if (klantType === "bedrijf" && !klant.bedrijf.trim()) {
      alert("Vul een bedrijfsnaam in."); return;
    }
    if (klantType === "particulier" && !klant.naam.trim()) {
      alert("Vul een naam in."); return;
    }
    printBonUtil({
      bonnummer, klant, klantType,
      regels: regels.map(r => ({
        materiaal: r.materiaal,
        kenteken: "–",
        vol: r.vol, leeg: r.leeg, aftrek: r.aftrek,
        totaal: r.totaal, prijs: r.prijs, subtotaal: r.subtotaal
      })),
      totaalKg, totaalEuro
    });
  }

  // === RENDER ===
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
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

            {isBedrijf ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input className="weeg-veld-input" placeholder="Bedrijfsnaam *"
                  value={klant.bedrijf} onChange={e => updateKlant("bedrijf", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="Contactpersoon"
                  value={klant.contactpersoon} onChange={e => updateKlant("contactpersoon", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="Adres"
                  value={klant.adres} onChange={e => updateKlant("adres", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="Postcode"
                  value={klant.postcode} onChange={e => updateKlant("postcode", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="Plaats"
                  value={klant.plaats} onChange={e => updateKlant("plaats", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="BTW-nummer"
                  value={klant.btw} onChange={e => updateKlant("btw", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="KvK-nummer"
                  value={klant.kvk} onChange={e => updateKlant("kvk", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="E-mail" type="email"
                  value={klant.email} onChange={e => updateKlant("email", e.target.value)} style={{ marginBottom: 0 }} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input className="weeg-veld-input" placeholder="Naam *"
                  value={klant.naam} onChange={e => updateKlant("naam", e.target.value)} style={{ marginBottom: 0, gridColumn: "span 2" }} />
                <input className="weeg-veld-input" placeholder="Adres"
                  value={klant.adres} onChange={e => updateKlant("adres", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="Postcode + Plaats"
                  value={klant.plaats} onChange={e => updateKlant("plaats", e.target.value)} style={{ marginBottom: 0 }} />
                <div style={{ gridColumn: "span 2", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Legitimatie:</span>
                  <select value={klant.legitimatieType} onChange={e => updateKlant("legitimatieType", e.target.value)} className="weeg-veld-input" style={{ flex: 1, marginBottom: 0 }}>
                    <option value="">— kies type —</option>
                    <option value="Rijbewijs">Rijbewijs</option>
                    <option value="Paspoort">Paspoort</option>
                    <option value="ID-kaart">ID-kaart</option>
                  </select>
                </div>
                <input className="weeg-veld-input" placeholder="Legitimatienummer"
                  value={klant.legitimatieNummer} onChange={e => updateKlant("legitimatieNummer", e.target.value)} style={{ marginBottom: 0, gridColumn: "span 2" }} />
                <input className="weeg-veld-input" placeholder="Telefoon"
                  value={klant.telefoon} onChange={e => updateKlant("telefoon", e.target.value)} style={{ marginBottom: 0 }} />
                <input className="weeg-veld-input" placeholder="E-mail" type="email"
                  value={klant.email} onChange={e => updateKlant("email", e.target.value)} style={{ marginBottom: 0 }} />
              </div>
            )}
          </div>

          {/* Bonregels-tabel */}
          <div style={{ padding: 14, background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th()}>Materiaal</th>
                  <th style={th(true)}>Vol (kg)</th>
                  <th style={th(true)}>Leeg (kg)</th>
                  <th style={th(true)}>Aftrek (kg)</th>
                  <th style={th(true)}>€/kg</th>
                  <th style={th(true)}>Subtotaal</th>
                </tr>
              </thead>
              <tbody>
                {bonRegels.map((r, i) => {
                  const actief = rijIsActief(r);
                  const totaal = rijTotaal(r);
                  const sub    = rijSubtotaal(r);
                  return (
                    <tr key={i} style={{ opacity: actief ? 1 : 0.55 }}>
                      <td style={td()}>
                        <input style={inputStyle(false)} placeholder="bijv. Koper"
                          value={r.materiaal}
                          onChange={e => updateRij(i, "materiaal", e.target.value)} />
                      </td>
                      <td style={td(true)}>
                        <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                          value={r.vol}
                          onChange={e => updateRij(i, "vol", e.target.value)} />
                      </td>
                      <td style={td(true)}>
                        <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                          value={r.leeg}
                          onChange={e => updateRij(i, "leeg", e.target.value)} />
                      </td>
                      <td style={td(true)}>
                        <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                          value={r.aftrek}
                          onChange={e => updateRij(i, "aftrek", e.target.value)} />
                      </td>
                      <td style={td(true)}>
                        <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0.00"
                          value={r.prijs}
                          onChange={e => updateRij(i, "prijs", e.target.value)} />
                      </td>
                      <td style={td(true)}>
                        <span style={{
                          fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13,
                          color: totaal > 0 && (parseFloat(r.prijs) || 0) > 0 ? "var(--accent2)" : "var(--muted)"
                        }}>
                          € {fmt(sub)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totaal-balk */}
          <div style={{ marginTop: 14, padding: "14px 18px", background: "var(--surface)", border: "2px solid var(--accent)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL GEWICHT</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)" }}>{fmtI(totaalKg)} kg</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL BEDRAG</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent2)", fontFamily: "var(--mono)" }}>€ {fmt(totaalEuro)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <button onClick={nieuweBon} style={{ flex: 1, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>
            🗑 Nieuwe bon
          </button>
          <button
            onClick={afdrukken}
            disabled={totaalEuro === 0}
            style={{ flex: 2, padding: "10px", background: totaalEuro === 0 ? "var(--surface2)" : "var(--accent)", color: totaalEuro === 0 ? "var(--muted)" : "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: totaalEuro === 0 ? "not-allowed" : "pointer", fontFamily: "var(--sans)" }}
          >🖨 Bon afdrukken</button>
        </div>
      </div>

      {/* WEGINGEN RECHTS */}
      <div className="weeg-paneel" style={{ alignSelf: "start" }}>
        <div className="weeg-paneel-header">
          <span className="weeg-paneel-title">📋 Wegingen laatste 24u</span>
          <span className="badge">{wegingen24u.length} beschikbaar</span>
        </div>
        <div style={{ padding: 10, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          {wegingen24u.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>
              Geen wegingen in de laatste 24 uur
            </div>
          ) : wegingen24u.map(w => {
            const isToegevoegd = toegevoegd.has(w.id);
            const materiaalPrijs = parseFloat(prijzen[w.materiaal?.id] ?? w.prijs) || 0;
            const waarde = (w.gewicht || 0) * materiaalPrijs;
            return (
              <div
                key={w.id}
                onClick={() => isToegevoegd ? verwijderWeging(w.id) : voegWegingToe(w.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: 10, marginBottom: 6, borderRadius: 7,
                  background: isToegevoegd ? "transparent" : "var(--surface2)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  opacity: isToegevoegd ? 0.6 : 1,
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!isToegevoegd) e.currentTarget.style.background = "rgba(46,125,50,0.08)"; }}
                onMouseLeave={e => { if (!isToegevoegd) e.currentTarget.style.background = "var(--surface2)"; }}
              >
                <div style={{ fontSize: 18, flexShrink: 0 }}>
                  {w.bron === "loods" ? "⚖" : "🚛"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>{w.tijd || "–"}</span>
                    <span>·</span>
                    <span>{fmtDatum(w.tijdMs ? new Date(w.tijdMs) : new Date())}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, fontSize: 13, fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.materiaal?.kleur || "#888", flexShrink: 0 }} />
                    <span>{w.materiaal?.naam || "Onbekend"}</span>
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>·</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{w.kenteken || "–"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontFamily: "var(--mono)" }}>
                    {fmtI(w.gewicht || 0)} kg · € {fmt(materiaalPrijs)}/kg · € {fmt(waarde)}
                  </div>
                </div>
                {isToegevoegd ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); verwijderWeging(w.id); }}
                    title="Klik om ongedaan te maken"
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: "rgba(46,125,50,0.2)",
                      color: "var(--accent2)",
                      border: "1px solid rgba(46,125,50,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0, cursor: "pointer",
                      transition: "all 0.15s",
                      padding: 0
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(220, 50, 50, 0.2)";
                      e.currentTarget.style.color = "#ff6b6b";
                      e.currentTarget.style.borderColor = "rgba(220, 50, 50, 0.4)";
                      e.currentTarget.textContent = "↶";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(46,125,50,0.2)";
                      e.currentTarget.style.color = "var(--accent2)";
                      e.currentTarget.style.borderColor = "rgba(46,125,50,0.4)";
                      e.currentTarget.textContent = "✓";
                    }}
                  >✓</button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); voegWegingToe(w.id); }}
                    style={{
                      background: "var(--accent)", color: "#fff", border: "none",
                      width: 28, height: 28, borderRadius: 6,
                      fontSize: 16, fontWeight: 700, cursor: "pointer",
                      flexShrink: 0, padding: 0
                    }}
                  >+</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// === INLINE STIJL HELPERS ===
function th(num = false) {
  return {
    color: "var(--muted)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "6px 4px",
    textAlign: num ? "right" : "left",
    borderBottom: "1px solid var(--border)",
    fontFamily: "var(--mono)"
  };
}
function td(num = false) {
  return {
    padding: "4px 4px",
    borderBottom: "1px solid var(--surface2)",
    textAlign: num ? "right" : "left"
  };
}
function inputStyle(num) {
  return {
    width: "100%",
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text)",
    fontFamily: num ? "var(--mono)" : "var(--sans)",
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 4,
    outline: "none",
    textAlign: num ? "right" : "left"
  };
}
