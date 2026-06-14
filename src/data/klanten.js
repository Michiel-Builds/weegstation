// =============================================
// KLANTEN-DATA & HOOK
// Opslag in localStorage (sleutel: ws-klanten)
// =============================================

const STORAGE_KEY = "ws-klanten";

function laadKlanten() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return maakVoorbeeldKlanten();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return maakVoorbeeldKlanten();
    return parsed;
  } catch (e) {
    console.error("Fout bij laden klanten:", e);
    return maakVoorbeeldKlanten();
  }
}

function maakVoorbeeldKlanten() {
  return [
    { id: 1, type: "zakelijk", naam: "Jansen Metaal B.V.", contactpersoon: "Jan Jansen",
      adres: "Industrieweg 12", postcode: "5345 XX", plaats: "Eindhoven",
      btw: "NL123456789B01", kvk: "12345678", email: "info@jansen-metaal.nl",
      telefoon: "040-1234567", legitimatieType: "", legitimatieNummer: "",
      notities: "" },
    { id: 2, type: "zakelijk", naam: "De Vries Recycling", contactpersoon: "Petra de Vries",
      adres: "Schrootweg 8", postcode: "5011 AB", plaats: "Tilburg",
      btw: "NL987654321B01", kvk: "87654321", email: "p.devries@devries-recycling.nl",
      telefoon: "013-7654321", legitimatieType: "", legitimatieNummer: "",
      notities: "" },
    { id: 3, type: "particulier", naam: "P. Bakker", contactpersoon: "",
      adres: "Dorpsstraat 5", postcode: "1234 AB", plaats: "Best",
      btw: "", kvk: "", email: "", telefoon: "06-12345678",
      legitimatieType: "Rijbewijs", legitimatieNummer: "12345678",
      notities: "" },
  ];
}

function bewaarKlanten(klanten) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(klanten));
  } catch (e) {
    console.error("Fout bij bewaren klanten:", e);
  }
}

function nieuwId(klanten) {
  return klanten.length > 0 ? Math.max(...klanten.map(k => k.id)) + 1 : 1;
}

export function maakLegeKlant(klanten) {
  return {
    id: nieuwId(klanten),
    type: "zakelijk",
    naam: "",
    contactpersoon: "",
    adres: "",
    postcode: "",
    plaats: "",
    btw: "",
    kvk: "",
    email: "",
    telefoon: "",
    legitimatieType: "",
    legitimatieNummer: "",
    notities: ""
  };
}

export function voegKlantToe(klanten, klant) {
  const updated = [...klanten, klant];
  bewaarKlanten(updated);
  return updated;
}

export function updateKlant(klanten, id, veld, waarde) {
  const updated = klanten.map(k => k.id === id ? { ...k, [veld]: waarde } : k);
  bewaarKlanten(updated);
  return updated;
}

export function verwijderKlant(klanten, id) {
  const updated = klanten.filter(k => k.id !== id);
  bewaarKlanten(updated);
  return updated;
}

export function getZakelijk(klanten) {
  return klanten.filter(k => k.type === "zakelijk");
}
export function getParticulier(klanten) {
  return klanten.filter(k => k.type === "particulier");
}

export function vindKlant(klanten, id) {
  return klanten.find(k => k.id === id);
}

export function zoekKlanten(klanten, query) {
  if (!query) return klanten;
  const q = query.toLowerCase();
  return klanten.filter(k =>
    k.naam.toLowerCase().includes(q) ||
    (k.plaats || "").toLowerCase().includes(q) ||
    (k.kvk || "").toLowerCase().includes(q) ||
    (k.btw || "").toLowerCase().includes(q)
  );
}

function parseCSVRegel(regel) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current); current = ""; }
    else current += c;
  }
  result.push(current);
  return result;
}

export function importeerCSV(klanten, csvTekst) {
  const regels = csvTekst.split(/\r?\n/).filter(r => r.trim());
  if (regels.length < 2) return { klanten, toegevoegd: 0, fout: "Geen data gevonden" };

  const header = parseCSVRegel(regels[0]).map(h => h.toLowerCase().trim());
  const kolIndex = {};
  ["naam", "type", "adres", "postcode", "plaats", "btw", "kvk", "email", "telefoon", "contactpersoon"].forEach(k => {
    const idx = header.findIndex(h => h === k || h.startsWith(k));
    if (idx !== -1) kolIndex[k] = idx;
  });

  if (kolIndex.naam === undefined) {
    return { klanten, toegevoegd: 0, fout: "Kolom 'naam' ontbreekt" };
  }

  let toegevoegd = 0;
  let huidigeKlanten = [...klanten];

  for (let i = 1; i < regels.length; i++) {
    const velden = parseCSVRegel(regels[i]);
    const naam = velden[kolIndex.naam]?.trim();
    if (!naam) continue;

    const type = (velden[kolIndex.type] || "zakelijk").toLowerCase().trim();
    const nieuweKlant = {
      ...maakLegeKlant(huidigeKlanten),
      type: type === "particulier" ? "particulier" : "zakelijk",
      naam,
      contactpersoon: velden[kolIndex.contactpersoon]?.trim() || "",
      adres: velden[kolIndex.adres]?.trim() || "",
      postcode: velden[kolIndex.postcode]?.trim() || "",
      plaats: velden[kolIndex.plaats]?.trim() || "",
      btw: velden[kolIndex.btw]?.trim() || "",
      kvk: velden[kolIndex.kvk]?.trim() || "",
      email: velden[kolIndex.email]?.trim() || "",
      telefoon: velden[kolIndex.telefoon]?.trim() || "",
    };
    huidigeKlanten = voegKlantToe(huidigeKlanten, nieuweKlant);
    toegevoegd++;
  }

  return { klanten: huidigeKlanten, toegevoegd, fout: null };
}

export function getInitKlanten() {
  return laadKlanten();
}
