import { useState } from "react";
import { MATERIALEN } from "../data/stamdata";

export default function ChauffeurScherm({
  gebruiker, onLogout, onWeging,
  gewichtWeegbrug, gewichtLoods, serverVerbonden = false,
}) {
  const [kenteken, setKenteken]         = useState("");
  const [materiaal, setMateriaal]       = useState(null);
  const [bezig, setBezig]               = useState(false);
  const [bevestigd, setBevestigd]       = useState(null);
  const [gebruikLoods, setGebruikLoods] = useState(false);

  const gewicht = gebruikLoods ? gewichtLoods : gewichtWeegbrug;
  const stabiel = gewicht !== null && gewicht > 0;

  function registreer() {
    if (!kenteken.trim() || !materiaal || !gewicht) return;
    setBezig(true);
    setTimeout(() => {
      const weging = {
        id: Date.now(),
        kenteken: kenteken.trim().toUpperCase(),
        materiaal,
        gewicht,
        tijd:  new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        datum: new Date().toLocaleDateString("nl-NL"),
        bron:  gebruikLoods ? "loods" : "weegbrug",
        isNieuw: true,
      };
      onWeging(weging);
      setBevestigd(weging);
      setBezig(false);
      setTimeout(() => { setKenteken(""); setMateriaal(null); setBevestigd(null); }, 4000);
    }, 300);
  }

  const kanRegistreren = kenteken.trim().length >= 3 && materiaal && stabiel && !bezig && !bevestigd;

  return (
    <div className="weeg-wrap">
      <div className="weeg-card">
        <div className="weeg-header">
          <div className="weeg-header-left">
            <span className="weeg-bedrijf">Metaalrecycling Bulters</span>
            <span className="weeg-title">⚖ Weegpunt</span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "var(--mono)" }}>
            {gebruiker.naam}
          </span>
        </div>
        <div className="weeg-body">
          {bevestigd ? (
            <div className="weeg-bevestiging">
              <div className="bevestiging-icon">✅</div>
              <div className="bevestiging-titel">Weging geregistreerd!</div>
              <div className="bevestiging-sub">
                {bevestigd.kenteken} · {bevestigd.materiaal.naam} · {bevestigd.gewicht.toLocaleString("nl-NL")} kg
              </div>
            </div>
          ) : (
            <>
              <div className="weeg-section">
                <span className="weeg-section-label">1. Kenteken voertuig</span>
                <input
                  className="weeg-input"
                  placeholder="NL-AB-123"
                  value={kenteken}
                  onChange={e => setKenteken(e.target.value)}
                  maxLength={10}
                  autoFocus
                />
              </div>
              <div className="weeg-section">
                <span className="weeg-section-label">2. Kies materiaalsoort</span>
                <div className="materiaal-grid">
                  {MATERIALEN.map(m => (
                    <button
                      key={m.id}
                      className={`materiaal-btn${materiaal?.id === m.id ? " geselecteerd" : ""}`}
                      onClick={() => setMateriaal(m)}
                    >
                      <div className="materiaal-dot" style={{ background: m.kleur }} />
                      <span className="materiaal-naam">{m.naam}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="weeg-section">
                <span className="weeg-section-label">3. Gewicht</span>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setGebruikLoods(false)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${!gebruikLoods ? "var(--accent2)" : "var(--border)"}`, background: !gebruikLoods ? "rgba(46,125,50,0.12)" : "var(--surface2)", color: !gebruikLoods ? "var(--accent2)" : "var(--muted)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}
                  >Weegbrug</button>
                  <button
                    onClick={() => setGebruikLoods(true)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${gebruikLoods ? "var(--accent2)" : "var(--border)"}`, background: gebruikLoods ? "rgba(46,125,50,0.12)" : "var(--surface2)", color: gebruikLoods ? "var(--accent2)" : "var(--muted)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}
                  >Loods schaal</button>
                </div>
                <div className="gewicht-display">
                  {gewicht !== null ? (
                    <>
                      <span className="gewicht-getal">{gewicht.toLocaleString("nl-NL")}</span>
                      <span className="gewicht-eenheid">kg</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--muted)" }}>
                      Wachten op weegbrug...
                    </span>
                  )}
                </div>
                {gewicht !== null && (
                  <div className="gewicht-status">
                    {serverVerbonden ? "✓ Live gewicht ontvangen" : "⚠ Geen serververbinding"}
                  </div>
                )}
              </div>
              <button
                className={`weeg-btn${bezig ? " bezig" : ""}`}
                onClick={registreer}
                disabled={!kanRegistreren}
              >
                {bezig ? "Registreren..." : "✓ Weging registreren"}
              </button>
            </>
          )}
        </div>
        <div className="weeg-footer">
          <span className="weeg-user">Ingelogd als: {gebruiker.naam}</span>
          <button className="logout-btn" onClick={onLogout}>Uitloggen</button>
        </div>
      </div>
    </div>
  );
}
