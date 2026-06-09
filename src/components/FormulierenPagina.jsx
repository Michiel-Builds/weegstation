import { useState, useEffect } from "react";
import {
  laadFormulierData, bewaarFormulierData, maakInitFormulierData,
  klantNaarPartij, FORM_ROLLEN, maakDocumentnummer
} from "../utils/formulierHelpers";
import {
  printOverlayBegeleidingsbrief, printOverlayCMR, printOverlayAnnex7,
  printKalibratieTest, printBegeleidingsbrief
} from "../utils/formulierPrint";
import { laadKalibratie, bewaarKalibratie } from "../utils/formulierKalibratie";
import { BULTERS_PARTIJ } from "../data/bultersBedrijf";
import { zoekKlanten } from "../data/klanten";
import FormulierVoorbeeld from "./FormulierVoorbeeld";

const FORM_TABS = [
  { key: "begeleidingsbrief", label: "Begeleidingsbrief", icon: "📋" },
  { key: "cmr", label: "CMR", icon: "🚛" },
  { key: "annex7", label: "Annex VII", icon: "📑" },
];

function PartijVelden({ partij, onChange, titel }) {
  function set(veld, waarde) {
    onChange({ ...partij, [veld]: waarde });
  }
  return (
    <div className="form-partij-blok">
      <div className="form-partij-titel">{titel}</div>
      <div className="form-veld-grid">
        <div className="form-veld">
          <label>Naam / bedrijf</label>
          <input value={partij.naam} onChange={e => set("naam", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>Contactpersoon</label>
          <input value={partij.contactpersoon} onChange={e => set("contactpersoon", e.target.value)} />
        </div>
        <div className="form-veld form-veld-breed">
          <label>Adres</label>
          <input value={partij.adres} onChange={e => set("adres", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>Postcode</label>
          <input value={partij.postcode} onChange={e => set("postcode", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>Plaats</label>
          <input value={partij.plaats} onChange={e => set("plaats", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>Land</label>
          <input value={partij.land} onChange={e => set("land", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>BTW</label>
          <input value={partij.btw} onChange={e => set("btw", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>KvK</label>
          <input value={partij.kvk} onChange={e => set("kvk", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>VIHB</label>
          <input value={partij.vihb} onChange={e => set("vihb", e.target.value)} placeholder="Vervoerdersregistratie" />
        </div>
        <div className="form-veld">
          <label>Telefoon</label>
          <input value={partij.telefoon} onChange={e => set("telefoon", e.target.value)} />
        </div>
        <div className="form-veld">
          <label>E-mail</label>
          <input type="email" value={partij.email} onChange={e => set("email", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function FormulierenPagina({ klanten = [] }) {
  const [actieveTab, setActieveTab] = useState("begeleidingsbrief");
  const [data, setData] = useState(() => laadFormulierData());
  const [klantSelectie, setKlantSelectie] = useState({});
  const [zoekterm, setZoekterm] = useState("");
  const [toast, setToast] = useState(null);
  const [toonKalibratie, setToonKalibratie] = useState(false);
  const [kalibratie, setKalibratie] = useState(() => laadKalibratie("begeleidingsbrief"));

  useEffect(() => {
    bewaarFormulierData(data);
  }, [data]);

  useEffect(() => {
    setKalibratie(laadKalibratie(actieveTab));
  }, [actieveTab]);

  function updateKalibratie(veld, waarde) {
    const next = { ...kalibratie, [veld]: waarde };
    setKalibratie(next);
    bewaarKalibratie(actieveTab, next);
  }

  function toonToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function updateData(velden) {
    setData(prev => ({ ...prev, ...velden }));
  }

  function updatePartij(rol, partij) {
    setData(prev => ({
      ...prev,
      partijen: { ...prev.partijen, [rol]: partij },
    }));
  }

  function toggleKlant(id) {
    setKlantSelectie(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { rol: "ontvanger" };
      }
      return next;
    });
  }

  function setKlantRol(id, rol) {
    setKlantSelectie(prev => ({
      ...prev,
      [id]: { ...prev[id], rol },
    }));
  }

  function pasKlantenToe() {
    const ids = Object.keys(klantSelectie);
    if (ids.length === 0) {
      toonToast("Selecteer minstens één klant");
      return;
    }
    const nieuwePartijen = { ...data.partijen };
    ids.forEach(id => {
      const klant = klanten.find(k => k.id === Number(id));
      const rol = klantSelectie[id]?.rol;
      if (klant && rol) {
        nieuwePartijen[rol] = klantNaarPartij(klant);
      }
    });
    setData(prev => ({ ...prev, partijen: nieuwePartijen }));
    toonToast(`${ids.length} klant(en) toegepast ✓`);
  }

  function kiesKlantDirect(klant, rol) {
    updatePartij(rol, klantNaarPartij(klant));
    toonToast(`${klant.naam} → ${FORM_ROLLEN.find(r => r.key === rol)?.label}`);
  }

  function resetFormulier() {
    if (!confirm("Alle ingevulde gegevens wissen en opnieuw beginnen?")) return;
    setData(maakInitFormulierData());
    setKlantSelectie({});
    toonToast("Formulier gereset");
  }

  function nieuwDocument() {
    setData(prev => ({ ...prev, documentnummer: maakDocumentnummer() }));
    toonToast("Nieuw documentnummer");
  }

  function afdrukOverlay() {
    if (actieveTab === "begeleidingsbrief") printOverlayBegeleidingsbrief(data, kalibratie);
    else if (actieveTab === "cmr") printOverlayCMR(data, kalibratie);
    else printOverlayAnnex7(data, kalibratie);
    toonToast("Leg voorbedrukt formulier in de matrixprinter");
  }

  function afdrukPreview() {
    printBegeleidingsbrief(data);
  }

  const gefilterdeKlanten = zoekKlanten(klanten, zoekterm);

  return (
    <div className="formulieren-wrap">
      <div className="formulieren-klanten-panel panel">
        <div className="panel-header">
          <span className="panel-title">Klanten database</span>
          <span className="badge">{klanten.length}</span>
        </div>
        <div className="form-klanten-body">
          <input
            className="form-klanten-zoek"
            type="text"
            placeholder="🔍 Zoek klant..."
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
          />
          <p className="form-klanten-hint">
            Vink klanten aan, kies een rol en klik <strong>Toepassen</strong>. Of klik direct op een rol-knop.
          </p>
          <div className="form-klanten-lijst">
            {gefilterdeKlanten.length === 0 ? (
              <div className="form-klanten-leeg">Geen klanten gevonden</div>
            ) : gefilterdeKlanten.map(k => (
              <div key={k.id} className={`form-klant-regel${klantSelectie[k.id] ? " geselecteerd" : ""}`}>
                <label className="form-klant-check">
                  <input
                    type="checkbox"
                    checked={!!klantSelectie[k.id]}
                    onChange={() => toggleKlant(k.id)}
                  />
                  <span className="form-klant-naam">
                    {k.type === "zakelijk" ? "🏢" : "👤"} {k.naam}
                  </span>
                  {k.plaats && <span className="form-klant-plaats">{k.plaats}</span>}
                </label>
                {klantSelectie[k.id] && (
                  <select
                    className="form-klant-rol"
                    value={klantSelectie[k.id].rol}
                    onChange={e => setKlantRol(k.id, e.target.value)}
                  >
                    {FORM_ROLLEN.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                )}
                <div className="form-klant-snel">
                  {FORM_ROLLEN.map(r => (
                    <button
                      key={r.key}
                      className="form-klant-snel-btn"
                      title={`${k.naam} als ${r.label}`}
                      onClick={() => kiesKlantDirect(k, r.key)}
                    >{r.label[0]}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="save-btn form-toepassen-btn" onClick={pasKlantenToe}>
            ✓ Geselecteerde klanten toepassen
          </button>
        </div>
      </div>

      <div className="formulieren-main">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Formulieren</span>
            <div className="form-header-acties">
              <button className="form-sec-btn" onClick={nieuwDocument}>Nieuw nr.</button>
              <button className="form-sec-btn" onClick={resetFormulier}>Reset</button>
              <button className="form-sec-btn" onClick={() => setToonKalibratie(!toonKalibratie)}>
                {toonKalibratie ? "Kalibratie ▴" : "Kalibratie ▾"}
              </button>
              <button className="save-btn" onClick={afdrukOverlay}>🖨 Print op voorbedruk</button>
            </div>
          </div>

          <div className="rapport-tabs">
            {FORM_TABS.map(tab => (
              <button
                key={tab.key}
                className={`rtab${actieveTab === tab.key ? " active" : ""}`}
                onClick={() => setActieveTab(tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {toonKalibratie && (
            <div className="form-kalibratie-panel">
              <div className="form-kalibratie-titel">
                Matrixprinter kalibratie — Beurtvaartadres 12" kettingformulier
              </div>
              <div className="form-veld-grid form-veld-grid-compact">
                <div className="form-veld">
                  <label>Offset boven (mm)</label>
                  <input type="number" step="0.5" value={kalibratie.offsetBoven}
                    onChange={e => updateKalibratie("offsetBoven", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-veld">
                  <label>Offset links (mm)</label>
                  <input type="number" step="0.5" value={kalibratie.offsetLinks}
                    onChange={e => updateKalibratie("offsetLinks", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-veld">
                  <label>Lettergrootte (pt)</label>
                  <input type="number" min="7" max="14" value={kalibratie.fontSize}
                    onChange={e => updateKalibratie("fontSize", parseInt(e.target.value) || 10)} />
                </div>
                <div className="form-veld form-veld-check">
                  <label>
                    <input type="checkbox" checked={kalibratie.bondingRand}
                      onChange={e => updateKalibratie("bondingRand", e.target.checked)} />
                    Bonding-rand (+10mm)
                  </label>
                </div>
              </div>
              <div className="form-kalibratie-acties">
                <button className="form-sec-btn" onClick={() => printKalibratieTest(actieveTab, kalibratie)}>
                  Kalibratie-test printen
                </button>
                {actieveTab === "begeleidingsbrief" && (
                  <button className="form-sec-btn" onClick={afdrukPreview}>Voorbeeld op wit papier</button>
                )}
              </div>
              <p className="form-kalibratie-hint">
                Leg een leeg formulier in de printer. Print de kalibratie-test — de tekst tussen [haken] moet in de vakjes vallen.
                Pas offset aan tot het klopt. Instellingen worden per formulier opgeslagen.
              </p>
            </div>
          )}

          <div className="form-inhoud">
            <div className="form-algemeen">
              <div className="form-veld-grid form-veld-grid-compact">
                <div className="form-veld">
                  <label>Documentnummer</label>
                  <input value={data.documentnummer} onChange={e => updateData({ documentnummer: e.target.value })} />
                </div>
                <div className="form-veld">
                  <label>Datum</label>
                  <input value={data.datum} onChange={e => updateData({ datum: e.target.value })} />
                </div>
                <div className="form-veld">
                  <label>Plaats van opstellen</label>
                  <input value={data.plaatsOpstellen} onChange={e => updateData({ plaatsOpstellen: e.target.value })} />
                </div>
                {actieveTab === "cmr" && (
                  <div className="form-veld">
                    <label>CMR-nummer</label>
                    <input value={data.cmrNummer} onChange={e => updateData({ cmrNummer: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            <div className="form-partijen-sectie">
              <div className="form-sectie-kop">
                <span>Partijen</span>
                <button
                  className="form-sec-btn"
                  onClick={() => updatePartij("afzender", { ...BULTERS_PARTIJ })}
                >Bulters als afzender</button>
              </div>
              <PartijVelden
                titel="Afzender"
                partij={data.partijen.afzender}
                onChange={p => updatePartij("afzender", p)}
              />
              <PartijVelden
                titel="Ontvanger"
                partij={data.partijen.ontvanger}
                onChange={p => updatePartij("ontvanger", p)}
              />
              <PartijVelden
                titel="Transporteur"
                partij={data.partijen.transporteur}
                onChange={p => updatePartij("transporteur", p)}
              />
            </div>

            {actieveTab === "begeleidingsbrief" && (
              <div className="form-transport-sectie">
                <div className="form-sectie-kop"><span>Begeleidingsbrief — extra vakken</span></div>
                <div className="form-veld-grid">
                  <div className="form-veld">
                    <label>Afvalstroomnummer</label>
                    <input value={data.afvalstroomnummer} onChange={e => updateData({ afvalstroomnummer: e.target.value })} />
                  </div>
                  <div className="form-veld">
                    <label>Locatie herkomst (vak 3b)</label>
                    <input value={data.locatieHerkomst} onChange={e => updateData({ locatieHerkomst: e.target.value })} placeholder="Adres of locatieomschrijving" />
                  </div>
                  <div className="form-veld">
                    <label>Verwerkingsmethode</label>
                    <input value={data.verwerkingsmethode} onChange={e => updateData({ verwerkingsmethode: e.target.value })} placeholder="bv. D, R12" />
                  </div>
                </div>
                <PartijVelden
                  titel="Ontdoener (vak 3a)"
                  partij={data.ontdoener}
                  onChange={p => updateData({ ontdoener: p })}
                />
              </div>
            )}

            <div className="form-transport-sectie">
              <div className="form-sectie-kop"><span>Transport &amp; lading</span></div>
              <div className="form-veld-grid">
                <div className="form-veld form-veld-breed">
                  <label>Omschrijving afvalstof / goederen</label>
                  <input value={data.afvalstof} onChange={e => updateData({ afvalstof: e.target.value })} placeholder="bv. Schroot koper, gemengd metaal..." />
                </div>
                <div className="form-veld">
                  <label>Eural / EWC-code</label>
                  <input value={data.ewcCode} onChange={e => updateData({ ewcCode: e.target.value })} placeholder="bv. 17 04 01" />
                </div>
                {actieveTab === "annex7" && (
                  <div className="form-veld">
                    <label>Basel-code</label>
                    <input value={data.baselCode} onChange={e => updateData({ baselCode: e.target.value })} />
                  </div>
                )}
                <div className="form-veld">
                  <label>Gewicht (kg)</label>
                  <input type="number" min="0" value={data.gewicht} onChange={e => updateData({ gewicht: e.target.value })} />
                </div>
                <div className="form-veld">
                  <label>Aantal colli</label>
                  <input value={data.aantalColli} onChange={e => updateData({ aantalColli: e.target.value })} />
                </div>
                <div className="form-veld">
                  <label>Verpakking</label>
                  <input value={data.verpakking} onChange={e => updateData({ verpakking: e.target.value })} />
                </div>
                <div className="form-veld">
                  <label>Kenteken voertuig</label>
                  <input value={data.kenteken} onChange={e => updateData({ kenteken: e.target.value })} placeholder="XX-XXX-X" />
                </div>
                {actieveTab === "annex7" && (
                  <div className="form-veld">
                    <label>UN-nummer</label>
                    <input value={data.unNummer} onChange={e => updateData({ unNummer: e.target.value })} />
                  </div>
                )}
                <div className="form-veld form-veld-breed">
                  <label>Bijgevoegde documenten</label>
                  <input value={data.bijlagen} onChange={e => updateData({ bijlagen: e.target.value })} placeholder="bv. Begeleidingsbrief, factuur..." />
                </div>
                <div className="form-veld form-veld-breed">
                  <label>Opmerkingen / bijzonderheden</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={data.opmerkingen}
                    onChange={e => updateData({ opmerkingen: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <FormulierVoorbeeld formType={actieveTab} data={data} kalibratie={kalibratie} />

            <div className="form-preview-hint">
              {actieveTab === "begeleidingsbrief" && "Posities afgeleid van het officiële LMA/Beurtvaartadres formulier. Print op 4-doorslagen kettingformulier (240×304,8 mm, 12 inch)."}
              {actieveTab === "cmr" && "CMR-posities volgens standaard 24-vakken layout. Alleen het eerste (rode) exemplaar invullen."}
              {actieveTab === "annex7" && "Overlay-print op Annex VII formulier. Kalibreer eerst met de testprint."}
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
