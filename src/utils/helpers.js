// ===== Bon-nummer (dagelijkse teller, begint elke dag op 1) =====
const BON_TELLER_KEY = "ws-bon-teller";

function bonDatumKey() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function maakBonnummer() {
  const datum = bonDatumKey();
  let teller = 1;
  try {
    const raw = localStorage.getItem(BON_TELLER_KEY);
    const opgeslagen = raw ? JSON.parse(raw) : null;
    if (opgeslagen?.datum === datum) {
      teller = (opgeslagen.teller || 0) + 1;
    }
    localStorage.setItem(BON_TELLER_KEY, JSON.stringify({ datum, teller }));
  } catch {}
  return `${datum}-${String(teller).padStart(3, "0")}`;
}

// ===== XML Parser voor NewTon+ import =====
export function parseNewtonXML(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const wegingen = [];

    // Probeer verschillende XML-structuren
    const nodes = doc.getElementsByTagName("weging");
    if (nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const w = nodes[i];
        wegingen.push(xmlNodeNaarWeging(w));
      }
    } else {
      // Probeer alternatieve structuur (record-based)
      const records = doc.getElementsByTagName("record");
      for (let i = 0; i < records.length; i++) {
        wegingen.push(xmlNodeNaarWeging(records[i]));
      }
    }

    return wegingen;
  } catch (e) {
    return [];
  }
}

function xmlNodeNaarWeging(node) {
  const get = (tag) => {
    const el = node.getElementsByTagName(tag)[0];
    return el ? el.textContent.trim() : "";
  };
  const getNum = (tag) => parseFloat(get(tag)) || 0;

  // Probeer materiaal op te zoeken
  const materiaalNaam = get("materiaal") || get("soort") || "Onbekend";
  const materiaalId = get("materiaalId") || materiaalNaam.toLowerCase().slice(0, 3);
  const kleur = get("kleur") || "#4caf7d";

  return {
    id: Date.now() + Math.random(),
    kenteken: get("kenteken") || "–",
    materiaal: { id: materiaalId, naam: materiaalNaam, kleur: kleur, tag: "tag-" + materiaalId },
    gewicht: getNum("gewicht") || getNum("kg") || 0,
    prijs: getNum("prijs") || 0,
    totaal: getNum("totaal") || 0,
    tijd: get("tijd") || new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
    datum: get("datum") || new Date().toLocaleDateString("nl-NL"),
    bron: "xml-import"
  };
}

// ===== Demo wegingen =====
export function initWegingen() {
  const vandaag = new Date();
  const fmt = (offset) => {
    const d = new Date(vandaag.getTime() - offset * 3600000);
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };
  const dagen = (offset) => {
    const d = new Date(vandaag.getTime() - offset * 86400000);
    return d.toLocaleDateString("nl-NL");
  };

  return [
    { id: 1, kenteken: "NL-KL-807",  materiaal: { id: 2, naam: "Aluminium", kleur: "#9ec1e8", tag: "tag-alu" }, gewicht: 5863, prijs: 1.85, totaal: 10846.55, tijd: fmt(0.05), datum: dagen(0), bron: "live" },
    { id: 2, kenteken: "NL-IJ-770",  materiaal: { id: 1, naam: "Koper",      kleur: "#4caf7d", tag: "tag-kop" }, gewicht: 3688, prijs: 6.40, totaal: 23603.20, tijd: fmt(0.4),  datum: dagen(0), bron: "live" },
    { id: 3, kenteken: "NL-GH-733",  materiaal: { id: 5, naam: "RVS",        kleur: "#8a8a8a", tag: "tag-rvs" }, gewicht: 5986, prijs: 1.10, totaal: 6584.60,  tijd: fmt(0.75), datum: dagen(0), bron: "live" },
    { id: 4, kenteken: "NL-EF-696",  materiaal: { id: 4, naam: "Messing",    kleur: "#d4b84a", tag: "tag-mes" }, gewicht: 2074, prijs: 4.20, totaal: 8710.80,  tijd: fmt(1.1),  datum: dagen(0), bron: "live" },
    { id: 5, kenteken: "NL-CD-659",  materiaal: { id: 3, naam: "Staal",      kleur: "#a89a8c", tag: "tag-sta" }, gewicht: 3691, prijs: 0.35, totaal: 1291.85,  tijd: fmt(1.45), datum: dagen(0), bron: "live" },
    { id: 6, kenteken: "NL-AB-622",  materiaal: { id: 2, naam: "Aluminium", kleur: "#9ec1e8", tag: "tag-alu" }, gewicht: 4006, prijs: 1.85, totaal: 7411.10,  tijd: fmt(1.8),  datum: dagen(0), bron: "live" },
    { id: 7, kenteken: "NL-KL-585",  materiaal: { id: 1, naam: "Koper",      kleur: "#4caf7d", tag: "tag-kop" }, gewicht: 7571, prijs: 6.40, totaal: 48454.40, tijd: fmt(2.15), datum: dagen(0), bron: "live" },
    { id: 8, kenteken: "NL-IJ-548",  materiaal: { id: 5, naam: "RVS",        kleur: "#8a8a8a", tag: "tag-rvs" }, gewicht: 4928, prijs: 1.10, totaal: 5420.80,  tijd: fmt(2.5),  datum: dagen(0), bron: "live" },
    { id: 9, kenteken: "NL-DD-512",  materiaal: { id: 1, naam: "Koper",      kleur: "#4caf7d", tag: "tag-kop" }, gewicht: 2240, prijs: 6.40, totaal: 14336.00, tijd: fmt(24),   datum: dagen(1), bron: "live" },
    { id: 10, kenteken: "NL-XX-001", materiaal: { id: 3, naam: "Staal",      kleur: "#a89a8c", tag: "tag-sta" }, gewicht: 8500, prijs: 0.35, totaal: 2975.00,  tijd: fmt(28),   datum: dagen(1), bron: "live" },
    { id: 11, kenteken: "NL-EE-444", materiaal: { id: 4, naam: "Messing",    kleur: "#d4b84a", tag: "tag-mes" }, gewicht: 1200, prijs: 4.20, totaal: 5040.00,  tijd: fmt(50),   datum: dagen(2), bron: "live" },
    { id: 12, kenteken: "NL-ZZ-999", materiaal: { id: 2, naam: "Aluminium", kleur: "#9ec1e8", tag: "tag-alu" }, gewicht: 3300, prijs: 1.85, totaal: 6105.00,  tijd: fmt(72),   datum: dagen(2), bron: "live" }
  ];
}

