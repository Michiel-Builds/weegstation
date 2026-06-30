import { useState } from "react";
import {
  laadAfvalstromen, maakLegeAfvalstroom, voegAfvalstroomToe,
  updateAfvalstroom, verwijderAfvalstroom, genereerAsn, valideerAsnFormaat,
} from "../utils/afvalstromen";
import { MATERIALEN, isGevaarlijkeEural } from "../data/stamdata";
import { getZakelijk } from "../data/klanten";
import Icon from "./Icon";

const inlineIcon = { verticalAlign: "-2px", marginRight: "5px", flexShrink: 0 };

export default function AfvalstromenPagina({ klanten, bedrijf }) {
  const [stromen, setStromen] = useState(() => laadAfvalstromen());
  const [toonFormulier, setToonFormulier] = useState(false);
  const [bewerkId, setBewerkId] = useState(null);
  const [formData, setFormData] = useState(null);

  const verwerkersnummer = bedrijf?.lma?.verwerkersnummer || "";
  const zakelijk = getZakelijk(klanten);

  function openNieuw() {
    setFormData(maakLegeAfvalstroom(verwerkersnummer, stromen));
    setBewerkId(null);
    setToonFormulier(true);
  }

  function openBewerk(s) {
    setFormData({ ...s });
    setBewerkId(s.id);
    setToonFormulier(true);
  }

  function kiesKlant(klantId) {
    const k = klanten.find(kl => String(kl.id) === String(klantId));
    setFormData(fd => ({
      ...fd,
      klantId: k ? k.id : null,
      ontdoenerNaam: k ? k.naam : "",
      ontdoenerKvK: k ? (k.kvk || "") : "",
      ontdoenerBedrijfsnummer: k ? (k.amiceBedrijfsnummer || "") : "",
      locatieHerkomst: k ? [k.adres, k.plaats].filter(Boolean).join(", ") : "",
    }));
  }

  function kiesMateriaal(materiaalId) {
    const m = MATERIALEN.find(mat => String(mat.id) === String(materiaalId));
    setFormData(fd => ({
      ...fd,
      materiaalId: m ? m.id : null,
      euralCode: m ? m.euralCode : fd.euralCode,
      gevaarlijk: m ? m.gevaarlijk : fd.gevaarlijk,
      verwerkingsmethode: m && m.verwerkingsmethode ? m.verwerkingsmethode : fd.verwerkingsmethode,
      gebruikelijkeBenaming: fd.gebruikelijkeBenaming || (m ? m.naam : ""),
    }));
  }

  function setEural(waarde) {
    setFormData(fd => ({
      ...fd,
      euralCode: waarde,
      gevaarlijk: isGevaarlijkeEural(waarde) || fd.gevaarlijk,
    }));
  }

  function nieuweAsn() {
    setFormData(fd => ({ ...fd, asn: genereerAsn(verwerkersnummer, stromen) }));
  }

  function slaOp() {
    if (!formData.klantId) { alert("Kies een (zakelijke) ontdoener."); return; }
    if (!formData.euralCode.trim()) { alert("EURAL-code is verplicht."); return; }
    const check = valideerAsnFormaat(formData.asn, verwerkersnummer);
    if (!check.ok) { alert("Ongeldig ASN: " + check.fout); return; }

    if (bewerkId) {
      setStromen(updateAfvalstroom(stromen, bewerkId, formData));
    } else {
      setStromen(voegAfvalstroomToe(stromen, formData));
    }
    setToonFormulier(false);
  }

  function verwijder(s) {
    if (!confirm(`Afvalstroom ${s.asn} verwijderen?`)) return;
    setStromen(verwijderAfvalstroom(stromen, s.id));
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <Icon name="lijst" size={15} style={inlineIcon} />Afvalstromen (ASN-register)
        </span>
        <span className="badge">{stromen.length}</span>
      </div>

      {!verwerkersnummer && (
        <div style={{ padding: "12px 20px", color: "var(--red)" }}>
          Geen verwerkersnummer ingesteld. Vul dit eerst in bij Instellingen, dan kunnen ASN's worden gegenereerd.
        </div>
      )}

      <div style={{ padding: 20 }}>
        <button className="klant-btn-kl primair" onClick={openNieuw}>
          <Icon name="plus" size={14} style={inlineIcon} />Nieuwe afvalstroom
        </button>

        <table className="data-tabel" style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ASN</th>
              <th style={{ textAlign: "left" }}>Ontdoener</th>
              <th style={{ textAlign: "left" }}>EURAL</th>
              <th style={{ textAlign: "left" }}>Benaming</th>
              <th style={{ textAlign: "left" }}>Gevaarlijk</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stromen.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 16, opacity: 0.6 }}>Nog geen afvalstromen.</td></tr>
            ) : stromen.map(s => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--border, #2a2a2a)" }}>
                <td style={{ fontFamily: "monospace", padding: "8px 4px" }}>{s.asn}</td>
                <td>{s.ontdoenerNaam}</td>
                <td style={{ fontFamily: "monospace" }}>{s.euralCode}</td>
                <td>{s.gebruikelijkeBenaming}</td>
                <td>{s.gevaarlijk ? "Ja" : "Nee"}</td>
                <td>{s.actief ? "Actief" : "Inactief"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="klant-actie-kl" onClick={() => openBewerk(s)} title="Bewerken">
                    <Icon name="bewerk" size={13} />
                  </button>
                  <button className="klant-actie-kl del" onClick={() => verwijder(s)} title="Verwijderen">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toonFormulier && formData && (
        <div className="klant-modal-backdrop-kl" onClick={() => setToonFormulier(false)}>
          <div className="klant-modal-kl" onClick={e => e.stopPropagation()}>
            <div className="klant-modal-header-kl">
              <span className="klant-modal-titel-kl">
                <Icon name={bewerkId ? "bewerk" : "plus"} size={14} style={inlineIcon} />
                {bewerkId ? "Afvalstroom bewerken" : "Nieuwe afvalstroom"}
              </span>
              <button className="klant-actie-kl" onClick={() => setToonFormulier(false)}>×</button>
            </div>
            <div className="klant-modal-body-kl">
              <div className="klant-modal-row-kl">
                <label>Ontdoener (zakelijk) *</label>
                <select value={formData.klantId || ""} onChange={e => kiesKlant(e.target.value)}>
                  <option value="">-- kies klant --</option>
                  {zakelijk.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                </select>
              </div>
              <div className="klant-modal-row-kl">
                <label>Afvalstroomnummer (ASN)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={formData.asn}
                    onChange={e => setFormData({ ...formData, asn: e.target.value.toUpperCase() })}
                    style={{ fontFamily: "monospace", flex: 1 }}
                    maxLength={12}
                  />
                  <button className="klant-btn-kl secundair" type="button" onClick={nieuweAsn} disabled={!verwerkersnummer}>
                    Genereer
                  </button>
                </div>
              </div>
              <div className="klant-modal-row-kl">
                <label>Materiaal (default-koppeling)</label>
                <select value={formData.materiaalId || ""} onChange={e => kiesMateriaal(e.target.value)}>
                  <option value="">-- geen --</option>
                  {MATERIALEN.map(m => <option key={m.id} value={m.id}>{m.naam}</option>)}
                </select>
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>EURAL-code *</label>
                  <input value={formData.euralCode} onChange={e => setEural(e.target.value)} placeholder="bv. 17 04 05" style={{ fontFamily: "monospace" }} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>Gebruikelijke benaming</label>
                  <input value={formData.gebruikelijkeBenaming} onChange={e => setFormData({ ...formData, gebruikelijkeBenaming: e.target.value })} />
                </div>
              </div>
              <div className="klant-modal-row-kl">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!formData.gevaarlijk} onChange={e => setFormData({ ...formData, gevaarlijk: e.target.checked })} />
                  Gevaarlijk afval
                </label>
              </div>
              <div className="klant-modal-row-kl">
                <label>Verwerkingsmethode (AMICE-code)</label>
                <input value={formData.verwerkingsmethode} onChange={e => setFormData({ ...formData, verwerkingsmethode: e.target.value })} placeholder="uit AMICE-codelijst" />
              </div>
              <div className="klant-modal-row-kl">
                <label>Locatie herkomst</label>
                <input value={formData.locatieHerkomst} onChange={e => setFormData({ ...formData, locatieHerkomst: e.target.value })} />
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Inzamelaar (naam)</label>
                  <input value={formData.inzamelaarNaam} onChange={e => setFormData({ ...formData, inzamelaarNaam: e.target.value })} placeholder="optioneel" />
                </div>
                <div className="klant-modal-row-kl">
                  <label>Inzamelaar bedrijfsnr.</label>
                  <input value={formData.inzamelaarBedrijfsnummer} onChange={e => setFormData({ ...formData, inzamelaarBedrijfsnummer: e.target.value })} placeholder="optioneel" />
                </div>
              </div>
              <div className="klant-modal-row-kl">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!formData.actief} onChange={e => setFormData({ ...formData, actief: e.target.checked })} />
                  Actief
                </label>
              </div>
            </div>
            <div className="klant-modal-footer-kl">
              <button className="klant-btn-kl secundair" onClick={() => setToonFormulier(false)}>Annuleren</button>
              <button className="klant-btn-kl primair" onClick={slaOp}>
                <Icon name={bewerkId ? "opslaan" : "check"} size={14} style={inlineIcon} />{bewerkId ? "Opslaan" : "Toevoegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
