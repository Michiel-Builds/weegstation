/** Lege standaard partij — vul aan via formulieren of instellingen. */
export function maakStandaardPartij(bedrijfsnaam = "") {
  return {
    naam: bedrijfsnaam,
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
