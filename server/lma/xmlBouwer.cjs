// =============================================
// AMICE XML-bouwer (spec v3.3)
// Bouwt de 4 berichttypes voor het Landelijk Meldpunt Afvalstoffen:
//   - Eerste ontvangstmelding
//   - Maandelijkse ontvangstmelding
//   - Nulmelding
//   - Afgiftemelding
//
// LET OP: de EXACTE element-/namespace-namen moeten geverifieerd worden tegen
// de officiele AMICE XML-specificatie v3.3 (PDF) + voorbeeld-XML's, die pas
// beschikbaar zijn met een BTO-testaccount. De structuur hieronder volgt de
// AMICE-conventies en is bewust op 1 centrale plek gedefinieerd (TAGS) zodat
// aanpassen aan de definitieve spec eenvoudig is.
// =============================================

// Centrale tag-namen (aanpassen aan spec v3.3 zodra voorbeeld-XML beschikbaar is)
const TAGS = {
  envelope: "Meldingen",
  ontvangst: "OntvangstMelding",
  afgifte: "AfgifteMelding",
  nul: "Nulmelding",
};

const NAMESPACE = "http://www.lma.nl/amice/v3.3"; // TODO: bevestigen uit WSDL/spec

function escapeXml(waarde) {
  if (waarde === null || waarde === undefined) return "";
  return String(waarde)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Eenvoudige element-helper. waarde leeg => zelfsluitend weglaten.
function el(naam, waarde, attrs) {
  const attrStr = attrs
    ? " " + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")
    : "";
  if (waarde === null || waarde === undefined || waarde === "") {
    return "";
  }
  return `<${naam}${attrStr}>${escapeXml(waarde)}</${naam}>`;
}

function wrap(naam, binnen, attrs) {
  const attrStr = attrs
    ? " " + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")
    : "";
  return `<${naam}${attrStr}>${binnen}</${naam}>`;
}

function verwerkerBlok(v = {}) {
  return wrap("Verwerker", [
    el("Verwerkersnummer", v.verwerkersnummer),
    el("Bedrijfsnummer", v.bedrijfsnummer),
    el("Naam", v.naam),
    el("Kvk", v.kvk),
    el("Adres", v.adres),
    el("Postcode", v.postcode),
    el("Plaats", v.plaats),
  ].join(""));
}

function ontdoenerBlok(o = {}) {
  return wrap("Ontdoener", [
    el("Naam", o.naam),
    el("Kvk", o.kvk),
    el("Bedrijfsnummer", o.bedrijfsnummer),
    el("Herkomst", o.locatieHerkomst),
  ].join(""));
}

function vervoerderBlok(t) {
  if (!t || (!t.naam && !t.vihb)) return "";
  return wrap("Vervoerder", [
    el("Naam", t.naam),
    el("Vihb", t.vihb),
    el("Bedrijfsnummer", t.bedrijfsnummer),
  ].join(""));
}

function periodeBlok(p = {}) {
  return wrap("Periode", [
    el("Jaar", p.jaar),
    el("Maand", p.maand),
  ].join(""));
}

function afvalBlok(p = {}) {
  return wrap("Afvalstroom", [
    el("Afvalstroomnummer", p.asn),
    el("EuralCode", p.euralCode),
    el("Gevaarlijk", p.gevaarlijk ? "true" : "false"),
    el("GebruikelijkeBenaming", p.gebruikelijkeBenaming),
    el("Verwerkingsmethode", p.verwerkingsmethode),
    // Voor gevaarlijke stromen: aard/samenstelling (+ evt. ZZS) meegeven
    el("AardSamenstelling", p.aardSamenstelling),
  ].join(""));
}

function declaratie() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n';
}

// --- Berichttypes ---

function bouwOntvangstmelding(payload, soort) {
  const binnen = [
    verwerkerBlok(payload.verwerker),
    periodeBlok(payload.periode),
    ontdoenerBlok(payload.ontdoener),
    afvalBlok(payload),
    vervoerderBlok(payload.vervoerder),
    el("HoeveelheidKg", Math.round(payload.hoeveelheidKg || 0)),
    el("AantalVrachten", payload.aantalVrachten || 0),
  ].join("");
  const melding = wrap(TAGS.ontvangst, binnen, { soort });
  return declaratie() + wrap(TAGS.envelope, melding, { xmlns: NAMESPACE });
}

function bouwNulmelding(payload) {
  const binnen = [
    verwerkerBlok(payload.verwerker),
    periodeBlok(payload.periode),
    el("Afvalstroomnummer", payload.asn),
    el("HoeveelheidKg", 0),
    el("AantalVrachten", 0),
  ].join("");
  const melding = wrap(TAGS.nul, binnen);
  return declaratie() + wrap(TAGS.envelope, melding, { xmlns: NAMESPACE });
}

function bouwAfgiftemelding(payload) {
  const binnen = [
    verwerkerBlok(payload.verwerker),
    periodeBlok(payload.periode),
    wrap("Afnemer", [
      el("Naam", payload.afnemer?.naam),
      el("Kvk", payload.afnemer?.kvk),
      el("Bedrijfsnummer", payload.afnemer?.bedrijfsnummer),
    ].join("")),
    afvalBlok(payload),
    // Bij einde-afval kan i.p.v. EURAL een GN/CN-code gelden
    el("GnCnCode", payload.gnCnCode),
    vervoerderBlok(payload.vervoerder),
    el("HoeveelheidKg", Math.round(payload.hoeveelheidKg || 0)),
    el("AantalAfgiften", payload.aantalAfgiften || 0),
  ].join("");
  const melding = wrap(TAGS.afgifte, binnen);
  return declaratie() + wrap(TAGS.envelope, melding, { xmlns: NAMESPACE });
}

// Hoofdingang: kies bericht op basis van type.
function bouwMelding(type, payload) {
  switch (type) {
    case "eerste_ontvangst":
      return bouwOntvangstmelding(payload, "eerste");
    case "maandelijkse_ontvangst":
      return bouwOntvangstmelding(payload, "maandelijks");
    case "nulmelding":
      return bouwNulmelding(payload);
    case "afgifte":
      return bouwAfgiftemelding(payload);
    default:
      throw new Error("Onbekend meldingtype: " + type);
  }
}

module.exports = {
  TAGS,
  NAMESPACE,
  escapeXml,
  bouwMelding,
  bouwOntvangstmelding,
  bouwNulmelding,
  bouwAfgiftemelding,
};
