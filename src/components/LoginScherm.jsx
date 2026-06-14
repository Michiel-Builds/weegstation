import { useState, useEffect } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { controleerWachtwoord } from "../utils/auth";
import { laadAuthConfig } from "../utils/authStore";
import { laadBedrijfConfig } from "../utils/bedrijfConfig";

export default function LoginScherm({ onLogin }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");

  useEffect(() => {
    laadBedrijfConfig().then(cfg => setBedrijfsnaam(cfg?.bedrijfsnaam || ""));
  }, []);

  async function probeerLogin() {
    if (bezig) return;
    setBezig(true);
    setFout("");
    try {
      const cfg = await laadAuthConfig();
      const naam = user.trim().toLowerCase();
      if (
        cfg &&
        cfg.gebruikersnaam === naam &&
        await controleerWachtwoord(pass, cfg.wachtwoordHash)
      ) {
        onLogin({ gebruikersnaam: cfg.gebruikersnaam, naam: cfg.naam, rol: cfg.rol });
      } else {
        setFout("Onjuiste gebruikersnaam of wachtwoord.");
      }
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo-name">{PRODUCT_NAAM}</div>
        <div className="login-bedrijf">{bedrijfsnaam || "Weegsysteem"}</div>
        <div className="login-divider" />
        {fout && <div className="login-err">{fout}</div>}
        <label className="login-label">Gebruikersnaam</label>
        <input
          className="login-input"
          value={user}
          onChange={e => { setUser(e.target.value); setFout(""); }}
          onKeyDown={e => e.key === "Enter" && probeerLogin()}
          autoFocus
        />
        <label className="login-label">Wachtwoord</label>
        <input
          className="login-input"
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setFout(""); }}
          onKeyDown={e => e.key === "Enter" && probeerLogin()}
        />
        <button className="login-btn" onClick={probeerLogin} disabled={bezig}>
          {bezig ? "Bezig…" : "Inloggen →"}
        </button>
      </div>
    </div>
  );
}
