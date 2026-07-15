import { useState, useEffect } from "react";
import { laadServerIP, laadServerKey, bewaarServerIP, bewaarServerKey } from "../utils/weegserver";
import {
  laadKantoorSyncConfig, bewaarKantoorSyncConfig, testKantoorSync, haalKlantenVanKantoor,
} from "../utils/mobileSync";

export default function MobieleInstellingen({ verbonden, onSluiten, onToegepast }) {
  const [ip, setIp] = useState(() => laadServerIP());
  const [key, setKey] = useState(() => laadServerKey());
  const [kantoorIp, setKantoorIp] = useState("");
  const [kantoorToken, setKantoorToken] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    laadKantoorSyncConfig().then(cfg => {
      setKantoorIp(cfg.ip);
      setKantoorToken(cfg.token);
    });
  }, []);

  async function opslaan() {
    bewaarServerIP(ip.trim());
    bewaarServerKey(key.trim());
    await bewaarKantoorSyncConfig(kantoorIp.trim(), kantoorToken.trim());
    onToegepast?.();
    onSluiten?.();
  }

  async function testSync() {
    setSyncStatus("Testen…");
    const res = await testKantoorSync(kantoorIp, kantoorToken);
    if (res.ok) {
      const kl = await haalKlantenVanKantoor(kantoorIp, kantoorToken);
      const n = Array.isArray(kl.data) ? kl.data.length : 0;
      setSyncStatus(`Kantoor OK · ${n} klanten`);
    } else {
      setSyncStatus("Sync mislukt: " + (res.fout || ""));
    }
  }

  return (
    <div className="mobile-settings-backdrop" onClick={onSluiten}>
      <div className="mobile-settings-panel" onClick={e => e.stopPropagation()}>
        <h3>Weegserver</h3>
        <p className="setup-hint">
          Status: {verbonden ? "● Verbonden" : "○ Niet verbonden"}
        </p>
        <label className="login-label">IP-adres</label>
        <input className="login-input" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.10.50" />
        <label className="login-label">API-sleutel</label>
        <input className="login-input" type="password" value={key} onChange={e => setKey(e.target.value)} />

        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Kantoor sync (optioneel)</h4>
        <p className="setup-hint">Token staat in %LOCALAPPDATA%\WeegStation\sync-api-token.txt op de kantoor-PC.</p>
        <label className="login-label">Kantoor-PC IP</label>
        <input className="login-input" value={kantoorIp} onChange={e => setKantoorIp(e.target.value)} placeholder="192.168.10.10" />
        <label className="login-label">Sync-token</label>
        <input className="login-input" type="password" value={kantoorToken} onChange={e => setKantoorToken(e.target.value)} />
        {syncStatus && <p className="setup-hint">{syncStatus}</p>}
        <button type="button" className="login-btn secundair" style={{ maxWidth: "100%", marginTop: 8 }} onClick={testSync}>
          Test kantoor-verbinding
        </button>

        <div className="mobile-settings-actions">
          <button type="button" className="login-btn secundair" onClick={onSluiten}>Annuleren</button>
          <button type="button" className="login-btn" onClick={opslaan}>Opslaan</button>
        </div>
      </div>
    </div>
  );
}
