import { useState, useEffect, useRef } from "react";
import { MATERIALEN } from "../data/stamdata";
import KlantAutocomplete from "./KlantAutocomplete";
import {
  zorgVoorDagSnapshot, vandaagDatumKey,
  getOpbrengstPrijsVoorDatum, laadOpbrengstDagSnapshots,
} from "../utils/opbrengstDag";

function fmt(n) { return Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtI(n) { return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 }); }

function maakBonnummerWeging(id) {
  const nu = new Date();
  return "W-" + nu.getFullYear() +
    String(nu.getMonth() + 1).padStart(2, "0") +
    String(nu.getDate()).padStart(2, "0") +
    "-" + String(id).padStart(3, "0");
}

function maakLegeKlant(id) {
  return {
    id, naam: "", materiaalId: "",
    vol: null, leeg: null, netto: 0, weegTijd: null,
    bevestigd: false, richting: "inkomend",
  };
}

function richtingLabel(richting) {
  return richting === "uitgaand" ? "Uitgaand" : "Inkomend";
}

export default function WeegPagina({
  gewichtWeegbrug, gewichtLoods,
  serverVerbonden,
  onWeging, wegingen = [], prijzen = {}, opbrengst = {}, klanten = [],
}) {
  const [klantenLijst, setKlantenLijst] = useState(() =>
    Array.from({ length: 5 }, (_, i) => maakLegeKlant(i + 1))
  );
  const [actieveBron, setActieveBron] = useState("weegbrug");
  const [toast, setToast] = useState(null);
  const idRef = useRef(6);

  const huidigGewicht = actieveBron === "weegbrug" ? gewichtWeegbrug : gewichtLoods;

  // Luister naar globale klant-selectie
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.__newtonGeselecteerdeKlant) {
        const k = window.__newtonGeselecteerdeKlant;
        window.__newtonGeselecteerdeKlant = null;
        setKlantenLijst(prev => {
          const nieuweLijst = [...prev];
          const doelIdx = nieuweLijst.findIndex(kk => !kk.naam);
          const idx = doelIdx !== -1 ? doelIdx : 0;
          nieuweLijst[idx] = { ...nieuweLijst[idx], naam: k.naam };
          return nieuweLijst;
        });
        toonToast(`✓ ${k.naam} ingevuld`);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  function toonToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }
  function updateKlant(id, veld, waarde) {
    setKlantenLijst(prev => prev.map(k => k.id === id ? { ...k, [veld]: waarde } : k));
  }
  function setNaam(id, naam) {
    setKlantenLijst(prev => prev.map(k => k.id === id ? { ...k, naam } : k));
  }
  function berekenNetto(k) {
    const v = parseFloat(k.vol) || 0;
    const l = parseFloat(k.leeg) || 0;
    return Math.max(0, v - l);
  }

  function weegNu(id, type) {
    if (huidigGewicht === null || huidigGewicht === undefined || huidigGewicht === 0) {
      toonToast("⚠ Wacht op weegbrug...");
      return;
    }
    setKlantenLijst(prev => prev.map(k => {
      if (k.id !== id) return k;
      const updated = { ...k, [type]: String(huidigGewicht) };
      updated.netto = berekenNetto(updated);
      updated.weegTijd = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
      return updated;
    }));
    const label = type === "vol" ? "Vol" : "Leeg";
    toonToast(`✓ ${label} gewogen: ${fmtI(huidigGewicht)} kg`);
  }

  function voegKlantToe() {
    const nieuweId = idRef.current++;
    setKlantenLijst(prev => [...prev, maakLegeKlant(nieuweId)]);
    setTimeout(() => {
      const el = document.querySelector(`[data-klant-id="${nieuweId}"] [data-veld="naam"]`);
      if (el) el.focus();
    }, 50);
  }
  function verwijderKlant(id) {
    if (!confirm("Klant verwijderen?")) return;
    setKlantenLijst(prev => prev.filter(k => k.id !== id));
  }
  function allesWissen() {
    if (klantenLijst.length === 0) return;
    if (!confirm("Alle klanten wissen?")) return;
    idRef.current = 6;
    setKlantenLijst(Array.from({ length: 5 }, (_, i) => maakLegeKlant(i + 1)));
  }

  // PER-KLANT BEVESTIGEN — stuurt vol, leeg, netto apart mee
  function bevestigKlant(id) {
    const k = klantenLijst.find(x => x.id === id);
    if (!k) return;
    if (!k.vol || !k.leeg || !k.materiaalId || !k.naam) {
      alert("Vul alle velden in (naam, materiaal, vol- en leeggewicht).");
      return;
    }
    const mat = MATERIALEN.find(m => m.id === parseInt(k.materiaalId));
    const volGew  = parseFloat(k.vol);
    const leegGew = parseFloat(k.leeg);
    const netto   = berekenNetto(k);
    const vandaag = vandaagDatumKey();
    zorgVoorDagSnapshot(vandaag, opbrengst);
    const snapshots = laadOpbrengstDagSnapshots();
    const inkoopPrijs = parseFloat(prijzen[mat?.id] || 0);
    const opbrengstPrijs = getOpbrengstPrijsVoorDatum(vandaag, mat?.id, snapshots)
      ?? parseFloat(opbrengst[mat?.id] || 0);
    const weging = {
      id: Date.now() + k.id,
      bonnummer: maakBonnummerWeging(k.id),
      kenteken: "–",
      klantNaam: k.naam,
      materiaal: mat,
      // DRIE GEWICHTEN APART MEEGEVEN
      gewicht: netto,         // netto (backwards compat met oude code)
      vol: volGew,            // vol-gewicht
      leeg: leegGew,          // leeg-gewicht
      netto: netto,           // netto expliciet
      aftrek: 0,              // geen aftrek in weging-scherm
      prijs: inkoopPrijs,
      totaal: Math.round(netto * inkoopPrijs * 100) / 100,
      opbrengstPrijs,
      opbrengstOmzet: Math.round(netto * opbrengstPrijs * 100) / 100,
      tijd: k.weegTijd || new Date().toLocaleTimeString("nl-NL"),
      datum: new Date().toLocaleDateString("nl-NL"),
      bron: actieveBron,
      richting: k.richting || "inkomend",
      isNieuw: true,
    };
    if (onWeging) onWeging(weging);

    // Markeer als bevestigd + reset waarden (behoud klantnaam + materiaal)
    setKlantenLijst(prev => prev.map(x => x.id === id ? {
      ...x,
      vol: null,
      leeg: null,
      netto: 0,
      weegTijd: null,
      bevestigd: true
    } : x));

    setTimeout(() => {
      setKlantenLijst(prev => prev.map(x => x.id === id ? { ...x, bevestigd: false } : x));
    }, 2000);

    toonToast(`✓ ${k.naam} · ${mat?.naam || ""} · vol ${fmtI(volGew)} − leeg ${fmtI(leegGew)} = ${fmtI(netto)} kg netto`);
  }

  function printWeging(id) {
    const k = klantenLijst.find(x => x.id === id);
    if (!k) return;
    if (!k.vol || !k.leeg || !k.naam || !k.materiaalId) {
      alert("Vul alle velden in (naam, materiaal, vol- en leeggewicht) voor het printen.");
      return;
    }
    const mat = MATERIALEN.find(m => m.id === parseInt(k.materiaalId));
    const nu = new Date();
    const datum = nu.toLocaleDateString("nl-NL");
    const tijd = nu.toLocaleTimeString("nl-NL");
    const bonnummer = maakBonnummerWeging(k.id);
    const netto = berekenNetto(k);
    const w = window.open("", "_blank");
    w.document.write(`
<!DOCTYPE html><html><head><title>Weging ${k.naam}</title>
<style>
@page { size: A5 portrait; margin: 12mm; }
body { font-family: "Segoe UI", -apple-system, sans-serif; margin: 0; color: #000; background: #fff; font-size: 14px; line-height: 1.4; }
.bon { max-width: 100%; margin: 0 auto; }
.kop { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
.kop-titel { font-size: 22px; font-weight: 900; letter-spacing: 0.05em; margin-bottom: 4px; }
.kop-sub { font-size: 12px; color: #444; font-family: monospace; }
.bonnr { text-align: center; font-family: monospace; font-size: 12px; color: #555; margin-bottom: 16px; padding: 4px; background: #f0f0f0; border: 1px solid #ccc; }
.sectie { margin-bottom: 14px; }
.sectie-titel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #666; font-weight: 700; padding-bottom: 4px; border-bottom: 1px solid #999; margin-bottom: 8px; }
.rij { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
.rij .l { font-weight: 600; } .rij .r { font-family: monospace; }
.netto-blok { margin: 20px 0; padding: 16px; border: 3px solid #000; text-align: center; }
.netto-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #555; font-weight: 700; margin-bottom: 6px; }
.netto-waarde { font-size: 36px; font-weight: 900; font-family: monospace; }
.handtekening { margin-top: 30px; padding-top: 10px; border-top: 1px dashed #999; }
.handtekening-label { font-size: 11px; color: #666; margin-bottom: 40px; }
.handtekening-lijn { border-top: 1px solid #000; width: 60%; margin: 0 auto; }
.footer { text-align: center; font-size: 10px; color: #888; margin-top: 20px; padding-top: 8px; border-top: 1px dashed #999; }
</style></head><body>
<div class="bon">
<div class="kop"><div class="kop-titel">METAALRECYCLING BULTERS</div><div class="kop-sub">Bewijs van weging</div></div>
<div class="bonnr">Bon ${bonnummer} · ${datum} · ${tijd}</div>
<div class="sectie"><div class="sectie-titel">Klantgegevens</div>
<div class="rij"><span class="l">Naam</span><span class="r">${k.naam}</span></div>
<div class="rij"><span class="l">Materiaal</span><span class="r">${mat ? mat.naam : "—"}</span></div>
<div class="rij"><span class="l">Richting</span><span class="r">${richtingLabel(k.richting)}</span></div>
</div>
<div class="sectie"><div class="sectie-titel">Weging</div>
<div class="rij"><span class="l">Vol gewicht</span><span class="r">${fmtI(parseFloat(k.vol))} kg</span></div>
<div class="rij"><span class="l">Leeg gewicht</span><span class="r">${fmtI(parseFloat(k.leeg))} kg</span></div>
<div class="rij"><span class="l">Bron</span><span class="r">${actieveBron === "weegbrug" ? "Weegbrug" : "Loods schaal"}</span></div>
</div>
<div class="netto-blok"><div class="netto-label">Netto gewicht</div><div class="netto-waarde">${fmtI(netto)} kg</div></div>
<div class="handtekening"><div class="handtekening-label">Voor akkoord:</div><div class="handtekening-lijn"></div></div>
<div class="footer">Bulters Weegsysteem · Metaalrecycling Bulters · Bon ${bonnummer}<br>Deze bon dient als bewijs van weging</div>
</div>
</body></html>
`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    toonToast("🖨 A5-bon geopend voor " + k.naam);
  }

  const totaalKlanten = klantenLijst.length;
  const totaalKg = klantenLijst.reduce((s, k) => s + berekenNetto(k), 0);

  return (
    <div className="weeg-pagina-mk">
      <div className="weegbrug-display-mk">
        <div className="weegbrug-bron-mk">
          {actieveBron === "weegbrug" ? "🚛 Weegbrug — live" : "⚖ Loods schaal — live"}
        </div>
        <div>
          <span className="weegbrug-getal-mk">
            {huidigGewicht !== null && huidigGewicht !== undefined ? fmtI(huidigGewicht) : "—"}
          </span>
          <span className="weegbrug-eenheid-mk">kg</span>
        </div>
        <div className="weegbrug-status-mk">
          {serverVerbonden ? "Live verbonden" : "Geen verbinding"}
        </div>
        <div className="weegbrug-controls-mk">
          <button className={"bron-btn-mk" + (actieveBron === "weegbrug" ? " actief" : "")} onClick={() => setActieveBron("weegbrug")}>🚛 Weegbrug</button>
          <button className={"bron-btn-mk" + (actieveBron === "loods" ? " actief" : "")} onClick={() => setActieveBron("loods")}>⚖ Loods schaal</button>
        </div>
      </div>

      <div className="klanten-lijst-mk">
        {klantenLijst.length === 0 ? (
          <div className="klanten-leeg-mk">Geen klanten. Klik "➕ Klant toevoegen".</div>
        ) : (
          klantenLijst.map((k, i) => {
            const netto = berekenNetto(k);
            const status = k.vol && k.leeg ? "klaar" : (k.vol || k.leeg) ? "bezig" : "wacht";
            const statusTekst = k.vol && k.leeg ? "✓ Klaar" : (k.vol || k.leeg) ? "⟳ Bezig" : "— Wacht";
            const kanBevestigen = !!(k.vol && k.leeg && k.naam && k.materiaalId);
            const kanPrinten = kanBevestigen;
            return (
              <div key={k.id} className="klant-kaart-mk" data-klant-id={k.id} style={{
                borderColor: k.bevestigd ? "#2e7d32" : undefined,
                background: k.bevestigd ? "rgba(46,125,50,0.08)" : undefined,
                transition: "all 0.3s"
              }}>
                <div className="klant-header-mk">
                  <span className="klant-nr-mk">Klant {i + 1}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={"klant-status-mk klant-status-" + status}>{statusTekst}</span>
                    <button className="print-btn-mk" onClick={() => printWeging(k.id)} disabled={!kanPrinten}>🖨 Print</button>
                    <button className="verwijder-btn-mk" onClick={() => verwijderKlant(k.id)} title="Verwijder klant">🗑</button>
                  </div>
                </div>

                <div className="klant-richting-mk">
                  <button
                    type="button"
                    className={"richting-btn-mk" + (k.richting === "inkomend" ? " actief" : "")}
                    onClick={() => updateKlant(k.id, "richting", "inkomend")}
                  >↓ Inkomend</button>
                  <button
                    type="button"
                    className={"richting-btn-mk uitgaand" + (k.richting === "uitgaand" ? " actief" : "")}
                    onClick={() => updateKlant(k.id, "richting", "uitgaand")}
                  >↑ Uitgaand</button>
                </div>

                <div className="klant-top-mk">
                  <div style={{ position: "relative" }}>
                    <KlantAutocomplete
                      klanten={klanten}
                      value={k.naam}
                      onChange={v => setNaam(k.id, v)}
                      onSelect={kl => setNaam(k.id, kl.naam)}
                      placeholder="Klant / Bedrijf (typ of klik)"
                    />
                  </div>
                  <select
                    className="klant-select-mk"
                    data-veld="materiaalId"
                    value={k.materiaalId}
                    onChange={e => updateKlant(k.id, "materiaalId", e.target.value)}
                  >
                    <option value="">— materiaal —</option>
                    {MATERIALEN.map(m => (
                      <option key={m.id} value={m.id}>{m.naam}</option>
                    ))}
                  </select>
                </div>

                <div className="klant-mid-mk">
                  <div className={"gewicht-vak-mk" + (k.vol !== null ? " klaar" : "")}>
                    <div className="gewicht-vak-label-mk">Vol gewicht</div>
                    <div className={"gewicht-vak-waarde-mk" + (k.vol === null ? " leeg" : "")}>
                      {k.vol !== null ? fmtI(parseFloat(k.vol)) + " kg" : "— nog niet gewogen —"}
                    </div>
                    <button className={"weeg-knop-mk" + (k.vol !== null ? " klaar" : "")} onClick={() => weegNu(k.id, "vol")}>
                      {k.vol !== null ? "✓ Opnieuw wegen" : "⚖ Wegen"}
                    </button>
                  </div>

                  <div className={"gewicht-vak-mk" + (k.leeg !== null ? " klaar" : "")}>
                    <div className="gewicht-vak-label-mk">Leeg gewicht</div>
                    <div className={"gewicht-vak-waarde-mk" + (k.leeg === null ? " leeg" : "")}>
                      {k.leeg !== null ? fmtI(parseFloat(k.leeg)) + " kg" : "— nog niet gewogen —"}
                    </div>
                    <button className={"weeg-knop-mk" + (k.leeg !== null ? " klaar" : "")} onClick={() => weegNu(k.id, "leeg")}>
                      {k.leeg !== null ? "✓ Opnieuw wegen" : "⚖ Wegen"}
                    </button>
                  </div>

                  <div></div>
                </div>

                {(k.vol !== null || k.leeg !== null) && (
                  <div className="klant-netto-mk">
                    <span className="lbl-mk">Netto = vol − leeg</span>
                    <span className="kg-mk">{fmtI(netto)} kg</span>
                  </div>
                )}

                {/* BEVESTIG-KNOP PER KLANT */}
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  background: kanBevestigen ? "rgba(46,125,50,0.08)" : "var(--surface2)",
                  border: "1px solid " + (kanBevestigen ? "var(--accent)" : "var(--border)"),
                  borderRadius: 6,
                  display: "flex",
                  gap: 8,
                  alignItems: "center"
                }}>
                  <button
                    onClick={() => bevestigKlant(k.id)}
                    disabled={!kanBevestigen}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: k.bevestigd ? "#2e7d32" : (kanBevestigen ? "var(--accent)" : "var(--surface2)"),
                      color: kanBevestigen ? "#fff" : "var(--muted)",
                      border: "none",
                      borderRadius: 5,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: kanBevestigen ? "pointer" : "not-allowed",
                      fontFamily: "var(--sans)"
                    }}
                  >
                    {k.bevestigd ? "✓ Bevestigd!" : "✓ Bevestig weging"}
                  </button>
                  {k.naam && (
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      {k.naam}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hoofd-acties-mk">
        <button className="btn-primair-mk" onClick={voegKlantToe}>➕ Klant toevoegen</button>
        <button className="btn-secundair-mk" onClick={allesWissen}>🗑 Wissen</button>
      </div>

      <div className="totaal-blok-mk">
        <div><div className="lbl-mk">Aantal klanten</div><div className="kg-mk">{totaalKlanten}</div></div>
        <div><div className="lbl-mk">Totaal gewicht</div><div className="kg-mk">{fmtI(totaalKg)} kg</div></div>
      </div>

      {toast && <div className="toast-mk">{toast}</div>}
    </div>
  );
}
