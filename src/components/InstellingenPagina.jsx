import { useState } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { bewaarBedrijfConfig } from "../utils/bedrijfConfig";
import { exporteerBackup } from "../utils/opslag";
import { pasThemaToe } from "../utils/thema";
import { DEFAULT_ACCENT, DEFAULT_ACCENT2, DEFAULT_ACCENT_LIGHT, DEFAULT_ACCENT2_LIGHT } from "../data/product";

export default function InstellingenPagina({ bedrijf, onBijgewerkt, onToast }) {
  const [cfg, setCfg] = useState({ ...bedrijf });
  const [bezig, setBezig] = useState(false);

  function update(veld, waarde) {
    setCfg(prev => ({ ...prev, [veld]: waarde }));
  }

  function updateLma(veld, waarde) {
    setCfg(prev => ({ ...prev, lma: { ...(prev.lma || {}), [veld]: waarde } }));
  }

  function kiesThema(t) {
    const licht = t === "light";
    setCfg(prev => ({
      ...prev,
      thema: t,
      accent: licht ? DEFAULT_ACCENT_LIGHT : DEFAULT_ACCENT,
      accent2: licht ? DEFAULT_ACCENT2_LIGHT : DEFAULT_ACCENT2,
    }));
  }

  async function opslaan() {
    if (!cfg.bedrijfsnaam?.trim()) {
      onToast?.("Vul een bedrijfsnaam in");
      return;
    }
    setBezig(true);
    try {
      const opgeslagen = await bewaarBedrijfConfig(cfg);
      pasThemaToe(opgeslagen);
      onBijgewerkt(opgeslagen);
      onToast?.("Instellingen opgeslagen ✓");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Instellingen</span>
        <span className="badge">{PRODUCT_NAAM}</span>
      </div>
      <div className="instellingen-body">
        <label className="login-label">Bedrijfsnaam</label>
        <input className="login-input" value={cfg.bedrijfsnaam} onChange={e => update("bedrijfsnaam", e.target.value)} />

        <label className="login-label">Thema</label>
        <div className="thema-kiezer">
          <button type="button" className={`thema-btn${cfg.thema === "dark" ? " actief" : ""}`} onClick={() => kiesThema("dark")}>Donker</button>
          <button type="button" className={`thema-btn${cfg.thema === "light" ? " actief" : ""}`} onClick={() => kiesThema("light")}>Licht</button>
        </div>

        <div className="kleur-rij">
          <div>
            <label className="login-label">Hoofdkleur</label>
            <input type="color" className="kleur-input" value={cfg.accent} onChange={e => update("accent", e.target.value)} />
          </div>
          <div>
            <label className="login-label">Accentkleur</label>
            <input type="color" className="kleur-input" value={cfg.accent2} onChange={e => update("accent2", e.target.value)} />
          </div>
        </div>

        <p className="setup-hint">Kleuren worden direct toegepast na opslaan. Wachtwoord wijzigen: neem contact op met beheer.</p>

        <h3 style={{ marginTop: 24, marginBottom: 4 }}>LMA / AMICE</h3>
        <p className="setup-hint">Gegevens voor de meldingen bij het Landelijk Meldpunt Afvalstoffen.</p>

        <label className="login-label">Verwerkersnummer (5 tekens)</label>
        <input className="login-input" value={cfg.lma?.verwerkersnummer || ""} maxLength={5}
          onChange={e => updateLma("verwerkersnummer", e.target.value.toUpperCase())}
          placeholder="bv. 12345" />

        <label className="login-label">Eigen AMICE-bedrijfsnummer</label>
        <input className="login-input" value={cfg.lma?.bedrijfsnummer || ""}
          onChange={e => updateLma("bedrijfsnummer", e.target.value)} />

        <label className="login-label">KvK-nummer</label>
        <input className="login-input" value={cfg.lma?.kvk || ""}
          onChange={e => updateLma("kvk", e.target.value)} />

        <label className="login-label">Vestigingsadres</label>
        <input className="login-input" value={cfg.lma?.adres || ""}
          onChange={e => updateLma("adres", e.target.value)} />

        <div className="kleur-rij">
          <div>
            <label className="login-label">Postcode</label>
            <input className="login-input" value={cfg.lma?.postcode || ""}
              onChange={e => updateLma("postcode", e.target.value)} />
          </div>
          <div>
            <label className="login-label">Plaats</label>
            <input className="login-input" value={cfg.lma?.plaats || ""}
              onChange={e => updateLma("plaats", e.target.value)} />
          </div>
        </div>

        <label className="login-label">AMICE-omgeving</label>
        <div className="thema-kiezer">
          <button type="button" className={`thema-btn${(cfg.lma?.omgeving || "bto") === "bto" ? " actief" : ""}`} onClick={() => updateLma("omgeving", "bto")}>BTO (test)</button>
          <button type="button" className={`thema-btn${cfg.lma?.omgeving === "productie" ? " actief" : ""}`} onClick={() => updateLma("omgeving", "productie")}>Productie</button>
        </div>

        <label className="login-label">XML-certificaat (.pfx/.p12) pad</label>
        <input className="login-input" value={cfg.lma?.pfxPad || ""}
          onChange={e => updateLma("pfxPad", e.target.value)} placeholder="C:\\...\\certificaat.pfx" />

        <label className="login-label">Root CA (.cer) pad</label>
        <input className="login-input" value={cfg.lma?.caPad || ""}
          onChange={e => updateLma("caPad", e.target.value)} placeholder="C:\\...\\root_certificaat.cer" />

        <div className="kleur-rij">
          <div>
            <label className="login-label">Certificaat-wachtwoord</label>
            <input className="login-input" type="password" value={cfg.lma?.certWachtwoord || ""}
              onChange={e => updateLma("certWachtwoord", e.target.value)} />
          </div>
          <div>
            <label className="login-label">Certificaat verloopt op</label>
            <input className="login-input" type="date" value={cfg.lma?.certVerloopt || ""}
              onChange={e => updateLma("certVerloopt", e.target.value)} />
          </div>
        </div>

        <button className="login-btn" style={{ maxWidth: 280 }} onClick={opslaan} disabled={bezig}>
          {bezig ? "Bezig…" : "Opslaan"}
        </button>

        <h3 style={{ marginTop: 24, marginBottom: 4 }}>Back-up</h3>
        <p className="setup-hint">Exporteer alle wettelijk te bewaren gegevens (wegingen, afvalstromen, meldingen, begeleidingsbrieven) naar een back-upbestand.</p>
        <button className="login-btn" style={{ maxWidth: 280 }} onClick={async () => {
          const res = await exporteerBackup();
          onToast?.(res?.ok ? "Back-up opgeslagen ✓" : (res?.geannuleerd ? "Back-up geannuleerd" : ("Back-up mislukt: " + (res?.fout || ""))));
        }}>Back-up exporteren</button>
      </div>
    </div>
  );
}
