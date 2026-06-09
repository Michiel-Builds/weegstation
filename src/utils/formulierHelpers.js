import { BULTERS_PARTIJ } from "../data/bultersBedrijf";

export const FORM_ROLLEN = [
  { key: "afzender", label: "Afzender" },
  { key: "ontvanger", label: "Ontvanger" },
  { key: "transporteur", label: "Transporteur" },
];

export function maakLegePartij() {
  return {
    naam: "",
    contactpersoon: "",
    adres: "",
    postcode: "",
    plaats: "",
    btw: "",
    kvk: "",
    telefoon: "",
    email: "",
    vihb: "",
    land: "Nederland",
  };
}

export function klantNaarPartij(k) {
  if (!k) return maakLegePartij();
  return {
    naam: k.naam || "",
    contactpersoon: k.contactpersoon || "",
    adres: k.adres || "",
    postcode: k.postcode || "",
    plaats: k.plaats || "",
    btw: k.btw || "",
    kvk: k.kvk || "",
    telefoon: k.telefoon || "",
    email: k.email || "",
    vihb: k.vihb || "",
    land: "Nederland",
  };
}

export function maakDocumentnummer() {
  const d = new Date();
  const datum = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `FORM-${datum}-${seq}`;
}

export function maakInitFormulierData() {
  const vandaag = new Date().toLocaleDateString("nl-NL");
  return {
    documentnummer: maakDocumentnummer(),
    datum: vandaag,
    plaatsOpstellen: "",
    kenteken: "",
    gewicht: "",
    aantalColli: "",
    verpakking: "Bulk / los",
    afvalstof: "",
    ewcCode: "",
    baselCode: "",
    unNummer: "",
    opmerkingen: "",
    bijlagen: "",
    cmrNummer: "",
    afvalstroomnummer: "",
    locatieHerkomst: "",
    verwerkingsmethode: "",
    ontdoener: maakLegePartij(),
    factuuradres: maakLegePartij(),
    uitbesteedVervoerder: maakLegePartij(),
    partijen: {
      afzender: { ...BULTERS_PARTIJ },
      ontvanger: maakLegePartij(),
      transporteur: maakLegePartij(),
    },
  };
}

export function partijNaarTekst(p) {
  const regels = [];
  if (p.naam) regels.push(p.naam);
  if (p.contactpersoon) regels.push("T.a.v. " + p.contactpersoon);
  const adres = [p.adres, p.postcode, p.plaats].filter(Boolean).join(", ");
  if (adres) regels.push(adres);
  if (p.land && p.land !== "Nederland") regels.push(p.land);
  if (p.btw) regels.push("BTW: " + p.btw);
  if (p.kvk) regels.push("KvK: " + p.kvk);
  if (p.vihb) regels.push("VIHB: " + p.vihb);
  if (p.telefoon) regels.push("Tel: " + p.telefoon);
  if (p.email) regels.push(p.email);
  return regels.join("<br>") || "—";
}

export function partijNaarPlain(p) {
  return partijNaarTekst(p).replace(/<br>/g, "\n");
}

const STORAGE_KEY = "newton-formulieren";

export function laadFormulierData() {
  if (typeof window === "undefined") return maakInitFormulierData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.partijen) return { ...maakInitFormulierData(), ...parsed };
    }
  } catch (e) {}
  return maakInitFormulierData();
}

export function bewaarFormulierData(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}
