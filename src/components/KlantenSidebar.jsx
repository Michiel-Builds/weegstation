import { useState, useRef } from "react";
import {
  getInitKlanten, voegKlantToe, verwijderKlant, updateKlant,
  maakLegeKlant, getZakelijk, getParticulier, importeerCSV
} from "../data/klanten";
import { LMA_INGESCHAKELD } from "../data/product";
import Icon from "./Icon";

const inlineIcon = { verticalAlign: "-2px", marginRight: "5px", flexShrink: 0 };

export default function KlantenSidebar({ klanten, setKlanten }) {
  const [toonZakelijk, setToonZakelijk] = useState(true);
  const [toonParticulier, setToonParticulier] = useState(true);
  const [zoekterm, setZoekterm] = useState("");
  const [toonFormulier, setToonFormulier] = useState(false);
  const [bewerkId, setBewerkId] = useState(null);
  const [formData, setFormData] = useState(maakLegeKlant(getInitKlanten()));
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const zakelijk = getZakelijk(klanten).filter(k =>
    !zoekterm || k.naam.toLowerCase().includes(zoekterm.toLowerCase())
  );
  const particulier = getParticulier(klanten).filter(k =>
    !zoekterm || k.naam.toLowerCase().includes(zoekterm.toLowerCase())
  );

  function openNieuw() {
    setFormData(maakLegeKlant(klanten));
    setBewerkId(null);
    setToonFormulier(true);
  }

  function openBewerk(k) {
    setFormData({ ...k });
    setBewerkId(k.id);
    setToonFormulier(true);
  }

  function slaOp() {
    if (!formData.naam.trim()) {
      alert("Naam is verplicht.");
      return;
    }
    if (bewerkId) {
      let updated = klanten;
      ["type", "naam", "contactpersoon", "adres", "postcode", "plaats",
       "btw", "kvk", "amiceBedrijfsnummer", "vihb", "email", "telefoon", "legitimatieType", "legitimatieNummer", "notities"].forEach(veld => {
        updated = updateKlant(updated, bewerkId, veld, formData[veld]);
      });
      setKlanten(updated);
    } else {
      setKlanten(voegKlantToe(klanten, { ...formData, id: maakLegeKlant(klanten).id }));
    }
    setToonFormulier(false);
  }

  function verwijder(k) {
    if (!confirm(`Weet je zeker dat je "${k.naam}" wilt verwijderen?`)) return;
    setKlanten(verwijderKlant(klanten, k.id));
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = importeerCSV(klanten, evt.target.result);
      if (result.fout) {
        setImportStatus({ type: "fout", bericht: result.fout });
      } else {
        setKlanten(result.klanten);
        setImportStatus({ type: "ok", bericht: `${result.toegevoegd} klant(en) geïmporteerd` });
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  function KlantItem({ k }) {
    return (
      <div className="klant-item-kl" title={`${k.naam} — ${k.plaats || ""}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="klant-item-naam-kl">
            <Icon name={k.type === "zakelijk" ? "gebouw" : "persoon"} size={13} style={inlineIcon} />{k.naam}
          </div>
          {k.plaats && (
            <div className="klant-item-sub-kl">
              {k.plaats}{k.kvk ? ` · KvK ${k.kvk}` : ""}
            </div>
          )}
        </div>
        <button
          className="klant-actie-kl"
          onClick={() => openBewerk(k)}
          title="Bewerken"
        ><Icon name="bewerk" size={13} /></button>
        <button
          className="klant-actie-kl del"
          onClick={() => verwijder(k)}
          title="Verwijderen"
        >×</button>
      </div>
    );
  }

  return (
    <div className="klanten-sidebar-kl">
      <div className="klanten-header-kl">
        <span className="klanten-titel-kl"><Icon name="personen" size={15} style={inlineIcon} />Klanten</span>
        <span className="badge">{klanten.length}</span>
      </div>

      <input
        className="klanten-zoek-kl"
        type="text"
        placeholder="Zoek klant..."
        value={zoekterm}
        onChange={e => setZoekterm(e.target.value)}
      />

      <div className="klant-categorie-kl">
        <button className="klant-cat-header-kl" onClick={() => setToonZakelijk(!toonZakelijk)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name={toonZakelijk ? "chevronOnder" : "chevronRechts"} size={13} />
            <Icon name="gebouw" size={13} /> Zakelijk
          </span>
          <span className="klant-cat-count-kl">{zakelijk.length}</span>
        </button>
        {toonZakelijk && (
          <div className="klant-cat-items-kl">
            {zakelijk.length === 0 ? (
              <div className="klant-leeg-kl">Geen zakelijke klanten</div>
            ) : zakelijk.map(k => <KlantItem key={k.id} k={k} />)}
          </div>
        )}
      </div>

      <div className="klant-categorie-kl">
        <button className="klant-cat-header-kl" onClick={() => setToonParticulier(!toonParticulier)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name={toonParticulier ? "chevronOnder" : "chevronRechts"} size={13} />
            <Icon name="persoon" size={13} /> Particulier
          </span>
          <span className="klant-cat-count-kl">{particulier.length}</span>
        </button>
        {toonParticulier && (
          <div className="klant-cat-items-kl">
            {particulier.length === 0 ? (
              <div className="klant-leeg-kl">Geen particuliere klanten</div>
            ) : particulier.map(k => <KlantItem key={k.id} k={k} />)}
          </div>
        )}
      </div>

      <div className="klant-acties-kl">
        <button className="klant-btn-kl primair" onClick={openNieuw}>
          <Icon name="plus" size={14} style={inlineIcon} />Nieuwe klant
        </button>
        <button
          className="klant-btn-kl secundair"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="import" size={14} style={inlineIcon} />Importeren
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleImport}
          style={{ display: "none" }}
        />
      </div>

      {importStatus && (
        <div className={"klant-import-status-kl " + importStatus.type}>
          <span>{importStatus.bericht}</span>
          <button onClick={() => setImportStatus(null)} className="klant-status-sluit-kl">×</button>
        </div>
      )}

      {toonFormulier && (
        <div className="klant-modal-backdrop-kl" onClick={() => setToonFormulier(false)}>
          <div className="klant-modal-kl" onClick={e => e.stopPropagation()}>
            <div className="klant-modal-header-kl">
              <span className="klant-modal-titel-kl">
                <Icon name={bewerkId ? "bewerk" : "plus"} size={14} style={inlineIcon} />{bewerkId ? "Klant bewerken" : "Nieuwe klant"}
              </span>
              <button className="klant-actie-kl" onClick={() => setToonFormulier(false)}>×</button>
            </div>
            <div className="klant-modal-body-kl">
              <div className="klant-modal-row-kl">
                <label>Type</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                  <option value="zakelijk">Zakelijk</option>
                  <option value="particulier">Particulier</option>
                </select>
              </div>
              <div className="klant-modal-row-kl">
                <label>Naam *</label>
                <input value={formData.naam} onChange={e => setFormData({ ...formData, naam: e.target.value })} placeholder="Bedrijfsnaam of persoonsnaam" />
              </div>
              <div className="klant-modal-row-kl">
                <label>Contactpersoon</label>
                <input value={formData.contactpersoon} onChange={e => setFormData({ ...formData, contactpersoon: e.target.value })} />
              </div>
              <div className="klant-modal-row-kl">
                <label>Adres</label>
                <input value={formData.adres} onChange={e => setFormData({ ...formData, adres: e.target.value })} />
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Postcode</label>
                  <input value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>Plaats</label>
                  <input value={formData.plaats} onChange={e => setFormData({ ...formData, plaats: e.target.value })} />
                </div>
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>BTW</label>
                  <input value={formData.btw} onChange={e => setFormData({ ...formData, btw: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>KvK</label>
                  <input value={formData.kvk} onChange={e => setFormData({ ...formData, kvk: e.target.value })} />
                </div>
              </div>
              {LMA_INGESCHAKELD && formData.type === "zakelijk" && (
                <div className="klant-modal-grid-kl">
                  <div className="klant-modal-row-kl">
                    <label>AMICE-bedrijfsnummer</label>
                    <input
                      value={formData.amiceBedrijfsnummer || ""}
                      onChange={e => setFormData({ ...formData, amiceBedrijfsnummer: e.target.value })}
                      placeholder="Voor LMA-meldingen (optioneel)"
                    />
                  </div>
                  <div className="klant-modal-row-kl">
                    <label>VIHB-nummer</label>
                    <input
                      value={formData.vihb || ""}
                      onChange={e => setFormData({ ...formData, vihb: e.target.value })}
                      placeholder="Vervoerder/inzamelaar (begeleidingsbrief)"
                    />
                  </div>
                </div>
              )}
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Telefoon</label>
                  <input value={formData.telefoon} onChange={e => setFormData({ ...formData, telefoon: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>E-mail</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
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
