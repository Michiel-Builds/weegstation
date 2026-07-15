import { useState } from "react";
import { PRODUCT_NAAM } from "../data/product";
import { hashWachtwoord } from "../utils/auth";
import { bewaarServerIP, bewaarServerKey } from "../utils/weegserver";
import { maakMobieleChauffeurAuth } from "../utils/mobileAuth";

export default function MobieleSetup({ onKlaar }) {
  const [serverIp, setServerIp] = useState("192.168.10.50");
  const [serverKey, setServerKey] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [chauffeurNaam, setChauffeurNaam] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function opslaan() {
    setFout("");
    if (!serverIp.trim()) { setFout("Vul het weegserver IP-adres in."); return; }
    if (!serverKey.trim()) { setFout("Vul de API-sleutel in (zelfde als op de weegbrug-PC)."); return; }
    if (!chauffeurNaam.trim()) { setFout("Vul een chauffeursnaam in."); return; }
    if (wachtwoord.length < 4) { setFout("Wachtwoord minimaal 4 tekens."); return; }
    if (wachtwoord !== bevestig) { setFout("Wachtwoorden komen niet overeen."); return; }

    setBezig(true);
    try {
      bewaarServerIP(serverIp.trim());
      bewaarServerKey(serverKey.trim());
      const cfg = await maakMobieleChauffeurAuth({
        naam: chauffeurNaam,
        wachtwoord,
        bedrijfsnaam,
      });
      onKlaar(cfg);
    } catch (e) {
      setFout("Opslaan mislukt: " + (e.message || e));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="login-wrap mobile-safe">
      <div className="login-card mobile-setup-card">
        <div className="login-logo-name">{PRODUCT_NAAM}</div>
        <div className="login-bedrijf">Mobiele setup</div>
        <div className="login-divider" />
        <p className="setup-hint" style={{ marginBottom: 12 }}>
          Koppel deze telefoon aan de weegserver op het bedrijfsnetwerk (WiFi/LAN).
        </p>
        {fout && <div className="login-err">{fout}</div>}

        <label className="login-label">Weegserver IP</label>
        <input className="login-input" value={serverIp} onChange={e => setServerIp(e.target.value)} placeholder="192.168.10.50" />

        <label className="login-label">API-sleutel</label>
        <input className="login-input" type="password" value={serverKey} onChange={e => setServerKey(e.target.value)} placeholder="WEEGSERVER_KEY uit .env" />

        <label className="login-label">Bedrijfsnaam (optioneel)</label>
        <input className="login-input" value={bedrijfsnaam} onChange={e => setBedrijfsnaam(e.target.value)} placeholder="Jansen Metaal" />

        <label className="login-label">Jouw naam (chauffeur)</label>
        <input className="login-input" value={chauffeurNaam} onChange={e => setChauffeurNaam(e.target.value)} placeholder="Jan de Vries" />

        <label className="login-label">Wachtwoord (lokaal op telefoon)</label>
        <input className="login-input" type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} />

        <label className="login-label">Bevestig wachtwoord</label>
        <input className="login-input" type="password" value={bevestig} onChange={e => setBevestig(e.target.value)} />

        <button className="login-btn" onClick={opslaan} disabled={bezig}>
          {bezig ? "Bezig…" : "App instellen →"}
        </button>
      </div>
    </div>
  );
}
