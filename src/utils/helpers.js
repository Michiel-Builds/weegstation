import { MATERIALEN } from "../data/stamdata";

export function rndGewicht(min, max) {
  return parseInt((Math.random() * (max - min) + min).toFixed(0));
}

export function initWegingen() {
  const nu = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const mat = MATERIALEN[i % MATERIALEN.length];
    const d = new Date(nu - (12 - i) * 4 * 60000);
    return {
      id: i + 1,
      materiaal: mat,
      gewicht: rndGewicht(80, 8000),
      kenteken: `NL-${["AB","CD","EF","GH","IJ","KL"][i % 6]}-${400 + i * 37}`,
      tijd:  d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      datum: d.toLocaleDateString("nl-NL"),
      bron: "demo",
      isNieuw: false,
    };
  }).reverse();
}

export function parseNewtonXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Ongeldig XML-bestand");

  const wegingen = [];
  const nodes = doc.querySelectorAll("weging, Weging");
  if (nodes.length === 0) throw new Error("Geen <weging> elementen gevonden in XML");

  nodes.forEach((node, i) => {
    const get = (tag) => {
      const el = node.querySelector(tag)
              || node.querySelector(tag.toLowerCase())
              || node.querySelector(tag.toUpperCase());
      return el ? el.textContent.trim() : "";
    };
    const materiaalNaam = get("materiaal") || "Onbekend";
    const mat = MATERIALEN.find(m => m.naam.toLowerCase() === materiaalNaam.toLowerCase())
      || { id: 99, naam: materiaalNaam, kleur: "#888", tag: "tag-staal" };

    wegingen.push({
      id: Date.now() + i,
      materiaal: mat,
      gewicht: parseFloat(get("gewicht") || "0"),
      kenteken: get("kenteken") || "–",
      datum: get("datum") || new Date().toLocaleDateString("nl-NL"),
      tijd:  get("tijd")  || "00:00:00",
      bron: "xml",
      isNieuw: true,
    });
  });
  return wegingen;
}

let bonTeller = parseInt(localStorage.getItem("bulters_bon_teller") || "0");
export function maakBonnummer() {
  const datum = new Date();
  const prefix = datum.getFullYear().toString() +
    String(datum.getMonth() + 1).padStart(2, "0") +
    String(datum.getDate()).padStart(2, "0");
  bonTeller++;
  localStorage.setItem("bulters_bon_teller", bonTeller);
  return `${prefix}-${String(bonTeller).padStart(3, "0")}`;
}

export function printBon(bon) {
  const nu = new Date();
  const datum = nu.toLocaleDateString("nl-NL");
  const tijd  = nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const regelsHTML = (bon.regels || [bon]).map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.kenteken || "–"}</td>
        <td>${r.materiaal.naam}</td>
        <td style="text-align:right">${r.gewicht.toLocaleString("nl-NL")} kg</td>
        <td style="text-align:right">€ ${(r.prijs || 0).toFixed(2)}</td>
        <td style="text-align:right;font-weight:700">€ ${(r.totaal || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`).join("");
  const totaalKg   = (bon.regels || [bon]).reduce((s, r) => s + r.gewicht, 0);
  const totaalEuro = bon.totaalEuro !== undefined
    ? bon.totaalEuro
    : (bon.regels || [bon]).reduce((s, r) => s + (r.totaal || 0), 0);
  const bonHTML = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Bon ${bon.bonnummer}</title></head><body><h1>Metaalrecycling Bulters</h1><h2>${bon.bonnummer}</h2><p>${datum} ${tijd}</p><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">${regelsHTML}</table><h3>Totaal: ${totaalKg} kg — € ${totaalEuro.toFixed(2)}</h3><script>window.onload=function(){window.print();}</script></body></html>`;
  const popup = window.open("", "_blank", "width=750,height=1000");
  if (popup) { popup.document.write(bonHTML); popup.document.close(); }
}
