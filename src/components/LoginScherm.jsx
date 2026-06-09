import { useState } from "react";
import { APP_NAAM, BEDRIJF_NAAM, GEBRUIKERS } from "../data/stamdata";

export default function LoginScherm({ onLogin }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [fout, setFout] = useState("");

  function probeerLogin() {
    const gevonden = GEBRUIKERS.find(
      g => g.gebruikersnaam === user.trim().toLowerCase() && g.wachtwoord === pass
    );
    if (gevonden) onLogin(gevonden);
    else setFout("Onjuiste gebruikersnaam of wachtwoord.");
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
        <button className="login-btn" onClick={probeerLogin}>Inloggen →</button>
      </div>
    </div>
  );
}
