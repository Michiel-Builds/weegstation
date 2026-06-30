// euralCode + gevaarlijk zijn DEFAULT-suggesties per materiaal; de definitieve
// EURAL-code wordt per afvalstroom (ASN) vastgelegd en kan per herkomst verschillen.
// verwerkingsmethode moet uit de officiele AMICE-codelijst komen (juridisch) en
// wordt bewust leeg gelaten tot die per stroom/inrichting is vastgesteld.
export const MATERIALEN = [
  { id: 1,  naam: "Koper",          kleur: "#4caf7d", tag: "tag-koper",          euralCode: "17 04 01", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 2,  naam: "Aluminium",      kleur: "#7ab4f5", tag: "tag-aluminium",      euralCode: "17 04 02", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 3,  naam: "Staal",          kleur: "#c49a6c", tag: "tag-staal",          euralCode: "17 04 05", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 4,  naam: "Messing",        kleur: "#d4b84a", tag: "tag-messing",        euralCode: "17 04 01", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 5,  naam: "RVS",            kleur: "#4acfcf", tag: "tag-rvs",            euralCode: "17 04 05", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 6,  naam: "Zink",           kleur: "#9eafc4", tag: "tag-zink",           euralCode: "17 04 04", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 7,  naam: "Lood",           kleur: "#6b7c8a", tag: "tag-lood",           euralCode: "17 04 03", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 8,  naam: "Brons",          kleur: "#b87333", tag: "tag-brons",          euralCode: "17 04 01", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 10, naam: "Gietijzer",      kleur: "#5c5c5c", tag: "tag-gietijzer",      euralCode: "17 04 05", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 11, naam: "Kabel",          kleur: "#e67e22", tag: "tag-kabel",          euralCode: "17 04 11", gevaarlijk: false, verwerkingsmethode: "" },
  { id: 13, naam: "Accu's",         kleur: "#66bb6a", tag: "tag-accus",          euralCode: "16 06 01*", gevaarlijk: true, verwerkingsmethode: "" },
  { id: 14, naam: "Elektronica",    kleur: "#b07cc6", tag: "tag-elektronica",    euralCode: "16 02 13*", gevaarlijk: true, verwerkingsmethode: "" },
  { id: 15, naam: "Tin",            kleur: "#a8b8c8", tag: "tag-tin",            euralCode: "17 04 06", gevaarlijk: false, verwerkingsmethode: "" },
];

// Een EURAL-code is "gevaarlijk" als hij een sterretje bevat.
export function isGevaarlijkeEural(euralCode) {
  return typeof euralCode === "string" && euralCode.includes("*");
}

export const INIT_PRIJZEN = {
  1: "6.40",  2: "1.85",  3: "0.35",  4: "4.20",  5: "1.10",
  6: "1.20",  7: "1.50",  8: "5.50", 10: "0.25",
  11: "5.80", 13: "0.80", 14: "0.50", 15: "8.20",
};

export const OPBRENGST_KORTING = 0.10;

export const INIT_OPBRENGST = Object.fromEntries(
  Object.entries(INIT_PRIJZEN).map(([id, prijs]) => [
    id,
    (parseFloat(prijs) / (1 - OPBRENGST_KORTING)).toFixed(2),
  ])
);
