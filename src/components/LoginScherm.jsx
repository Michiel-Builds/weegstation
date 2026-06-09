import { useState } from "react";
import { APP_NAAM, BEDRIJF_NAAM, GEBRUIKERS } from "../data/stamdata";
import { controleerWachtwoord } from "../utils/auth";

export default function LoginScherm({ onLogin }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function probeerLogin() {
    if (bezig) return;
    setBezig(true);
    setFout("");
    try {
      const naam = user.trim().toLowerCase();
      const gevonden = GEBRUIKERS.find(g => g.gebruikersnaam === naam);
      if (gevonden && await controleerWachtwoord(pass, gevonden.wachtwoordHash)) {
        const { wachtwoordHash, ...zonderHash } = gevonden;
        onLogin(zonderHash);
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
        <div className="login-logo-name">{APP_NAAM}</div>
        <div className="login-bedrijf">{BEDRIJF_NAAM}</div>
        <div className="login-divider" />
        {fout && <div className="login-err">{fout}</div>}
        <label className="login-label">Gebruikersnaam</label>
        <input
          className="login-input"
          value={user}
          onChange={e => { setUser(e.target.value); setFout(""); }}
          onKeyDown={e => e.key === "Enter" && probeerLogin()}
          autoFocus
          placeholder="gebruikersnaam"
        />
        <label className="login-label">Wachtwoord</label>
        <input
          className="login-input"
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setFout(""); }}
          onKeyDown={e => e.key === "Enter" && probeerLogin()}
          placeholder="••••••••"
        />
        <button className="login-btn" onClick={probeerLogin} disabled={bezig}>
          {bezig ? "Bezig…" : "Inloggen →"}
        </button>
      </div>
    </div>
  );
}
