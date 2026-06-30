// =============================================
// MELDPLICHT-BEPALING (LMA)
// Bepaalt of een weging gemeld moet worden bij het LMA/AMICE.
// Regels (afgestemd met gebruiker):
//   - Particulier  -> nooit meldplichtig (wij halen niet op bij particulieren
//                     en ontvangst van particulieren valt buiten de meldplicht)
//   - <= 50 kg     -> vrijgesteld (kleine hoeveelheid)
//   - Zakelijk     -> meldplichtig
// =============================================

export const MELDPLICHT_DREMPEL_KG = 50;

export function bepaalMeldplicht({ klantType, gewichtKg } = {}) {
  const gewicht = Number(gewichtKg) || 0;

  if (klantType !== "zakelijk") {
    return { meldplichtig: false, reden: "Particulier - geen meldplicht" };
  }
  if (gewicht <= MELDPLICHT_DREMPEL_KG) {
    return {
      meldplichtig: false,
      reden: `Kleine hoeveelheid (<= ${MELDPLICHT_DREMPEL_KG} kg)`,
    };
  }
  return { meldplichtig: true, reden: "Zakelijke ontvangst - meldplichtig" };
}
