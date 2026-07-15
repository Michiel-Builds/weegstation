import { useState, useEffect } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { controleerWachtwoord } from "../utils/auth";
import { laadAuthConfig } from "../utils/authStore";
import { laadBedrijfConfig } from "../utils/bedrijfConfig";

export default function MobieleLoginScherm({ onLogin }) {
  const [pass, setPass] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [chauffeurNaam, setChauffeurNaam] = useState("");

  useEffect(() => {
    laadBedrijfConfig().then(cfg => setBedrijfsnaam(cfg?.bedrijfsnaam || ""));
    laadAuthConfig().then(cfg => setChauffeurNaam(cfg?.naam || "Chauffeur"));
  }, []);

  async function probeerLogin() {
    if (bezig) return;
    setBezig(true);
    setFout("");
    try {
      const cfg = await laadAuthConfig();
      if (!cfg?.wachtwoordHash) {
        setFout("App is niet ingesteld. Herinstalleer of doorloop setup opnieuw.");
        return;
      }
      if (await controleerWachtwoord(pass, cfg.wachtwoordHash)) {
        onLogin({ gebruikersnaam: cfg.gebruikersnaam, naam: cfg.naam, rol: cfg.rol || "Chauffeur" });
      } else {
        setFout("Onjuist wachtwoord.");
      }
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="login-wrap mobile-safe">
      <div className="login-card">
        <div className="login-logo-name">{PRODUCT_NAAM}</div>
        <div className="login-bedrijf">{bedrijfsnaam || "Weegsysteem"}</div>
        <div className="login-divider" />
        <p className="setup-hint" style={{ marginBottom: 8 }}>Inloggen als {chauffeurNaam}</p>
        {fout && <div className="login-err">{fout}</div>}
        <label className="login-label">Wachtwoord</label>
        <input
          className="login-input"
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setFout(""); }}
          onKeyDown={e => e.key === "Enter" && probeerLogin()}
          autoFocus
        />
        <button className="login-btn" onClick={probeerLogin} disabled={bezig}>
          {bezig ? "Bezig…" : "Inloggen →"}
        </button>
      </div>
    </div>
  );
}
