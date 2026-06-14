import { useState } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { bewaarBedrijfConfig } from "../utils/bedrijfConfig";
import { pasThemaToe } from "../utils/thema";
import { DEFAULT_ACCENT, DEFAULT_ACCENT2, DEFAULT_ACCENT_LIGHT, DEFAULT_ACCENT2_LIGHT } from "../data/product";

export default function InstellingenPagina({ bedrijf, onBijgewerkt, onToast }) {
  const [cfg, setCfg] = useState({ ...bedrijf });
  const [bezig, setBezig] = useState(false);

  function update(veld, waarde) {
    setCfg(prev => ({ ...prev, [veld]: waarde }));
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

        <button className="login-btn" style={{ maxWidth: 280 }} onClick={opslaan} disabled={bezig}>
          {bezig ? "Bezig…" : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
