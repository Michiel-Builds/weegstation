// =============================================
// LMA-herinneringen
// - Certificaatverloop (30 / 3 dagen)
// - Maandelijkse meldplicht (binnen ~4 weken na afloop van de maand)
// =============================================

import { aggregeerOntvangstPerAsn, MELDING_STATUS, maandLabel } from "./lmaMeldingen";

function dagenTussen(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function certHerinnering(bedrijf, nu = new Date()) {
  const verloopt = bedrijf?.lma?.certVerloopt;
  if (!verloopt) return null;
  const datum = new Date(verloopt + "T00:00:00");
  if (isNaN(datum.getTime())) return null;
  const dagen = dagenTussen(datum, nu);
  if (dagen < 0) {
    return { niveau: "fout", tekst: `XML-certificaat is ${Math.abs(dagen)} dagen verlopen — vernieuw direct.` };
  }
  if (dagen <= 3) {
    return { niveau: "fout", tekst: `XML-certificaat verloopt over ${dagen} dag(en).` };
  }
  if (dagen <= 30) {
    return { niveau: "waarschuwing", tekst: `XML-certificaat verloopt over ${dagen} dagen — plan vernieuwing.` };
  }
  return null;
}

// Vorige maand bepalen t.o.v. nu.
function vorigeMaand(nu = new Date()) {
  const d = new Date(nu.getFullYear(), nu.getMonth() - 1, 1);
  return { jaar: d.getFullYear(), maand: d.getMonth() + 1 };
}

// Is er voor de vorige maand nog niet gemeld terwijl er wel meldplichtige
// wegingen waren, en zijn we al >0 dagen de nieuwe maand in?
export function maandmeldingHerinnering(wegingen, meldingen, bedrijf, nu = new Date()) {
  const { jaar, maand } = vorigeMaand(nu);
  const aggr = aggregeerOntvangstPerAsn(wegingen, jaar, maand);
  if (aggr.length === 0) return null;

  const teMelden = aggr.filter(rij => {
    const m = meldingen.find(x => x.jaar === jaar && x.maand === maand && x.asn === rij.asn);
    return !m || (m.status !== MELDING_STATUS.GEMELD && m.status !== MELDING_STATUS.VERZONDEN);
  });
  if (teMelden.length === 0) return null;

  return {
    niveau: "waarschuwing",
    tekst: `${teMelden.length} ASN-melding(en) over ${maandLabel(jaar, maand)} nog niet verzonden (meld binnen 4 weken na afloop van de maand).`,
    jaar, maand,
  };
}

export function verzamelHerinneringen(wegingen, meldingen, bedrijf, nu = new Date()) {
  const lijst = [];
  const cert = certHerinnering(bedrijf, nu);
  if (cert) lijst.push(cert);
  const maand = maandmeldingHerinnering(wegingen, meldingen, bedrijf, nu);
  if (maand) lijst.push(maand);
  return lijst;
}