// ===== Print Bon =====
export function printBon({ bonnummer, klant, klantType, regels, totaalKg, totaalEuro, bedrijfsnaam = "WeegStation", productNaam = "WeegStation" }) {
  const datum = new Date().toLocaleDateString("nl-NL");
  const tijd = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  const klantRegelHTML = klantType === "bedrijf"
    ? `<tr><td><strong>${klant.bedrijf || "—"}</strong></td><td>${klant.contactpersoon || ""}</td></tr>
<tr><td>Adres:</td><td>${klant.adres || ""}, ${klant.postcode || ""} ${klant.plaats || ""}</td></tr>
<tr><td>BTW:</td><td>${klant.btw || ""}</td></tr>
<tr><td>KvK:</td><td>${klant.kvk || ""}</td></tr>
<tr><td>E-mail:</td><td>${klant.email || ""}</td></tr>`
    : `<tr><td><strong>${klant.naam || "—"}</strong></td></tr>
<tr><td>Adres:</td><td>${klant.adres || ""}, ${klant.plaats || ""}</td></tr>
<tr><td>Tel:</td><td>${klant.telefoon || ""}</td></tr>
<tr><td>E-mail:</td><td>${klant.email || ""}</td></tr>
${klant.legitimatieType && klant.legitimatieNummer
  ? `<tr><td>${klant.legitimatieType}:</td><td><strong>${klant.legitimatieNummer}</strong></td></tr>`
  : ""}`;

  const regelsHTML = regels.map(r => `
<tr>
<td>${r.datum || ""} ${r.tijd || ""}</td>
<td>${r.kenteken || "—"}</td>
<td>${r.materiaal?.naam || r.materiaal || "—"}</td>
<td style="text-align:right">${(r.vol || 0).toLocaleString("nl-NL")} kg</td>
<td style="text-align:right">€ ${(r.prijs || 0).toFixed(2)}/kg</td>
<td style="text-align:right;font-weight:700">€ ${(r.totaal || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>
`).join("");

  const bonHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Bon ${bonnummer}</title>
<style>
body { font-family: 'Segoe UI', sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #000; }
h1 { color: #2e7d32; margin-bottom: 4px; font-size: 24px; }
h2 { color: #333; margin-top: 0; font-size: 16px; font-weight: normal; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
th { background: #f5f5f5; font-weight: 600; }
.klant-info { background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 12px; }
.klant-info td { border: none; padding: 3px 8px; }
.totaal { margin-top: 16px; text-align: right; font-size: 18px; font-weight: 700; color: #2e7d32; }
.footer { margin-top: 30px; font-size: 11px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${bedrijfsnaam}</h1>
<h2>Bon ${bonnummer} — ${datum} ${tijd}</h2>
<div class="klant-info">
<table>
<tr><td><strong>${klantType === "bedrijf" ? "Bedrijf" : "Particulier"}:</strong></td><td></td></tr>
${klantRegelHTML}
</table>
</div>
<table>
<thead>
<tr>
<th>Datum/Tijd</th>
<th>Kenteken</th>
<th>Materiaal</th>
<th style="text-align:right">Gewicht</th>
<th style="text-align:right">Prijs/kg</th>
<th style="text-align:right">Bedrag</th>
</tr>
</thead>
<tbody>${regelsHTML}</tbody>
</table>
<div class="totaal">
Totaal: ${totaalKg.toLocaleString("nl-NL")} kg — € ${totaalEuro.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</div>
<div class="footer">
${productNaam} · ${bedrijfsnaam} · Dit document is automatisch gegenereerd
</div>
<script>window.onload = function() { setTimeout(() => window.print(), 200); };</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    alert("Pop-up geblokkeerd. Sta pop-ups toe voor deze app.");
    return;
  }
  w.document.open();
  w.document.write(bonHTML);
  w.document.close();
  w.document.title = "Bon " + bonnummer;

  const doePrint = () => {
    try {
      w.focus();
      w.print();
    } catch (e) {
      console.error("Print mislukt:", e);
    }
  };

  if (w.document.readyState === "complete") {
    setTimeout(doePrint, 200);
  } else {
    w.onload = () => setTimeout(doePrint, 200);
  }
}
