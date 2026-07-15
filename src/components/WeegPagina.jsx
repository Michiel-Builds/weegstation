import { useState, useEffect } from "react";
import { PRODUCT_NAAM, LMA_INGESCHAKELD } from "../data/product";
import { MATERIALEN } from "../data/stamdata";
import KlantAutocomplete from "./KlantAutocomplete";
import {
  zorgVoorDagSnapshot, vandaagDatumKey,
  getOpbrengstPrijsVoorDatum, laadOpbrengstDagSnapshots,
} from "../utils/opbrengstDag";
import { laadOpenRitten, bewaarOpenRitten, bewaarActieveWegingen, laadActieveWegingen } from "../utils/ritten";
import { laadAfvalstromen, vindAfvalstroom } from "../utils/afvalstromen";
import { bepaalMeldplicht } from "../utils/meldplicht";
import { voegKlantToe, maakLegeKlant } from "../data/klanten";
import { laadBegeleidingsbrieven, voegBegeleidingsbriefToe, maakLegeBegeleidingsbrief } from "../utils/begeleidingsbrieven";


function fmtI(n) { return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 }); }

function maakBonnummerWeging(id) {
  const nu = new Date();
  return "W-" + nu.getFullYear() +
    String(nu.getMonth() + 1).padStart(2, "0") +
    String(nu.getDate()).padStart(2, "0") +
    "-" + String(id).slice(-6);
}

function maakLegeRit() {
  return {
    id: "rit-" + Date.now(),
    kenteken: "",
    klantNaam: "",
    klantId: null,
    klantType: "",
    richting: "inkomend",
    vol: null,
    volTijd: null,
    leeg: null,
    leegTijd: null,
    materiaalId: "",
    afvalstroomId: null,
    // Begeleidingsbrief (papieren brief die met de vracht meekomt)
    briefAanwezig: false,
    briefDatum: new Date().toISOString().slice(0, 10),
    vervoerderNaam: "",
    vihb: "",
    briefOmschrijving: "",
    aardSamenstelling: "",
  };
}

function richtingLabel(richting) {
  return richting === "uitgaand" ? "Uitgaand" : "Inkomend";
}

function berekenNetto(rit) {
  const v = parseFloat(rit.vol) || 0;
  const l = parseFloat(rit.leeg) || 0;
  return Math.max(0, v - l);
}

const STAPPEN = [
  { nr: 1, label: "Kenteken & klant" },
  { nr: 2, label: "Vol gewicht" },
  { nr: 3, label: "Leeg gewicht" },
  { nr: 4, label: "Materiaal" },
  { nr: 5, label: "Opslaan" },
];

function huidigeStap(rit) {
  if (!rit.kenteken.trim() || !rit.klantNaam.trim()) return 1;
  if (!rit.vol) return 2;
  if (!rit.leeg) return 3;
  if (!rit.materiaalId) return 4;
  return 5;
}

function ritHeeftData(rit) {
  return !!(rit?.kenteken?.trim() || rit?.klantNaam?.trim() || rit?.vol || rit?.leeg);
}

function tabLabel(rit) {
  if (rit?.kenteken?.trim()) {
    const klant = rit.klantNaam?.trim();
    return klant ? `${rit.kenteken} · ${klant}` : rit.kenteken;
  }
  return "Nieuwe weging";
}

