import { useState, useMemo } from "react";
import {
  bouwMaandoverzicht, valideerMeldingRegel, upsertMelding, laadMeldingen,
  MELDING_TYPE_LABEL, MELDING_STATUS, MELDING_STATUS_LABEL, maandLabel, MAANDEN,
} from "../utils/lmaMeldingen";
import { laadAfvalstromen } from "../utils/afvalstromen";
import {
  bouwOntvangstPayload, exporteerXml, verstuurMelding, certIngesteld,
} from "../utils/lmaService";
import { verzamelHerinneringen } from "../utils/lmaHerinneringen";
import {
  laadBegeleidingsbrieven, maakLegeBegeleidingsbrief,
  voegBegeleidingsbriefToe, verwijderBegeleidingsbrief,
} from "../utils/begeleidingsbrieven";
import Icon from "./Icon";

const inlineIcon = { verticalAlign: "-2px", marginRight: "5px", flexShrink: 0 };

function statusKleur(status) {
  switch (status) {
    case MELDING_STATUS.GEMELD: return "#4caf7d";
    case MELDING_STATUS.VERZONDEN: return "#7ab4f5";
    case MELDING_STATUS.GEEXPORTEERD: return "#d4b84a";
    case MELDING_STATUS.AFGEKEURD: return "#e74c3c";
    default: return "#9eafc4";
  }
}

