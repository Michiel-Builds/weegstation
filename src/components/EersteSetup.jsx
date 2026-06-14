import { useState } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { hashWachtwoord } from "../utils/auth";
import { bewaarAuthConfig } from "../utils/authStore";
import { bewaarBedrijfConfig } from "../utils/bedrijfConfig";
import { genereerWeegserverSleutel } from "../utils/sleutel";
import { bewaarServerKey } from "../utils/weegserver";
import { DEFAULT_ACCENT, DEFAULT_ACCENT2, DEFAULT_ACCENT_LIGHT, DEFAULT_ACCENT2_LIGHT } from "../data/product";

export default function EersteSetup({ onKlaar }) {
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [gebruiker, setGebruiker] = useState("admin");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [thema, setThema] = useState("dark");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [accent2, setAccent2] = useState(DEFAULT_ACCENT2);
  const [sleutel] = useState(() => genereerWeegserverSleutel());
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  function kiesThema(t) {
    setThema(t);
    if (t === "light") {
      setAccent(DEFAULT_ACCENT_LIGHT);
      setAccent2(DEFAULT_ACCENT2_LIGHT);
    } else {
      setAccent(DEFAULT_ACCENT);
      setAccent2(DEFAULT_ACCENT2);
    }
  }

  async function voltooi() {
    setFout("");
    if (!bedrijfsnaam.trim()) {
      setFout("Vul uw bedrijfsnaam in.");
      return;
    }
    if (!gebruiker.trim()) {
      setFout("Vul een gebruikersnaam in.");
      return;
    }
    if (wachtwoord.length < 8) {
      setFout("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (wachtwoord !== bevestig) {
      setFout("Wachtwoorden komen niet overeen.");
      return;
    }
    setBezig(true);
    try {
      const wachtwoordHash = await hashWachtwoord(wachtwoord);
      const cfg = {
        bedrijfsnaam: bedrijfsnaam.trim(),
        thema,
        accent,
        accent2,
      };
      await bewaarBedrijfConfig(cfg);
      await bewaarAuthConfig({
        gebruikersnaam: gebruiker.trim().toLowerCase(),
        naam: "Beheerder",
        rol: "Admin",
        wachtwoordHash,
      });
      bewaarServerKey(sleutel);
      onKlaar(cfg);
    } catch {
      setFout("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card setup-card">
        <div className="login-logo-name">{PRODUCT_NAAM}</div>
        <div className="login-bedrijf">Welkom — stel uw bedrijf in</div>
        <div className="login-divider" />
        {fout && <div className="login-err">{fout}</div>}

        <label className="login-label">Bedrijfsnaam</label>
        <input className="login-input" value={bedrijfsnaam} onChange={e => setBedrijfsnaam(e.target.value)} autoFocus placeholder="Uw bedrijfsnaam" />

        <label className="login-label">Gebruikersnaam beheerder</label>
        <input className="login-input" value={gebruiker} onChange={e => setGebruiker(e.target.value)} placeholder="admin" />

        <label className="login-label">Wachtwoord (min. 8 tekens)</label>
        <input className="login-input" type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} />

        <label className="login-label">Bevestig wachtwoord</label>
        <input className="login-input" type="password" value={bevestig} onChange={e => setBevestig(e.target.value)} />

        <label className="login-label">Thema</label>
        <div className="thema-kiezer">
          <button type="button" className={`thema-btn${thema === "dark" ? " actief" : ""}`} onClick={() => kiesThema("dark")}>Donker</button>
          <button type="button" className={`thema-btn${thema === "light" ? " actief" : ""}`} onClick={() => kiesThema("light")}>Licht</button>
        </div>

        <div className="kleur-rij">
          <label className="login-label">Hoofdkleur</label>
          <input type="color" className="kleur-input" value={accent} onChange={e => setAccent(e.target.value)} />
          <label className="login-label">Accentkleur</label>
          <input type="color" className="kleur-input" value={accent2} onChange={e => setAccent2(e.target.value)} />
        </div>

        <div className="setup-sleutel-box">
          <div className="login-label">Weegserver-sleutel</div>
          <code className="setup-sleutel">{sleutel}</code>
          <p className="setup-hint">Op weegbrug-PC in <strong>.env</strong>: <code>WEEGSERVER_KEY={sleutel}</code></p>
          <button type="button" className="setup-kopie-btn" onClick={() => navigator.clipboard?.writeText(sleutel)}>Kopiëren</button>
        </div>

        <button className="login-btn" onClick={voltooi} disabled={bezig}>
          {bezig ? "Bezig…" : "Installatie voltooien →"}
        </button>
      </div>
    </div>
  );
}
