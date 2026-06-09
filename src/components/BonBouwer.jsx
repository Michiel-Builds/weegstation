import { useState, useEffect, useRef } from "react";
import { maakBonnummer, printBon as printBonUtil } from "../utils/helpers";
import { exporteerBonNaarPdf } from "../utils/pdfExport";
import { registreerBonOmzet } from "../utils/bonOmzet";
import { MATERIALEN } from "../data/stamdata";
import KlantAutocomplete from "./KlantAutocomplete";
import MateriaalAutocomplete from "./MateriaalAutocomplete";

const AANTAL_RIJEN = 15;
const STORAGE_KEY = "newton-bonnen";

function fmt(n)  { return Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtI(n) { return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 }); }

function fmtDatum(d) {
  const vandaag   = new Date();
  const gisteren  = new Date(vandaag.getTime() - 86400000);
  if (d.toDateString() === vandaag.toDateString())  return "vandaag";
  if (d.toDateString() === gisteren.toDateString()) return "gisteren";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });
}

function parseTijdString(tijdStr, datumStr) {
  try {
    const [h, m, s] = (tijdStr || "0:0:0").split(":").map(Number);
    let d = new Date();
    if (datumStr && /^\d{1,2}-\d{1,2}-\d{4}$/.test(datumStr)) {
      const [dd, mm, yyyy] = datumStr.split("-").map(Number);
      d = new Date(yyyy, mm - 1, dd, h || 0, m || 0, s || 0);
    } else {
      d.setHours(h || 0, m || 0, s || 0, 0);
    }
    return d.getTime();
  } catch (e) {
    return null;
  }
}

function isBinnen24Uur(w) {
  if (!w.tijdMs) return true;
  return (Date.now() - w.tijdMs) <= 24 * 3600 * 1000;
}

function klantNaarForm(k) {
  return {
    naam: k.type === "particulier" ? k.naam : "",
    bedrijf: k.type === "zakelijk" ? k.naam : "",
    contactpersoon: k.contactpersoon || "",
    adres: k.adres || "",
    postcode: k.postcode || "",
    plaats: k.plaats || "",
    btw: k.btw || "",
    kvk: k.kvk || "",
    email: k.email || "",
    telefoon: k.telefoon || "",
    legitimatieType: k.legitimatieType || "",
    legitimatieNummer: k.legitimatieNummer || "",
  };
}

function th(num = false) {
  return {
    color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em",
    padding: "6px 4px", textAlign: num ? "right" : "left",
    borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)"
  };
}
function td(num = false) {
  return { padding: "4px 4px", borderBottom: "1px solid var(--surface2)", textAlign: num ? "right" : "left" };
}
function inputStyle(num) {
  return {
    width: "100%", background: "transparent", border: "1px solid transparent", color: "var(--text)",
    fontFamily: num ? "var(--mono)" : "var(--sans)", fontSize: 13, padding: "6px 8px", borderRadius: 4,
    outline: "none", textAlign: num ? "right" : "left"
  };
}

function maakLegeBon(id) {
  return {
    id: id,
    bonnummer: maakBonnummer(),
    klant: {
      naam: "", bedrijf: "", contactpersoon: "",
      adres: "", postcode: "", plaats: "",
      btw: "", kvk: "", email: "", telefoon: "",
      legitimatieType: "", legitimatieNummer: ""
    },
    klantType: "bedrijf",
    regels: Array.from({ length: AANTAL_RIJEN }, () => ({ materiaal: "", vol: "", leeg: "", aftrek: "", prijs: "" })),
    toegevoegd: [],
  };
}

function bewaarBonnen(bonnen, actieveId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bonnen: bonnen,
      actieveId: actieveId
    }));
  } catch (e) {}
}

function vindMateriaalOpNaam(naam) {
  if (!naam?.trim()) return null;
  const q = naam.trim().toLowerCase();
  const exact = MATERIALEN.find(m => m.naam.toLowerCase() === q);
  if (exact) return exact;
  const starts = MATERIALEN.filter(m => m.naam.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];
  return null;
}

