import { INIT_PRIJZEN, INIT_OPBRENGST } from "../data/stamdata";

function dagenGeleden(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function maakWeging(id, datum, mat, kg, richting, klant = "Test Klant") {
  const prijs = parseFloat(INIT_PRIJZEN[mat.id] || 0);
  const opbrengstPrijs = parseFloat(INIT_OPBRENGST[mat.id] || 0);
  return {
    id,
    bonnummer: `TEST-${id}`,
    kenteken: "XX-123-XX",
    klantNaam: klant,
    materiaal: { id: mat.id, naam: mat.naam, kleur: mat.kleur, tag: mat.tag },
    gewicht: kg,
    netto: kg,
    prijs,
    totaal: Math.round(kg * prijs * 100) / 100,
    opbrengstPrijs,
    opbrengstOmzet: Math.round(kg * opbrengstPrijs * 100) / 100,
    tijd: "10:30:00",
    datum: datum.toLocaleDateString("nl-NL"),
    bron: "test",
    richting,
    isNieuw: false,
  };
}

function mat(materialen, id) {
  return materialen.find(m => m.id === id);
}

/** Fictieve wegingen over meerdere dagen, weken, maanden en jaren. */
export function maakTestWegingen(materialen) {
  const m = (id) => mat(materialen, id);
  return [
    maakWeging(900001, dagenGeleden(0), m(1), 450, "inkomend", "Jan de Vries"),
    maakWeging(900002, dagenGeleden(0), m(2), 120, "uitgaand", "Metaalhandel Noord"),
    maakWeging(900003, dagenGeleden(0), m(11), 85, "inkomend", "Sloopbedrijf Bakker"),
    maakWeging(900004, dagenGeleden(1), m(3), 820, "inkomend", "Constructie BV"),
    maakWeging(900005, dagenGeleden(1), m(1), 210, "uitgaand", "Export GmbH"),
    maakWeging(900006, dagenGeleden(3), m(4), 340, "inkomend", "Jan de Vries"),
    maakWeging(900007, dagenGeleden(3), m(2), 95, "inkomend", "Garage Peeters"),
    maakWeging(900008, dagenGeleden(10), m(5), 560, "inkomend", "RVS Recycling"),
    maakWeging(900009, dagenGeleden(10), m(3), 180, "uitgaand", "Staalhandel Zuid"),
    maakWeging(900010, dagenGeleden(35), m(11), 920, "inkomend", "Kabelgroep NL"),
    maakWeging(900011, dagenGeleden(35), m(3), 240, "uitgaand", "Constructie BV"),
    maakWeging(900012, dagenGeleden(35), m(8), 150, "inkomend", "Brons & Co"),
    maakWeging(900013, dagenGeleden(95), m(1), 680, "inkomend", "Koper Import"),
    maakWeging(900014, dagenGeleden(95), m(6), 310, "inkomend", "Zinkwerken"),
    maakWeging(900015, dagenGeleden(400), m(1), 1200, "inkomend", "Archief 2024"),
    maakWeging(900016, dagenGeleden(400), m(2), 450, "uitgaand", "Export 2024"),
  ].filter(w => w.materiaal);
}
