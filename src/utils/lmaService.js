// =============================================
// LMA-service (renderer)
// Bouwt meldingpayloads en kapselt de Electron IPC-calls in. Buiten Electron
// (browser/dev) geven de verzendfuncties een nette "niet beschikbaar" terug.
// =============================================

function heeftElectron() {
  return typeof window !== "undefined" && !!window.electronAPI?.lmaMelden;
}

function certConfigVan(bedrijf) {
  const l = bedrijf?.lma || {};
  return {
    pfxPad: l.pfxPad || "",
    caPad: l.caPad || "",
    wachtwoord: l.certWachtwoord || "",
  };
}

// Bouw de payload voor een ontvangst-/nulmelding uit een overzicht-regel.
export function bouwOntvangstPayload({ bedrijf, regel, afvalstroom, klant }) {
  const l = bedrijf?.lma || {};
  return {
    verwerker: {
      verwerkersnummer: l.verwerkersnummer || "",
      bedrijfsnummer: l.bedrijfsnummer || "",
      naam: bedrijf?.bedrijfsnaam || "",
      kvk: l.kvk || "",
      adres: l.adres || "",
      postcode: l.postcode || "",
      plaats: l.plaats || "",
    },
    periode: { jaar: regel.jaar ?? null, maand: regel.maand ?? null },
    ontdoener: {
      naam: klant?.naam || regel.klantNaam || afvalstroom?.ontdoenerNaam || "",
      kvk: klant?.kvk || afvalstroom?.ontdoenerKvK || "",
      bedrijfsnummer: klant?.amiceBedrijfsnummer || afvalstroom?.ontdoenerBedrijfsnummer || "",
      locatieHerkomst: afvalstroom?.locatieHerkomst || "",
    },
    asn: regel.asn,
    euralCode: regel.euralCode || afvalstroom?.euralCode || "",
    gevaarlijk: regel.gevaarlijk ?? afvalstroom?.gevaarlijk ?? false,
    gebruikelijkeBenaming: afvalstroom?.gebruikelijkeBenaming || "",
    verwerkingsmethode: regel.verwerkingsmethode || afvalstroom?.verwerkingsmethode || "",
    aardSamenstelling: afvalstroom?.aardSamenstelling || "",
    hoeveelheidKg: regel.kg || 0,
    aantalVrachten: regel.aantalVrachten || 0,
  };
}

export async function exporteerXml({ type, payload, suggestedName }) {
  if (!window.electronAPI?.lmaExporteerXml) {
    return { ok: false, fout: "XML-export is alleen beschikbaar in de desktop-app" };
  }
  return window.electronAPI.lmaExporteerXml({ type, payload, suggestedName });
}

export async function verstuurMelding({ type, payload, bedrijf }) {
  if (!heeftElectron()) {
    return { ok: false, fout: "Verzenden is alleen beschikbaar in de desktop-app" };
  }
  const omgeving = bedrijf?.lma?.omgeving || "bto";
  return window.electronAPI.lmaMelden({ type, payload, omgeving, certConfig: certConfigVan(bedrijf) });
}

export async function toetsAsn({ asn, bedrijf }) {
  if (!window.electronAPI?.lmaToetsAsn) {
    return { ok: false, fout: "Alleen beschikbaar in de desktop-app" };
  }
  const omgeving = bedrijf?.lma?.omgeving || "bto";
  return window.electronAPI.lmaToetsAsn({ asn, omgeving, certConfig: certConfigVan(bedrijf) });
}

export function certIngesteld(bedrijf) {
  return !!(bedrijf?.lma?.pfxPad);
}