function laadBonnen() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bonnen) && parsed.bonnen.length > 0) {
        return { bonnen: parsed.bonnen, actieveId: parsed.actieveId || parsed.bonnen[0].id };
      }
    }
  } catch (e) {}
  return null;
}

export default function BonBouwer({ prijzen, wegingen = [], klanten = [] }) {
  const [bonnen, setBonnen] = useState([maakLegeBon(1)]);
  const [actieveBonId, setActieveBonId] = useState(1);
  const [toast, setToast] = useState(null);
  const [isGeladen, setIsGeladen] = useState(false);
  const bonIdRef = useRef(2);
  const initialBonnenRef = useRef(true);

  // LAAD bonnen uit localStorage bij mount
  useEffect(() => {
    const data = laadBonnen();
    if (data) {
      setBonnen(data.bonnen);
      setActieveBonId(data.actieveId);
      const maxId = Math.max(...data.bonnen.map(b => b.id));
      bonIdRef.current = maxId + 1;
    }
    setIsGeladen(true);
  }, []);

  // BEWAAR bonnen in localStorage bij elke wijziging
  useEffect(() => {
    if (!isGeladen) return;
    if (initialBonnenRef.current) {
      initialBonnenRef.current = false;
      return;
    }
    bewaarBonnen(bonnen, actieveBonId);
  }, [bonnen, actieveBonId, isGeladen]);

  // Sync inkoopprijzen naar regels met bekend materiaal (particulier)
  useEffect(() => {
    if (!isGeladen) return;
    setBonnen(prev => {
      let gewijzigd = false;
      const next = prev.map(bon => {
        if (bon.klantType !== "particulier") return bon;
        let bonGewijzigd = false;
        const regels = bon.regels.map(r => {
          if (!r.materiaal.trim()) return r;
          const mat = vindMateriaalOpNaam(r.materiaal);
          if (!mat || prijzen[mat.id] === undefined) return r;
          const nieuw = String(prijzen[mat.id]);
          if (r.prijs === nieuw) return r;
          bonGewijzigd = true;
          gewijzigd = true;
          return { ...r, prijs: nieuw };
        });
        return bonGewijzigd ? { ...bon, regels } : bon;
      });
      return gewijzigd ? next : prev;
    });
  }, [prijzen, isGeladen]);

  // Sync van andere tabbladen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (e.key === STORAGE_KEY && e.newValue && isGeladen) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Array.isArray(parsed.bonnen) && parsed.bonnen.length > 0) {
            setBonnen(parsed.bonnen);
            setActieveBonId(parsed.actieveId || parsed.bonnen[0].id);
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [isGeladen]);

  const actieveBon = bonnen.find(b => b.id === actieveBonId) || bonnen[0];

  // Luister naar globale klant-selectie
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.__newtonGeselecteerdeKlant) {
        const k = window.__newtonGeselecteerdeKlant;
        window.__newtonGeselecteerdeKlant = null;
        updateActieveBon(prev => ({
          ...prev,
          klant: { ...prev.klant, ...klantNaarForm(k) },
          klantType: k.type === "particulier" ? "particulier" : "bedrijf"
        }));
        toonToast(`✓ ${k.naam} ingevuld`);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [actieveBonId]);

  function updateActieveBon(updater) {
    setBonnen(prev => prev.map(b =>
      b.id === actieveBonId
        ? (typeof updater === "function" ? updater(b) : { ...b, ...updater })
        : b
    ));
  }

  function toonToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function sluitActieveBonEnGaNaarVolgende() {
    if (bonnen.length <= 1) {
      updateActieveBon(() => maakLegeBon(actieveBonId));
      toonToast("✓ Bon verwerkt — nieuwe lege bon");
      return;
    }
    const huidigeIdx = bonnen.findIndex(b => b.id === actieveBonId);
    const volgende = bonnen[huidigeIdx + 1] || bonnen[huidigeIdx - 1] || bonnen[0];
    setBonnen(prev => prev.filter(b => b.id !== actieveBonId));
    setActieveBonId(volgende.id);
    toonToast("✓ Bon gesloten → volgende bon actief");
  }

  function nieuweBon() {
    const nieuweId = bonIdRef.current++;
    setBonnen(prev => [...prev, maakLegeBon(nieuweId)]);
    setActieveBonId(nieuweId);
    toonToast(`✓ Bon ${nieuweId} aangemaakt`);
  }

  function sluitBon(id) {
    if (bonnen.length <= 1) {
      toonToast("⚠ Minimaal 1 bon vereist");
      return;
    }
    if (!confirm("Bon sluiten? De gegevens gaan verloren.")) return;
    const huidigeIdx = bonnen.findIndex(b => b.id === id);
    const wordtActiefGesloten = id === actieveBonId;
    setBonnen(prev => prev.filter(b => b.id !== id));
    if (wordtActiefGesloten) {
      const volgende = bonnen[huidigeIdx + 1] || bonnen[huidigeIdx - 1] || bonnen[0];
      setActieveBonId(volgende.id);
    }
  }

  function wisActieveBon() {
    if (!confirm("Huidige bon wissen en opnieuw beginnen?")) return;
    updateActieveBon(() => maakLegeBon(actieveBonId));
    toonToast("🗑 Bon gewist");
  }

  function updateKlant(veld, waarde) {
    updateActieveBon(prev => ({ ...prev, klant: { ...prev.klant, [veld]: waarde } }));
  }

  function selecteerKlant(k) {
    updateActieveBon(prev => ({
      ...prev,
      klant: { ...prev.klant, ...klantNaarForm(k) },
      klantType: k.type === "particulier" ? "particulier" : "bedrijf"
    }));
    toonToast(`✓ ${k.naam} ingevuld`);
  }

  function updateRij(index, veld, waarde) {
    if (["vol", "leeg", "aftrek", "prijs"].includes(veld)) {
      if (waarde !== "" && !/^\d*\.?\d{0,2}$/.test(waarde)) return;
    }
    updateActieveBon(prev => ({
      ...prev,
      regels: prev.regels.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [veld]: waarde };
        if (veld === "materiaal" && prev.klantType === "particulier") {
          const mat = vindMateriaalOpNaam(waarde);
          if (mat && prijzen[mat.id] !== undefined) {
            updated.prijs = String(prijzen[mat.id]);
          } else if (!waarde.trim()) {
            updated.prijs = "";
          }
        }
        return updated;
      })
    }));
  }

  function rijTotaal(r) {
    const v = parseFloat(r.vol)    || 0;
    const l = parseFloat(r.leeg)   || 0;
    const a = parseFloat(r.aftrek) || 0;
    return Math.max(0, v - l - a);
  }
  function rijSubtotaal(r) { return rijTotaal(r) * (parseFloat(r.prijs) || 0); }
  function rijIsActief(r) { return r.materiaal.trim() !== "" || rijTotaal(r) > 0; }

  function haalGeldigeRegels() {
    return actieveBon.regels
      .map((r, i) => ({
        nr: i + 1,
        materiaal: r.materiaal.trim(),
        vol:    parseFloat(r.vol)    || 0,
        leeg:   parseFloat(r.leeg)   || 0,
        aftrek: parseFloat(r.aftrek) || 0,
        prijs:  parseFloat(r.prijs)  || 0,
        totaal: rijTotaal(r),
        subtotaal: rijSubtotaal(r),
        isActief: rijIsActief(r)
      }))
      .filter(r => r.isActief && r.totaal > 0 && r.prijs >= 0);
  }

  const totaalKg   = haalGeldigeRegels().reduce((s, r) => s + r.totaal, 0);
  const totaalEuro = haalGeldigeRegels().reduce((s, r) => s + r.subtotaal, 0);
  const isBedrijf  = actieveBon.klantType === "bedrijf";

  const wegingen24u = wegingen
    .map(w => ({ ...w, tijdMs: parseTijdString(w.tijd, w.datum) }))
    .filter(isBinnen24Uur)
    .sort((a, b) => (b.tijdMs || 0) - (a.tijdMs || 0));

  // Dedup wegingen op id om duplicate-key warnings te voorkomen
  const wegingenUniek = (() => {
    const seen = new Set();
    return wegingen24u.filter(w => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  })();

  function voegWegingToe(wegingId) {
    if (actieveBon.toegevoegd.includes(wegingId)) return;
    const w = wegingen.find(x => x.id === wegingId);
    if (!w) return;
    let doelIndex = actieveBon.regels.findIndex(r =>
      r.materiaal.trim() === "" && !r.vol && !r.leeg && !r.aftrek && !r.prijs
    );
    if (doelIndex === -1) doelIndex = 0;
    const prijs = prijzen[w.materiaal?.id] ?? w.prijs ?? 0;
    const vol    = w.vol    !== undefined && w.vol    !== null ? String(w.vol)    : String(w.gewicht);
    const leeg   = w.leeg   !== undefined && w.leeg   !== null ? String(w.leeg)   : "0";
    const aftrek = w.aftrek !== undefined && w.aftrek !== null ? String(w.aftrek) : "0";

    updateActieveBon(prev => ({
      ...prev,
      regels: prev.regels.map((r, i) => i === doelIndex ? {
        ...r, materiaal: w.materiaal.naam, vol: vol, leeg: leeg, aftrek: aftrek, prijs: String(prijs)
      } : r),
      toegevoegd: [...prev.toegevoegd, wegingId]
    }));
    const netto = Math.max(0, parseFloat(vol) - parseFloat(leeg) - parseFloat(aftrek));
    toonToast(`✓ ${w.materiaal.naam} · vol ${fmtI(parseFloat(vol))} − leeg ${fmtI(parseFloat(leeg))} = ${fmtI(netto)} kg netto`);
  }

  function verwijderWeging(wegingId) {
    const w = wegingen.find(x => x.id === wegingId);
    if (!w) return;
    const wPrijs = parseFloat(prijzen[w.materiaal?.id] ?? w.prijs ?? 0);
    const wVol   = w.vol  !== undefined && w.vol  !== null ? parseFloat(w.vol)  : w.gewicht;
    const wLeeg  = w.leeg !== undefined && w.leeg !== null ? parseFloat(w.leeg) : 0;
    updateActieveBon(prev => ({
      ...prev,
      regels: prev.regels.map(r => {
        const isMatch = r.materiaal.trim() === w.materiaal.naam &&
                        parseFloat(r.vol)   === wVol &&
                        parseFloat(r.leeg)  === wLeeg &&
                        parseFloat(r.prijs) === wPrijs;
        if (isMatch) return { materiaal: "", vol: "", leeg: "", aftrek: "", prijs: "" };
        return r;
      }),
      toegevoegd: prev.toegevoegd.filter(id => id !== wegingId)
    }));
    toonToast(`↶ ${w.materiaal.naam} verwijderd van bon`);
  }

  // AFDRUKKEN — bon blijft OPEN, met try/catch voor debugging
  function afdrukken() {
    console.log("🖨 afdrukken gestart");
    const regels = haalGeldigeRegels();
    if (regels.length === 0) { alert("Vul minstens één regel in."); return; }
    if (actieveBon.klantType === "bedrijf" && !actieveBon.klant.bedrijf.trim()) { alert("Vul een bedrijfsnaam in."); return; }
    if (actieveBon.klantType === "particulier" && !actieveBon.klant.naam.trim()) { alert("Vul een naam in."); return; }
    try {
      printBonUtil({
        bonnummer: actieveBon.bonnummer, klant: actieveBon.klant, klantType: actieveBon.klantType,
        regels: regels.map(r => ({
          materiaal: r.materiaal, kenteken: "–",
          vol: r.vol, leeg: r.leeg, aftrek: r.aftrek,
          totaal: r.totaal, prijs: r.prijs, subtotaal: r.subtotaal
        })),
        totaalKg, totaalEuro
      });
      toonToast("🖨 Afdrukken gestart — bon blijft open");
    } catch (e) {
      console.error("Print fout:", e);
      alert("Fout bij afdrukken: " + e.message);
    }
  }

  // PDF OPSLAAN — bon wordt WEL gesloten
  function opslaanAlsPdf() {
    const regels = haalGeldigeRegels();
    if (regels.length === 0) { alert("Vul minstens één regel in."); return; }
    if (actieveBon.klantType === "bedrijf" && !actieveBon.klant.bedrijf.trim()) { alert("Vul een bedrijfsnaam in."); return; }
    if (actieveBon.klantType === "particulier" && !actieveBon.klant.naam.trim()) { alert("Vul een naam in."); return; }
    const bestandsnaam = exporteerBonNaarPdf({
      bonnummer: actieveBon.bonnummer, klant: actieveBon.klant, klantType: actieveBon.klantType,
      regels: regels.map(r => ({
        materiaal: { naam: r.materiaal }, kenteken: "–", totaal: r.totaal, prijs: r.prijs,
      })),
      totaalKg, totaalEuro
    });
    registreerBonOmzet({
      bonnummer: actieveBon.bonnummer,
      totaalEuro,
      totaalKg,
      klant: actieveBon.klant,
      klantType: actieveBon.klantType,
      regels: regels.map(r => ({
        materiaal: r.materiaal,
        kg: r.totaal,
        subtotaal: r.subtotaal,
        prijs: r.prijs,
      })),
    });
    toonToast("💾 PDF: " + bestandsnaam);
    setTimeout(() => sluitActieveBonEnGaNaarVolgende(), 800);
  }

  function tabNaam(bon) {
    if (bon.klantType === "bedrijf" && bon.klant.bedrijf) return "📄 " + bon.klant.bedrijf;
    if (bon.klantType === "particulier" && bon.klant.naam) return "👤 " + bon.klant.naam;
    return "📄 Bon " + bon.id;
  }

  return (
    <div>
      <div style={{
        display: "flex", gap: 4, marginBottom: 0, padding: "8px 8px 0 8px",
        background: "var(--bg, #0f1011)", overflowX: "auto",
        borderBottom: "1px solid var(--border)"
      }}>
        {bonnen.map(bon => {
          const isActief = bon.id === actieveBonId;
          return (
            <div
              key={bon.id}
              onClick={() => setActieveBonId(bon.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px",
                background: isActief ? "var(--surface, #181a1b)" : "var(--surface2, #212426)",
                color: isActief ? "var(--text, #e8e4de)" : "var(--muted, #7a7570)",
                border: "1px solid var(--border)",
                borderBottom: isActief ? "1px solid var(--surface)" : "1px solid var(--border)",
                borderRadius: "6px 6px 0 0", cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", marginBottom: isActief ? -1 : 0,
                position: "relative", zIndex: isActief ? 1 : 0
              }}
            >
              <span>{tabNaam(bon)}</span>
              {bonnen.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); sluitBon(bon.id); }}
                  style={{
                    background: "none", border: "none", color: "var(--muted)",
                    cursor: "pointer", fontSize: 14, padding: 0, marginLeft: 4, lineHeight: 1
                  }}
                  title="Bon sluiten"
                >×</button>
              )}
            </div>
          );
        })}
        <button
          onClick={nieuweBon}
          style={{
            padding: "8px 14px", background: "transparent",
            color: "var(--accent2, #9ad29a)", border: "1px dashed var(--border)",
            borderRadius: "6px 6px 0 0", cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap"
          }}
        >+ Nieuwe bon</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <div className="weeg-paneel">
          <div className="weeg-paneel-header">
            <span className="weeg-paneel-title">
              📄 {actieveBon.bonnummer} — {tabNaam(actieveBon).replace("📄 ", "").replace("👤 ", "")}
            </span>
            <span className="badge">{actieveBon.regels.filter(rijIsActief).length} regels · {klanten.length} klanten</span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => updateActieveBon({ klantType: "bedrijf" })}
                  style={{ flex: 1, padding: "8px", borderRadius: 7,
                    border: "1px solid " + (isBedrijf ? "var(--accent2)" : "var(--border)"),
                    background: isBedrijf ? "rgba(46,125,50,0.1)" : "var(--surface2)",
                    color: isBedrijf ? "var(--accent2)" : "var(--muted)",
                    cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}
                >🏢 Bedrijf</button>
                <button onClick={() => updateActieveBon({ klantType: "particulier" })}
                  style={{ flex: 1, padding: "8px", borderRadius: 7,
                    border: "1px solid " + (!isBedrijf ? "var(--accent2)" : "var(--border)"),
                    background: !isBedrijf ? "rgba(46,125,50,0.1)" : "var(--surface2)",
                    color: !isBedrijf ? "var(--accent2)" : "var(--muted)",
                    cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}
                >👤 Particulier</button>
              </div>

              {isBedrijf ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ position: "relative" }}>
                    <KlantAutocomplete
                      klanten={klanten}
                      alleenZakelijk={true}
                      value={actieveBon.klant.bedrijf}
                      onChange={v => updateKlant("bedrijf", v)}
                      onSelect={k => selecteerKlant(k)}
                      placeholder="Bedrijfsnaam * (typ of klik)"
                    />
                  </div>
                  <input className="weeg-veld-input" placeholder="Contactpersoon"
                    value={actieveBon.klant.contactpersoon} onChange={e => updateKlant("contactpersoon", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="Adres"
                    value={actieveBon.klant.adres} onChange={e => updateKlant("adres", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="Postcode"
                    value={actieveBon.klant.postcode} onChange={e => updateKlant("postcode", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="Plaats"
                    value={actieveBon.klant.plaats} onChange={e => updateKlant("plaats", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="BTW-nummer"
                    value={actieveBon.klant.btw} onChange={e => updateKlant("btw", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="KvK-nummer"
                    value={actieveBon.klant.kvk} onChange={e => updateKlant("kvk", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="E-mail" type="email"
                    value={actieveBon.klant.email} onChange={e => updateKlant("email", e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ position: "relative", gridColumn: "span 2" }}>
                    <KlantAutocomplete
                      klanten={klanten}
                      alleenParticulier={true}
                      value={actieveBon.klant.naam}
                      onChange={v => updateKlant("naam", v)}
                      onSelect={k => selecteerKlant(k)}
                      placeholder="Naam * (typ of klik)"
                    />
                  </div>
                  <input className="weeg-veld-input" placeholder="Adres"
                    value={actieveBon.klant.adres} onChange={e => updateKlant("adres", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="Postcode + Plaats"
                    value={actieveBon.klant.plaats} onChange={e => updateKlant("plaats", e.target.value)} style={{ marginBottom: 0 }} />
                  <div style={{ gridColumn: "span 2", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Legitimatie:</span>
                    <select value={actieveBon.klant.legitimatieType} onChange={e => updateKlant("legitimatieType", e.target.value)} className="weeg-veld-input" style={{ flex: 1, marginBottom: 0 }}>
                      <option value="">— kies type —</option>
                      <option value="Rijbewijs">Rijbewijs</option>
                      <option value="Paspoort">Paspoort</option>
                      <option value="ID-kaart">ID-kaart</option>
                    </select>
                  </div>
                  <input className="weeg-veld-input" placeholder="Legitimatienummer"
                    value={actieveBon.klant.legitimatieNummer} onChange={e => updateKlant("legitimatieNummer", e.target.value)} style={{ marginBottom: 0, gridColumn: "span 2" }} />
                  <input className="weeg-veld-input" placeholder="Telefoon"
                    value={actieveBon.klant.telefoon} onChange={e => updateKlant("telefoon", e.target.value)} style={{ marginBottom: 0 }} />
                  <input className="weeg-veld-input" placeholder="E-mail" type="email"
                    value={actieveBon.klant.email} onChange={e => updateKlant("email", e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              )}
            </div>

            <div style={{ padding: 14, background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)", overflow: "visible" }}>
              {!isBedrijf && (
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 8 }}>
                  Particulier: kies een metaalsoort — €/kg (inkoop) wordt automatisch ingevuld vanuit Prijzen
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th()}>Materiaal</th>
                    <th style={th(true)}>Vol (kg)</th>
                    <th style={th(true)}>Leeg (kg)</th>
                    <th style={th(true)}>Aftrek (kg)</th>
                    <th style={th(true)}>Netto (kg)</th>
                    <th style={th(true)}>€/kg</th>
                    <th style={th(true)}>Subtotaal</th>
                  </tr>
                </thead>
                <tbody>
                  {actieveBon.regels.map((r, i) => {
                    const actief = rijIsActief(r);
                    const totaal = rijTotaal(r);
                    const sub    = rijSubtotaal(r);
                    return (
                      <tr key={i} style={{ opacity: actief ? 1 : 0.55 }}>
                        <td style={{ ...td(), position: "relative" }}>
                          {isBedrijf ? (
                            <input
                              style={inputStyle(false)}
                              placeholder="bijv. Koper"
                              value={r.materiaal}
                              onChange={e => updateRij(i, "materiaal", e.target.value)}
                            />
                          ) : (
                            <MateriaalAutocomplete
                              value={r.materiaal}
                              onChange={v => updateRij(i, "materiaal", v)}
                              onSelect={m => {
                                updateActieveBon(prev => ({
                                  ...prev,
                                  regels: prev.regels.map((regel, ri) => ri !== i ? regel : {
                                    ...regel,
                                    materiaal: m.naam,
                                    prijs: prijzen[m.id] !== undefined ? String(prijzen[m.id]) : regel.prijs,
                                  }),
                                }));
                              }}
                            />
                          )}
                        </td>
                        <td style={td(true)}>
                          <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                            value={r.vol} onChange={e => updateRij(i, "vol", e.target.value)} />
                        </td>
                        <td style={td(true)}>
                          <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                            value={r.leeg} onChange={e => updateRij(i, "leeg", e.target.value)} />
                        </td>
                        <td style={td(true)}>
                          <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0"
                            value={r.aftrek} onChange={e => updateRij(i, "aftrek", e.target.value)} />
                        </td>
                        <td style={td(true)}>
                          <span style={{
                            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13,
                            color: totaal > 0 ? "var(--accent2)" : "var(--muted)", padding: "0 8px"
                          }}>{totaal > 0 ? fmtI(totaal) : "—"}</span>
                        </td>
                        <td style={td(true)}>
                          <input style={inputStyle(true)} type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0.00"
                            value={r.prijs} onChange={e => updateRij(i, "prijs", e.target.value)} />
                        </td>
                        <td style={td(true)}>
                          <span style={{
                            fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13,
                            color: totaal > 0 && (parseFloat(r.prijs) || 0) > 0 ? "var(--accent2)" : "var(--muted)"
                          }}>€ {fmt(sub)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, padding: "14px 18px", background: "var(--surface)", border: "2px solid var(--accent)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL GEWICHT</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)" }}>{fmtI(totaalKg)} kg</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>TOTAAL BEDRAG</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent2)", fontFamily: "var(--mono)" }}>€ {fmt(totaalEuro)}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <button onClick={wisActieveBon} style={{ flex: 1, padding: "10px", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>🗑 Wissen</button>
            <button onClick={opslaanAlsPdf} disabled={totaalEuro === 0}
              style={{ flex: 1, padding: "10px", background: totaalEuro === 0 ? "var(--surface2)" : "var(--surface)", color: totaalEuro === 0 ? "var(--muted)" : "var(--accent2)", border: "1px solid " + (totaalEuro === 0 ? "var(--border)" : "var(--accent2)"), borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: totaalEuro === 0 ? "not-allowed" : "pointer", fontFamily: "var(--sans)" }}
            >💾 PDF</button>
            <button onClick={afdrukken} disabled={totaalEuro === 0}
              style={{ flex: 2, padding: "10px", background: totaalEuro === 0 ? "var(--surface2)" : "var(--accent)", color: totaalEuro === 0 ? "var(--muted)" : "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: totaalEuro === 0 ? "not-allowed" : "pointer", fontFamily: "var(--sans)" }}
            >🖨 Afdrukken</button>
          </div>
        </div>

        <div className="weeg-paneel" style={{ alignSelf: "start" }}>
          <div className="weeg-paneel-header">
            <span className="weeg-paneel-title">📋 Wegingen laatste 24u</span>
            <span className="badge">{wegingenUniek.length} beschikbaar</span>
          </div>
          <div style={{ padding: 10, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
            {wegingenUniek.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>Geen wegingen in de laatste 24 uur</div>
            ) : wegingenUniek.map((w, index) => {
              const isToegevoegd = actieveBon.toegevoegd.includes(w.id);
              const materiaalPrijs = parseFloat(prijzen[w.materiaal?.id] ?? w.prijs) || 0;
              const waarde = (w.gewicht || 0) * materiaalPrijs;
              return (
                <div key={w.id + "_" + index}
                  onClick={() => isToegevoegd ? verwijderWeging(w.id) : voegWegingToe(w.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: 10, marginBottom: 6, borderRadius: 7,
                    background: isToegevoegd ? "transparent" : "var(--surface2)", border: "1px solid var(--border)",
                    cursor: "pointer", opacity: isToegevoegd ? 0.6 : 1, transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { if (!isToegevoegd) e.currentTarget.style.background = "rgba(46,125,50,0.08)"; }}
                  onMouseLeave={e => { if (!isToegevoegd) e.currentTarget.style.background = "var(--surface2)"; }}
                >
                  <div style={{ fontSize: 18, flexShrink: 0 }}>{w.bron === "loods" ? "⚖" : "🚛"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                      <span style={{ color: "var(--text)", fontWeight: 700 }}>{w.tijd || "–"}</span>
                      <span>·</span>
                      <span>{fmtDatum(w.tijdMs ? new Date(w.tijdMs) : new Date())}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, fontSize: 13, fontWeight: 600 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.materiaal?.kleur || "#888", flexShrink: 0 }} />
                      <span>{w.materiaal?.naam || "Onbekend"}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 400 }}>·</span>
                      <span style={{ fontFamily: "var(--mono)" }}>{w.kenteken || "–"}</span>
                    </div>
                    {w.richting && (
                      <div className={w.richting === "uitgaand" ? "richting-uitgaand" : "richting-inkomend"} style={{ fontSize: 10, fontFamily: "var(--mono)", marginTop: 2 }}>
                        {w.richting === "uitgaand" ? "↑ Uitgaand" : "↓ Inkomend"}
                      </div>
                    )}
                    {w.klantNaam && (
                      <div style={{
                        fontSize: 12, color: "var(--accent2)", marginTop: 2, fontFamily: "var(--sans)",
                        fontWeight: 600, display: "flex", alignItems: "center", gap: 4
                      }}>
                        <span>👤</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.klantNaam}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontFamily: "var(--mono)" }}>
                      {fmtI(w.gewicht || 0)} kg · € {fmt(materiaalPrijs)}/kg · € {fmt(waarde)}
                    </div>
                  </div>
                  {isToegevoegd ? (
                    <button onClick={(e) => { e.stopPropagation(); verwijderWeging(w.id); }}
                      title="Klik om ongedaan te maken"
                      style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(46,125,50,0.2)",
                        color: "var(--accent2)", border: "1px solid rgba(46,125,50,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0, cursor: "pointer", padding: 0 }}
                    >✓</button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); voegWegingToe(w.id); }}
                      style={{ background: "var(--accent)", color: "#fff", border: "none",
                        width: 28, height: 28, borderRadius: 6, fontSize: 16, fontWeight: 700,
                        cursor: "pointer", flexShrink: 0, padding: 0 }}
                    >+</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