export default function WeegPagina({
  gewichtWeegbrug, gewichtLoods,
  serverVerbonden,
  onWeging, wegingen = [], prijzen = {}, opbrengst = {}, klanten = [], setKlanten,
  bedrijfsnaam = "WeegStation",
  stoplichtKleur = "rood",
  stoplichtEnabled = false,
  onStoplicht,
}) {
  const [actieveRitten, setActieveRitten] = useState(() => [maakLegeRit()]);
  const [actieveTabId, setActieveTabId] = useState(null);
  const [sessieGeladen, setSessieGeladen] = useState(false);
  const [openRitten, setOpenRitten] = useState(() => laadOpenRitten());
  const [actieveBron, setActieveBron] = useState("weegbrug");
  const [toast, setToast] = useState(null);
  const [opgeslagenFlash, setOpgeslagenFlash] = useState(false);
  const [afvalstromen] = useState(() => LMA_INGESCHAKELD ? laadAfvalstromen() : []);
  const [brieven, setBrieven] = useState(() => LMA_INGESCHAKELD ? laadBegeleidingsbrieven() : []);
  const [klantForm, setKlantForm] = useState(null);

  const actieveRit = actieveRitten.find(r => r.id === actieveTabId) || actieveRitten[0];
  const serverGewicht = actieveBron === "weegbrug" ? gewichtWeegbrug : gewichtLoods;
  const huidigGewicht = serverGewicht;
  const gewichtOk = huidigGewicht !== null && huidigGewicht !== undefined && huidigGewicht > 0;
  const stap = huidigeStap(actieveRit);
  const netto = berekenNetto(actieveRit);

  const klantStromen = actieveRit.klantId
    ? afvalstromen.filter(s => s.actief && s.klantId === actieveRit.klantId)
    : [];
  const autoStroom = vindAfvalstroom(afvalstromen, actieveRit.klantId, actieveRit.materiaalId);
  const gekozenStroom = actieveRit.afvalstroomId
    ? afvalstromen.find(s => s.id === actieveRit.afvalstroomId) || null
    : autoStroom;
  const meldplicht = LMA_INGESCHAKELD
    ? bepaalMeldplicht({ klantType: actieveRit.klantType, gewichtKg: netto })
    : { meldplichtig: false, reden: "" };
  const briefVerplicht = LMA_INGESCHAKELD && meldplicht.meldplichtig && !!gekozenStroom?.gevaarlijk;
  const briefCompleet = !LMA_INGESCHAKELD || !briefVerplicht || (
    actieveRit.briefAanwezig &&
    actieveRit.vervoerderNaam.trim() &&
    actieveRit.vihb.trim()
  );
  const kanOpslaan = !!(actieveRit.vol && actieveRit.leeg && actieveRit.klantNaam && actieveRit.materiaalId && actieveRit.kenteken && briefCompleet);
  const kanGroenLicht = !!(actieveRit.vol || actieveRit.leeg);

  useEffect(() => {
    const saved = laadActieveWegingen();
    const rit = maakLegeRit();
    if (saved?.tabs?.length > 0 && saved.tabs.some(ritHeeftData)) {
      if (confirm("Onafgemaakte weging(en) hervatten?")) {
        setActieveRitten(saved.tabs);
        setActieveTabId(saved.actieveTabId || saved.tabs[0].id);
      } else {
        setActieveRitten([rit]);
        setActieveTabId(rit.id);
      }
    } else {
      setActieveRitten([rit]);
      setActieveTabId(rit.id);
    }
    setSessieGeladen(true);
  }, []);

  useEffect(() => {
    bewaarOpenRitten(openRitten);
  }, [openRitten]);

  useEffect(() => {
    if (!sessieGeladen || !actieveTabId) return;
    bewaarActieveWegingen({ tabs: actieveRitten, actieveTabId });
  }, [actieveRitten, actieveTabId, sessieGeladen]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.__wsGeselecteerdeKlant) {
        const k = window.__wsGeselecteerdeKlant;
        window.__wsGeselecteerdeKlant = null;
        updateActieveRit(prev => ({
          ...prev,
          klantNaam: k.naam,
          klantId: k.id ?? null,
          klantType: k.type || "",
          afvalstroomId: null,
          vervoerderNaam: k.naam || prev.vervoerderNaam,
          vihb: k.vihb || "",
        }));
        toonToast(`✓ ${k.naam} ingevuld`);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [actieveTabId]);

  function updateActieveRit(updater) {
    setActieveRitten(prev => prev.map(r =>
      r.id === actieveTabId
        ? (typeof updater === "function" ? updater(r) : { ...r, ...updater })
        : r
    ));
  }

  function toonToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function updateRit(veld, waarde) {
    updateActieveRit(prev => ({ ...prev, [veld]: waarde }));
  }

  function nieuweWegingTab() {
    const rit = maakLegeRit();
    setActieveRitten(prev => [...prev, rit]);
    setActieveTabId(rit.id);
    toonToast("✓ Nieuwe weging-tab");
  }

  function sluitTab(id) {
    const tab = actieveRitten.find(r => r.id === id);
    if (actieveRitten.length <= 1) {
      if (ritHeeftData(tab) && !confirm("Huidige weging wissen?")) return;
      const nieuw = maakLegeRit();
      setActieveRitten([nieuw]);
      setActieveTabId(nieuw.id);
      return;
    }
    if (ritHeeftData(tab) && !confirm("Tab sluiten? Niet-opgeslagen gegevens gaan verloren.")) return;
    const idx = actieveRitten.findIndex(r => r.id === id);
    const volgende = actieveRitten[idx + 1] || actieveRitten[idx - 1];
    setActieveRitten(prev => prev.filter(r => r.id !== id));
    if (id === actieveTabId) setActieveTabId(volgende.id);
  }

  function vervangActieveTabMetLeeg() {
    const nieuw = maakLegeRit();
    setActieveRitten(prev => prev.map(r => r.id === actieveTabId ? nieuw : r));
    setActieveTabId(nieuw.id);
    return nieuw;
  }

  function kiesKlant(kl) {
    updateActieveRit(prev => ({
      ...prev,
      klantNaam: kl.naam,
      klantId: kl.id ?? null,
      klantType: kl.type || "",
      afvalstroomId: null,
      vervoerderNaam: kl.naam || prev.vervoerderNaam,
      vihb: kl.vihb || "",
    }));
  }

  function openNieuweKlant() {
    const basis = maakLegeKlant(klanten);
    setKlantForm({ ...basis, naam: actieveRit.klantNaam || "" });
  }

  function bewaarNieuweKlant() {
    if (!klantForm.naam.trim()) { toonToast("Naam is verplicht."); return; }
    if (!setKlanten) { toonToast("Klanten kunnen hier niet worden aangemaakt."); return; }
    const nieuw = { ...klantForm, id: maakLegeKlant(klanten).id };
    setKlanten(voegKlantToe(klanten, nieuw));
    kiesKlant(nieuw);
    setKlantForm(null);
    toonToast(`✓ Klant "${nieuw.naam}" aangemaakt`);
  }

  function weegGewicht(type) {
    if (!gewichtOk) {
      toonToast("⚠ Wacht op stabiel gewicht...");
      return;
    }
    const tijd = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    updateActieveRit(prev => ({
      ...prev,
      [type]: String(huidigGewicht),
      [type + "Tijd"]: tijd,
    }));
    toonToast(`✓ ${type === "vol" ? "Vol" : "Leeg"} vastgelegd: ${fmtI(huidigGewicht)} kg`);
  }

  function parkeerOpenRit() {
    if (!actieveRit.vol || actieveRit.leeg) {
      toonToast("Alleen ritten met vol (zonder leeg) kunnen worden geparkeerd.");
      return;
    }
    if (!actieveRit.kenteken.trim()) {
      toonToast("Vul eerst een kenteken in.");
      return;
    }
    const teParkeren = { ...actieveRit, bron: actieveBron, geparkeerd: new Date().toISOString() };
    setOpenRitten(prev => {
      const zonder = prev.filter(r => r.id !== teParkeren.id);
      return [teParkeren, ...zonder];
    });
    vervangActieveTabMetLeeg();
    toonToast(`⏸ ${teParkeren.kenteken} geparkeerd — wacht op leeg`);
  }

  function hervatRit(rit) {
    const cur = actieveRit;
    const moetParkeren = cur.vol && !cur.leeg && cur.kenteken.trim();
    const heeftData = cur.kenteken || cur.klantNaam || cur.vol;
    if (moetParkeren) {
      if (!confirm("Huidige rit parkeren en deze hervatten?")) return;
      const teParkeren = { ...cur, bron: actieveBron, geparkeerd: new Date().toISOString() };
      setOpenRitten(prev => {
        const zonder = prev.filter(r => r.id !== teParkeren.id);
        return [teParkeren, ...zonder];
      });
    } else if (heeftData) {
      if (!confirm("Huidige rit wissen en deze hervatten?")) return;
    }
    setOpenRitten(prev => prev.filter(r => r.id !== rit.id));
    updateActieveRit(() => ({ ...rit, id: rit.id || actieveTabId }));
    if (rit.bron) setActieveBron(rit.bron);
    toonToast(`↩ Rit hervat: ${rit.kenteken}`);
  }

  function verwijderOpenRit(id, e) {
    e?.stopPropagation();
    if (!confirm("Open rit verwijderen?")) return;
    setOpenRitten(prev => prev.filter(r => r.id !== id));
  }

  function resetRit() {
    if (actieveRit.vol || actieveRit.klantNaam || actieveRit.kenteken) {
      if (!confirm("Huidige rit wissen?")) return;
    }
    vervangActieveTabMetLeeg();
    toonToast("Rit gewist");
  }

  function opslaanRit() {
    const r = actieveRit;
    if (!r.kenteken.trim() || !r.klantNaam.trim() || !r.vol || !r.leeg || !r.materiaalId) {
      alert("Vul kenteken, klant, vol, leeg en materiaal in.");
      return;
    }
    if (LMA_INGESCHAKELD && briefVerplicht && !briefCompleet) {
      alert("Gevaarlijke afvalstroom: vul de begeleidingsbrief in (vervoerder + VIHB).");
      return;
    }
    const mat = MATERIALEN.find(m => m.id === parseInt(r.materiaalId));
    const volGew = parseFloat(r.vol);
    const leegGew = parseFloat(r.leeg);
    const nettoKg = berekenNetto(r);
    const vandaag = vandaagDatumKey();
    zorgVoorDagSnapshot(vandaag, opbrengst);
    const snapshots = laadOpbrengstDagSnapshots();
    const inkoopPrijs = parseFloat(prijzen[mat?.id] || 0);
    const opbrengstPrijs = getOpbrengstPrijsVoorDatum(vandaag, mat?.id, snapshots)
      ?? parseFloat(opbrengst[mat?.id] || 0);

    const meldStatus = LMA_INGESCHAKELD
      ? bepaalMeldplicht({ klantType: r.klantType, gewichtKg: nettoKg })
      : null;
    const stroom = LMA_INGESCHAKELD
      ? (r.afvalstroomId
        ? afvalstromen.find(s => s.id === r.afvalstroomId) || null
        : vindAfvalstroom(afvalstromen, r.klantId, r.materiaalId))
      : null;

    const weging = {
      id: Date.now(),
      bonnummer: maakBonnummerWeging(r.id),
      kenteken: r.kenteken.trim().toUpperCase(),
      klantNaam: r.klantNaam,
      klantId: r.klantId ?? null,
      klantType: r.klantType || "",
      materiaal: mat,
      ...(LMA_INGESCHAKELD ? {
        lma: {
          meldplichtig: meldStatus.meldplichtig,
          meldreden: meldStatus.reden,
          afvalstroomId: stroom?.id ?? null,
          afvalstroomnummer: stroom?.asn ?? "",
          euralCode: stroom?.euralCode ?? (mat?.euralCode ?? ""),
          gevaarlijk: stroom?.gevaarlijk ?? (mat?.gevaarlijk ?? false),
          verwerkingsmethode: stroom?.verwerkingsmethode ?? (mat?.verwerkingsmethode ?? ""),
          gemeld: false,
        },
      } : {}),
      gewicht: nettoKg,
      vol: volGew,
      leeg: leegGew,
      netto: nettoKg,
      aftrek: 0,
      prijs: inkoopPrijs,
      totaal: Math.round(nettoKg * inkoopPrijs * 100) / 100,
      opbrengstPrijs,
      opbrengstOmzet: Math.round(nettoKg * opbrengstPrijs * 100) / 100,
      tijd: r.leegTijd || r.volTijd || new Date().toLocaleTimeString("nl-NL"),
      datum: new Date().toLocaleDateString("nl-NL"),
      bron: actieveBron,
      richting: r.richting || "inkomend",
      isNieuw: true,
    };

    if (onWeging) onWeging(weging);

    if (LMA_INGESCHAKELD) {
      const briefMoet = meldStatus.meldplichtig && (r.briefAanwezig || !!stroom?.gevaarlijk);
      if (briefMoet && stroom?.asn) {
        const brief = {
          ...maakLegeBegeleidingsbrief(brieven),
          asn: stroom.asn,
          datum: r.briefDatum || new Date().toISOString().slice(0, 10),
          kenteken: weging.kenteken,
          vervoerderNaam: r.vervoerderNaam || r.klantNaam,
          vihb: r.vihb || "",
          omschrijving: r.briefOmschrijving || "",
          aardSamenstelling: r.aardSamenstelling || "",
          gevaarlijk: !!stroom.gevaarlijk,
          wegingId: weging.id,
        };
        setBrieven(prev => voegBegeleidingsbriefToe(prev, brief));
      }
    }

    setOpenRitten(prev => prev.filter(x => x.id !== r.id));
    vervangActieveTabMetLeeg();
    setOpgeslagenFlash(true);
    setTimeout(() => setOpgeslagenFlash(false), 2000);
    toonToast(`✓ ${r.kenteken} · ${mat?.naam} · ${fmtI(nettoKg)} kg netto opgeslagen`);
  }

  function printRit() {
    const r = actieveRit;
    if (!kanOpslaan) {
      alert("Vul alle velden in voor het printen.");
      return;
    }
    const mat = MATERIALEN.find(m => m.id === parseInt(r.materiaalId));
    const nu = new Date();
    const bonnummer = maakBonnummerWeging(r.id);
    const w = window.open("", "_blank");
    w.document.write(`
<!DOCTYPE html><html><head><title>Weging ${r.kenteken}</title>
<style>
@page { size: A5 portrait; margin: 12mm; }
body { font-family: "Segoe UI", sans-serif; margin: 0; color: #000; font-size: 14px; }
.kop { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
.kop-titel { font-size: 22px; font-weight: 900; }
.rij { display: flex; justify-content: space-between; padding: 4px 0; }
.netto-blok { margin: 20px 0; padding: 16px; border: 3px solid #000; text-align: center; }
.netto-waarde { font-size: 36px; font-weight: 900; font-family: monospace; }
.footer { text-align: center; font-size: 10px; color: #888; margin-top: 20px; }
</style></head><body>
<div class="kop"><div class="kop-titel">${bedrijfsnaam.toUpperCase()}</div><div>Bewijs van weging</div></div>
<div style="text-align:center;font-family:monospace;margin-bottom:16px">Bon ${bonnummer} · ${nu.toLocaleDateString("nl-NL")}</div>
<div class="rij"><span>Kenteken</span><strong>${r.kenteken.toUpperCase()}</strong></div>
<div class="rij"><span>Klant</span><strong>${r.klantNaam}</strong></div>
<div class="rij"><span>Materiaal</span><strong>${mat?.naam || "—"}</strong></div>
<div class="rij"><span>Richting</span><strong>${richtingLabel(r.richting)}</strong></div>
<div class="rij"><span>Vol</span><span>${fmtI(parseFloat(r.vol))} kg</span></div>
<div class="rij"><span>Leeg</span><span>${fmtI(parseFloat(r.leeg))} kg</span></div>
<div class="netto-blok"><div>Netto gewicht</div><div class="netto-waarde">${fmtI(netto)} kg</div></div>
<div class="footer">${PRODUCT_NAAM} · ${bedrijfsnaam}</div>
<script>window.onload=function(){setTimeout(()=>window.print(),300)}</script>
</body></html>`);
    w.document.close();
  }

  if (!sessieGeladen || !actieveRit) return null;

  return (
    <div className={`scale-house${opgeslagenFlash ? " sh-opgeslagen" : ""}`}>
      <div className="sh-main">
        <div style={{
          display: "flex", gap: 4, marginBottom: 8, padding: "0 0 4px 0",
          overflowX: "auto", borderBottom: "1px solid var(--border)",
        }}>
          {actieveRitten.map(rit => {
            const isActief = rit.id === actieveTabId;
            return (
              <div
                key={rit.id}
                onClick={() => setActieveTabId(rit.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  background: isActief ? "var(--surface)" : "var(--surface2)",
                  color: isActief ? "var(--text)" : "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px 6px 0 0",
                  cursor: "pointer",
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <span>🚛 {tabLabel(rit)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sluitTab(rit.id); }}
                  style={{
                    background: "none", border: "none", color: "var(--muted)",
                    cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1,
                  }}
                  title="Tab sluiten"
                >×</button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={nieuweWegingTab}
            style={{
              padding: "6px 12px", background: "transparent",
              color: "var(--accent2)", border: "1px dashed var(--border)",
              borderRadius: "6px 6px 0 0", cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >+ Nieuwe weging</button>
        </div>

        <div className="sh-stappen">
          {STAPPEN.map(s => (
            <div key={s.nr} className={`sh-stap${stap === s.nr ? " actief" : ""}${stap > s.nr ? " klaar" : ""}`}>
              <span className="sh-stap-nr">{stap > s.nr ? "✓" : s.nr}</span>
              <span className="sh-stap-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="sh-veld">
          <label className="sh-label">Kenteken</label>
          <input
            className="sh-kenteken"
            placeholder="NL-AB-1234"
            value={actieveRit.kenteken}
            onChange={e => updateRit("kenteken", e.target.value.toUpperCase())}
            autoFocus
          />
        </div>

        <div className="sh-rij">
          <div className="sh-veld sh-veld-grow">
            <label className="sh-label">Klant / leverancier</label>
            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <KlantAutocomplete
                  klanten={klanten}
                  value={actieveRit.klantNaam}
                  onChange={v => updateActieveRit(prev => ({
                    ...prev, klantNaam: v, klantId: null, klantType: "", afvalstroomId: null,
                    vervoerderNaam: v, vihb: "",
                  }))}
                  onSelect={kiesKlant}
                  placeholder="Typ of kies klant"
                />
              </div>
              <button
                type="button"
                className="sh-actie-sec"
                style={{ whiteSpace: "nowrap" }}
                onClick={openNieuweKlant}
                title="Nieuwe klant aanmaken op de weegbrug"
              >+ Nieuw</button>
            </div>
          </div>
          <div className="sh-richting">
            <button
              type="button"
              className={`sh-richting-btn${actieveRit.richting === "inkomend" ? " actief" : ""}`}
              onClick={() => updateRit("richting", "inkomend")}
            >↓ In</button>
            <button
              type="button"
              className={`sh-richting-btn uit${actieveRit.richting === "uitgaand" ? " actief" : ""}`}
              onClick={() => updateRit("richting", "uitgaand")}
            >↑ Uit</button>
          </div>
        </div>

        <div className={`sh-live${gewichtOk ? " stabiel" : ""}`}>
          <div className="sh-live-bron">
            {actieveBron === "weegbrug" ? "🚛 Weegbrug" : "⚖ Loods"} · {serverVerbonden ? "● LIVE" : "○ Offline"}
            {actieveRit?.kenteken?.trim() && (
              <span style={{ marginLeft: 8, color: "var(--accent2)" }}>
                → vastleggen voor: {actieveRit.kenteken}
              </span>
            )}
          </div>
          <div className="sh-live-getal">
            {huidigGewicht !== null && huidigGewicht !== undefined ? fmtI(huidigGewicht) : "—"}
            <span className="sh-live-eenheid">kg</span>
          </div>
          <div className="sh-live-status">{gewichtOk ? "● STABIEL" : "Wacht op gewicht..."}</div>
        </div>

        <div className="sh-weeg-knoppen">
          <button
            type="button"
            className={`sh-big-btn vol${actieveRit.vol ? " gedaan" : ""}`}
            onClick={() => weegGewicht("vol")}
            disabled={!gewichtOk}
          >
            {actieveRit.vol ? `✓ Vol: ${fmtI(parseFloat(actieveRit.vol))} kg` : "VOL VASTLEGGEN"}
          </button>
          <button
            type="button"
            className={`sh-big-btn leeg${actieveRit.leeg ? " gedaan" : ""}`}
            onClick={() => weegGewicht("leeg")}
            disabled={!gewichtOk || !actieveRit.vol}
          >
            {actieveRit.leeg ? `✓ Leeg: ${fmtI(parseFloat(actieveRit.leeg))} kg` : "LEEG VASTLEGGEN"}
          </button>
        </div>

        <div className="sh-stoplicht-blok">
          <div className="sh-stoplicht-status">
            <span className={`sh-lamp rood${stoplichtKleur === "rood" ? " aan" : ""}`} title="Rood" />
            <span className={`sh-lamp groen${stoplichtKleur === "groen" ? " aan" : ""}`} title="Groen" />
            <span className="sh-stoplicht-tekst">
              {stoplichtEnabled
                ? (stoplichtKleur === "groen" ? "Truck mag doorrijden" : "Wachten — rood")
                : "Stoplicht niet geconfigureerd op weegserver"}
            </span>
          </div>
          <div className="sh-stoplicht-knoppen">
            <button
              type="button"
              className="sh-stoplicht-groen"
              disabled={!stoplichtEnabled || !serverVerbonden || !kanGroenLicht}
              onClick={() => onStoplicht?.("groen")}
              title="Na weging: truck mag van de brug af"
            >
              🟢 Groen licht — doorrijden
            </button>
            <button
              type="button"
              className="sh-stoplicht-rood"
              disabled={!stoplichtEnabled || !serverVerbonden}
              onClick={() => onStoplicht?.("rood")}
            >
              🔴 Rood licht — stop
            </button>
          </div>
        </div>

        {(actieveRit.vol || actieveRit.leeg) && (
          <div className="sh-samenvatting">
            <span>Vol: <strong>{actieveRit.vol ? fmtI(parseFloat(actieveRit.vol)) + " kg" : "—"}</strong></span>
            <span>Leeg: <strong>{actieveRit.leeg ? fmtI(parseFloat(actieveRit.leeg)) + " kg" : "—"}</strong></span>
            <span className="sh-netto">Netto: <strong>{fmtI(netto)} kg</strong></span>
          </div>
        )}

        <div className="sh-materiaal">
          <label className="sh-label">Materiaal</label>
          <div className="sh-mat-grid">
            {MATERIALEN.map(m => (
              <button
                key={m.id}
                type="button"
                className={`sh-mat-btn${String(actieveRit.materiaalId) === String(m.id) ? " actief" : ""}`}
                onClick={() => updateRit("materiaalId", String(m.id))}
              >
                <span className="sh-mat-dot" style={{ background: m.kleur }} />
                {m.naam}
              </button>
            ))}
          </div>
        </div>

        {LMA_INGESCHAKELD && actieveRit.klantNaam && (
          <div className="sh-lma-blok" style={{
            margin: "4px 0 8px", padding: "10px 12px", borderRadius: 8,
            border: "1px solid var(--border, #2a2a2a)",
            background: "var(--panel-2, rgba(255,255,255,0.03))",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                background: meldplicht.meldplichtig ? "rgba(230,126,34,0.18)" : "rgba(76,175,125,0.18)",
                color: meldplicht.meldplichtig ? "#e67e22" : "#4caf7d",
              }}>
                {meldplicht.meldplichtig ? "LMA-meldplichtig" : "Geen LMA-melding"}
              </span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>{meldplicht.reden}</span>
            </div>

            {meldplicht.meldplichtig && (
              <div style={{ marginTop: 8 }}>
                <label className="sh-label" style={{ display: "block", marginBottom: 4 }}>Afvalstroom (ASN)</label>
                {klantStromen.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--red, #e74c3c)" }}>
                    Geen afvalstroom voor deze klant. Maak er eerst een aan bij Afvalstromen (LMA).
                  </div>
                ) : (
                  <select
                    value={actieveRit.afvalstroomId || (autoStroom?.id ?? "")}
                    onChange={e => updateRit("afvalstroomId", e.target.value || null)}
                    style={{ width: "100%" }}
                  >
                    {klantStromen.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.asn} · {s.euralCode} · {s.gebruikelijkeBenaming || "—"}{s.gevaarlijk ? " (gevaarlijk)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                {gekozenStroom?.gevaarlijk && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#e67e22" }}>
                    Let op: gevaarlijke afvalstroom — begeleidingsbrief met vervoerder + VIHB verplicht.
                  </div>
                )}

                <div style={{ marginTop: 10, borderTop: "1px dashed var(--border, #2a2a2a)", paddingTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={!!actieveRit.briefAanwezig || briefVerplicht}
                      disabled={briefVerplicht}
                      onChange={e => updateRit("briefAanwezig", e.target.checked)}
                    />
                    Begeleidingsbrief aanwezig{briefVerplicht ? " (verplicht)" : ""}
                  </label>

                  {(actieveRit.briefAanwezig || briefVerplicht) && (
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label className="sh-label">Datum brief</label>
                        <input type="date" value={actieveRit.briefDatum}
                          onChange={e => updateRit("briefDatum", e.target.value)} style={{ width: "100%" }} />
                      </div>
                      <div>
                        <label className="sh-label">Vervoerder{briefVerplicht ? " *" : ""}</label>
                        <input value={actieveRit.vervoerderNaam}
                          onChange={e => updateRit("vervoerderNaam", e.target.value)}
                          placeholder="Voorgevuld uit klant" style={{ width: "100%" }} />
                      </div>
                      <div>
                        <label className="sh-label">VIHB-nummer{briefVerplicht ? " *" : ""}</label>
                        <input value={actieveRit.vihb}
                          onChange={e => updateRit("vihb", e.target.value)}
                          placeholder="Voorgevuld uit klant" style={{ width: "100%" }} />
                      </div>
                      <div>
                        <label className="sh-label">Omschrijving</label>
                        <input value={actieveRit.briefOmschrijving}
                          onChange={e => updateRit("briefOmschrijving", e.target.value)} style={{ width: "100%" }} />
                      </div>
                      {gekozenStroom?.gevaarlijk && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label className="sh-label">Aard/samenstelling (+ evt. ZZS)</label>
                          <input value={actieveRit.aardSamenstelling}
                            onChange={e => updateRit("aardSamenstelling", e.target.value)} style={{ width: "100%" }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="sh-acties">
          <button type="button" className="sh-actie-primair" onClick={opslaanRit} disabled={!kanOpslaan}>
            ✓ Rit opslaan
          </button>
          <button type="button" className="sh-actie-sec" onClick={printRit} disabled={!kanOpslaan}>🖨 Bon</button>
          <button
            type="button"
            className="sh-actie-sec"
            onClick={parkeerOpenRit}
            disabled={!actieveRit.vol || !!actieveRit.leeg}
          >
            ⏸ Parkeren
          </button>
          <button type="button" className="sh-actie-sec" onClick={resetRit}>↺ Reset</button>
        </div>
      </div>

      <aside className="sh-sidebar">
        <div className="sh-sidebar-titel">Open ritten</div>
        <p className="sh-sidebar-hint">Vol gewogen, wacht op leeg</p>
        {openRitten.length === 0 ? (
          <div className="sh-open-leeg">Geen open ritten</div>
        ) : (
          <ul className="sh-open-lijst">
            {openRitten.map(r => (
              <li key={r.id}>
                <button type="button" className="sh-open-item" onClick={() => hervatRit(r)}>
                  <span className="sh-open-kenteken">{r.kenteken}</span>
                  <span className="sh-open-vol">{fmtI(parseFloat(r.vol))} kg vol</span>
                  <span className="sh-open-tijd">{r.volTijd || "—"}</span>
                  {r.klantNaam && <span className="sh-open-klant">{r.klantNaam}</span>}
                </button>
                <button type="button" className="sh-open-del" onClick={e => verwijderOpenRit(r.id, e)} title="Verwijderen">✕</button>
              </li>
            ))}
          </ul>
        )}

        <div className="sh-bron-switch">
          <div className="sh-sidebar-titel">Weegbron</div>
          <button
            type="button"
            className={`bron-btn-mk${actieveBron === "weegbrug" ? " actief" : ""}`}
            onClick={() => setActieveBron("weegbrug")}
          >🚛 Weegbrug</button>
          <button
            type="button"
            className={`bron-btn-mk${actieveBron === "loods" ? " actief" : ""}`}
            onClick={() => setActieveBron("loods")}
          >⚖ Loods</button>
        </div>

        <div className="sh-stats">
          <div><span className="sh-stat-lbl">Vandaag</span><span className="sh-stat-val">{wegingen.length} wegingen</span></div>
          <div><span className="sh-stat-lbl">Open</span><span className="sh-stat-val">{openRitten.length}</span></div>
          <div><span className="sh-stat-lbl">Tabs</span><span className="sh-stat-val">{actieveRitten.length}</span></div>
        </div>
      </aside>

      {klantForm && (
        <div className="klant-modal-backdrop-kl" onClick={() => setKlantForm(null)}>
          <div className="klant-modal-kl" onClick={e => e.stopPropagation()}>
            <div className="klant-modal-header-kl">
              <span className="klant-modal-titel-kl">Nieuwe klant</span>
              <button className="klant-actie-kl" onClick={() => setKlantForm(null)}>×</button>
            </div>
            <div className="klant-modal-body-kl">
              <div className="klant-modal-row-kl">
                <label>Type</label>
                <select value={klantForm.type} onChange={e => setKlantForm({ ...klantForm, type: e.target.value })}>
                  <option value="zakelijk">Zakelijk</option>
                  <option value="particulier">Particulier</option>
                </select>
              </div>
              <div className="klant-modal-row-kl">
                <label>Naam *</label>
                <input value={klantForm.naam} onChange={e => setKlantForm({ ...klantForm, naam: e.target.value })} autoFocus />
              </div>
              <div className="klant-modal-grid-kl">
                <div className="klant-modal-row-kl">
                  <label>Plaats</label>
                  <input value={klantForm.plaats} onChange={e => setKlantForm({ ...klantForm, plaats: e.target.value })} />
                </div>
                <div className="klant-modal-row-kl">
                  <label>KvK</label>
                  <input value={klantForm.kvk} onChange={e => setKlantForm({ ...klantForm, kvk: e.target.value })} />
                </div>
              </div>
              {LMA_INGESCHAKELD && klantForm.type === "zakelijk" && (
                <div className="klant-modal-grid-kl">
                  <div className="klant-modal-row-kl">
                    <label>VIHB-nummer</label>
                    <input value={klantForm.vihb} onChange={e => setKlantForm({ ...klantForm, vihb: e.target.value })} placeholder="Begeleidingsbrief" />
                  </div>
                  <div className="klant-modal-row-kl">
                    <label>AMICE-bedrijfsnummer</label>
                    <input value={klantForm.amiceBedrijfsnummer} onChange={e => setKlantForm({ ...klantForm, amiceBedrijfsnummer: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <div className="klant-modal-footer-kl">
              <button className="klant-btn-kl secundair" onClick={() => setKlantForm(null)}>Annuleren</button>
              <button className="klant-btn-kl primair" onClick={bewaarNieuweKlant}>Toevoegen</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-mk">{toast}</div>}
    </div>
  );
}