export default function LMAPagina({ wegingen = [], bedrijf, klanten = [] }) {
  const nu = new Date();
  const [jaar, setJaar] = useState(nu.getFullYear());
  const [maand, setMaand] = useState(nu.getMonth() + 1);
  const [meldingen, setMeldingen] = useState(() => laadMeldingen());
  const [afvalstromen] = useState(() => laadAfvalstromen());
  const [brieven, setBrieven] = useState(() => laadBegeleidingsbrieven());
  const [bezig, setBezig] = useState(null);
  const [melding, setMelding] = useState(null);
  const [briefForm, setBriefForm] = useState(null);

  const overzicht = useMemo(
    () => bouwMaandoverzicht(wegingen, meldingen, jaar, maand),
    [wegingen, meldingen, jaar, maand]
  );

  const herinneringen = useMemo(
    () => verzamelHerinneringen(wegingen, meldingen, bedrijf, nu),
    [wegingen, meldingen, bedrijf]
  );

  const certOk = certIngesteld(bedrijf);

  function vorige() {
    if (maand === 1) { setMaand(12); setJaar(j => j - 1); }
    else setMaand(m => m - 1);
  }
  function volgende() {
    if (maand === 12) { setMaand(1); setJaar(j => j + 1); }
    else setMaand(m => m + 1);
  }

  function verrijk(regel) {
    const afvalstroom = afvalstromen.find(s =>
      (regel.afvalstroomId && s.id === regel.afvalstroomId) || s.asn === regel.asn
    ) || null;
    const klant = klanten.find(k => String(k.id) === String(regel.klantId)) || null;
    return { afvalstroom, klant };
  }

  function bewaarStatus(regel, status, extra = {}) {
    const record = {
      id: regel.meldingId,
      jaar, maand,
      asn: regel.asn,
      type: regel.type,
      status,
      kg: regel.kg,
      aantalVrachten: regel.aantalVrachten,
      euralCode: regel.euralCode,
      gevaarlijk: regel.gevaarlijk,
      verwerkingsmethode: regel.verwerkingsmethode,
      klantId: regel.klantId,
      afvalstroomId: regel.afvalstroomId,
      bijgewerkt: new Date().toISOString(),
      ...extra,
    };
    setMeldingen(prev => upsertMelding(prev, record));
  }

  async function exporteer(regel) {
    const { afvalstroom, klant } = verrijk(regel);
    const payload = bouwOntvangstPayload({ bedrijf, regel: { ...regel, jaar, maand }, afvalstroom, klant });
    setBezig(regel.asn + "-export");
    try {
      const res = await exporteerXml({
        type: regel.type, payload,
        suggestedName: `lma-${regel.type}-${regel.asn}-${jaar}${String(maand).padStart(2, "0")}.xml`,
      });
      if (res.ok) {
        bewaarStatus(regel, MELDING_STATUS.GEEXPORTEERD);
        setMelding({ type: "ok", tekst: `XML opgeslagen: ${res.pad}` });
      } else if (!res.geannuleerd) {
        setMelding({ type: "fout", tekst: res.fout || "Export mislukt" });
      }
    } finally {
      setBezig(null);
    }
  }

  async function verstuur(regel) {
    const { afvalstroom, klant } = verrijk(regel);
    const payload = bouwOntvangstPayload({ bedrijf, regel: { ...regel, jaar, maand }, afvalstroom, klant });
    setBezig(regel.asn + "-verstuur");
    try {
      const res = await verstuurMelding({ type: regel.type, payload, bedrijf });
      if (res.ok) {
        bewaarStatus(regel, MELDING_STATUS.VERZONDEN, { retour: res.body || null });
        setMelding({ type: "ok", tekst: `Melding verzonden (${bedrijf?.lma?.omgeving || "bto"}).` });
      } else {
        setMelding({ type: "fout", tekst: res.fout || "Verzenden mislukt" });
      }
    } finally {
      setBezig(null);
    }
  }

  function markeerGemeld(regel) {
    bewaarStatus(regel, MELDING_STATUS.GEMELD);
  }

  // --- Begeleidingsbrieven ---
  function nieuweBrief() {
    setBriefForm(maakLegeBegeleidingsbrief(brieven));
  }
  function bewaarBrief() {
    if (!briefForm.asn) { setMelding({ type: "fout", tekst: "Kies een ASN voor de begeleidingsbrief." }); return; }
    setBrieven(prev => voegBegeleidingsbriefToe(prev, briefForm));
    setBriefForm(null);
  }
  function verwijderBrief(id) {
    if (!confirm("Begeleidingsbrief verwijderen?")) return;
    setBrieven(prev => verwijderBegeleidingsbrief(prev, id));
  }

  const maandBrieven = brieven.filter(b => {
    if (!b.datum) return false;
    const d = new Date(b.datum + "T00:00:00");
    return d.getFullYear() === jaar && (d.getMonth() + 1) === maand;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <Icon name="rapport" size={15} style={inlineIcon} />LMA / Afvalmelding
        </span>
        <span className="badge">{bedrijf?.lma?.omgeving === "productie" ? "Productie" : "BTO-test"}</span>
      </div>

      <div style={{ padding: 20 }}>
        {herinneringen.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {herinneringen.map((h, i) => (
              <div key={i} style={{
                padding: "8px 12px", borderRadius: 8, marginBottom: 6, fontSize: 13,
                background: h.niveau === "fout" ? "rgba(231,76,60,0.15)" : "rgba(212,184,74,0.15)",
                color: h.niveau === "fout" ? "#e74c3c" : "#d4b84a",
              }}>
                {h.tekst}
              </div>
            ))}
          </div>
        )}

        {!bedrijf?.lma?.verwerkersnummer && (
          <div style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 16, background: "rgba(231,76,60,0.15)", color: "#e74c3c", fontSize: 13 }}>
            Geen verwerkersnummer ingesteld (Instellingen). Meldingen kunnen niet worden samengesteld.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button className="klant-btn-kl secundair" onClick={vorige}>‹ Vorige</button>
          <select value={maand} onChange={e => setMaand(Number(e.target.value))}>
            {MAANDEN.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={jaar} onChange={e => setJaar(Number(e.target.value))} style={{ width: 90 }} />
          <button className="klant-btn-kl secundair" onClick={volgende}>Volgende ›</button>
          <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.8 }}>
            {overzicht.regels.length} ASN · {overzicht.totaalKg.toLocaleString("nl-NL")} kg · {overzicht.totaalVrachten} vrachten
          </span>
        </div>

        {melding && (
          <div style={{
            padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13,
            background: melding.type === "ok" ? "rgba(76,175,125,0.15)" : "rgba(231,76,60,0.15)",
            color: melding.type === "ok" ? "#4caf7d" : "#e74c3c",
            display: "flex", justifyContent: "space-between", gap: 8,
          }}>
            <span style={{ wordBreak: "break-all" }}>{melding.tekst}</span>
            <button onClick={() => setMelding(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>×</button>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ASN</th>
              <th style={{ textAlign: "left" }}>Ontdoener</th>
              <th style={{ textAlign: "left" }}>EURAL</th>
              <th style={{ textAlign: "right" }}>kg</th>
              <th style={{ textAlign: "right" }}>Vrachten</th>
              <th style={{ textAlign: "left" }}>Type</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {overzicht.regels.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 16, opacity: 0.6 }}>Geen meldplichtige ontvangsten in {maandLabel(jaar, maand)}.</td></tr>
            ) : overzicht.regels.map(regel => {
              const fouten = valideerMeldingRegel(regel, bedrijf?.lma);
              const kanMelden = fouten.length === 0;
              return (
                <tr key={regel.meldingId} style={{ borderTop: "1px solid var(--border, #2a2a2a)" }}>
                  <td style={{ fontFamily: "monospace", padding: "8px 4px" }}>
                    {regel.asn}{regel.gevaarlijk ? <span title="Gevaarlijk" style={{ color: "#e67e22" }}> ⚠</span> : null}
                  </td>
                  <td>{regel.klantNaam}</td>
                  <td style={{ fontFamily: "monospace" }}>{regel.euralCode}</td>
                  <td style={{ textAlign: "right" }}>{regel.kg.toLocaleString("nl-NL")}</td>
                  <td style={{ textAlign: "right" }}>{regel.aantalVrachten}</td>
                  <td>{MELDING_TYPE_LABEL[regel.type]}</td>
                  <td>
                    <span style={{ color: statusKleur(regel.status), fontWeight: 600 }}>
                      {MELDING_STATUS_LABEL[regel.status]}
                    </span>
                    {!kanMelden && (
                      <div style={{ fontSize: 11, color: "#e74c3c" }} title={fouten.join("\n")}>
                        {fouten.length} ontbrekend veld(en)
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="klant-btn-kl secundair" disabled={!kanMelden || bezig === regel.asn + "-export"}
                      onClick={() => exporteer(regel)} title="Exporteer XML voor handmatige BTO-validatie">XML</button>
                    <button className="klant-btn-kl secundair" disabled={!kanMelden || !certOk || bezig === regel.asn + "-verstuur"}
                      onClick={() => verstuur(regel)} title={certOk ? "Verstuur naar AMICE" : "Geen certificaat ingesteld"}>Verstuur</button>
                    <button className="klant-btn-kl secundair" onClick={() => markeerGemeld(regel)} title="Handmatig als gemeld markeren">✓</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {overzicht.uitgesloten.vrachten > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            Uitgesloten (particulier/vrijgesteld, niet gemeld): {overzicht.uitgesloten.vrachten} vrachten · {overzicht.uitgesloten.kg.toLocaleString("nl-NL")} kg
          </div>
        )}

        {/* Begeleidingsbrieven */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Begeleidingsbrieven — {maandLabel(jaar, maand)}</h3>
            <button className="klant-btn-kl primair" onClick={nieuweBrief}>
              <Icon name="plus" size={13} style={inlineIcon} />Nieuwe brief
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Datum</th>
                <th style={{ textAlign: "left" }}>ASN</th>
                <th style={{ textAlign: "left" }}>Kenteken</th>
                <th style={{ textAlign: "left" }}>Vervoerder</th>
                <th style={{ textAlign: "left" }}>Gevaarlijk</th>
                <th style={{ textAlign: "left" }}>Bron</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {maandBrieven.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 12, opacity: 0.6 }}>Geen begeleidingsbrieven deze maand.</td></tr>
              ) : maandBrieven.map(b => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border, #2a2a2a)" }}>
                  <td style={{ padding: "6px 4px" }}>{b.datum}</td>
                  <td style={{ fontFamily: "monospace" }}>{b.asn}</td>
                  <td>{b.kenteken}</td>
                  <td>{b.vervoerderNaam}{b.vihb ? ` (${b.vihb})` : ""}</td>
                  <td>{b.gevaarlijk ? "Ja" : "Nee"}</td>
                  <td style={{ fontSize: 12, opacity: 0.8 }}>{b.wegingId ? "Uit weging" : "Handmatig"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="klant-actie-kl del" onClick={() => verwijderBrief(b.id)} title="Verwijderen">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {briefForm && (
        <div className="klant-modal-backdrop-kl" onClick={() => setBriefForm(null)}>
          <div className="klant-modal-kl" onClick={e => e.stopPropagation()}>
            <div className="klant-modal-header-kl">
              <span className="klant-modal-titel-kl"><Icon name="plus" size={14} style={inlineIcon} />Begeleidingsbrief</span>
              <button className="klant-actie-kl" onClick={() => setBriefForm(null)}>×</button>
            </div>
            <div className="klant-modal-body-kl">
              <div className="klant-modal-row-kl">
                <label>Afvalstroom (ASN)</label>
                <select value={briefForm.asn} onChange={e => {
                  const s = afvalstromen.find(x => x.asn === e.target.value);
                  setBriefForm({ ...briefForm, asn: e.target.value, gevaarlijk: s ? !!s.gevaarlijk : briefForm.gevaarlijk });
                }}>
                  <option value="">-- kies ASN --</option>
                  {afvalstromen.map(s => <option key={s.id} value={s.asn}>{s.asn} · {s.gebruikelijkeBenaming || s.euralCode}</option>)}
                </select>
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Datum</label>
                  <input type="date" value={briefForm.datum} onChange={e => setBriefForm({ ...briefForm, datum: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>Kenteken</label>
                  <input value={briefForm.kenteken} onChange={e => setBriefForm({ ...briefForm, kenteken: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Vervoerder</label>
                  <input value={briefForm.vervoerderNaam} onChange={e => setBriefForm({ ...briefForm, vervoerderNaam: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>VIHB-nummer</label>
                  <input value={briefForm.vihb} onChange={e => setBriefForm({ ...briefForm, vihb: e.target.value })} />
                </div>
              </div>
              <div className="klant-modal-row-kl">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!briefForm.gevaarlijk} onChange={e => setBriefForm({ ...briefForm, gevaarlijk: e.target.checked })} />
                  Gevaarlijk afval
                </label>
              </div>
              {briefForm.gevaarlijk && (
                <div className="klant-modal-row-kl">
                  <label>Aard/samenstelling (+ evt. ZZS)</label>
                  <input value={briefForm.aardSamenstelling} onChange={e => setBriefForm({ ...briefForm, aardSamenstelling: e.target.value })} />
                </div>
              )}
              <div className="klant-modal-row-kl">
                <label>Omschrijving</label>
                <input value={briefForm.omschrijving} onChange={e => setBriefForm({ ...briefForm, omschrijving: e.target.value })} />
              </div>
            </div>
            <div className="klant-modal-footer-kl">
              <button className="klant-btn-kl secundair" onClick={() => setBriefForm(null)}>Annuleren</button>
              <button className="klant-btn-kl primair" onClick={bewaarBrief}>
                <Icon name="check" size={14} style={inlineIcon} />Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
