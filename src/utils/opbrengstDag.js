import { opbrengstVanInkoop } from "./prijzen";

export const OPBRENGST_DAG_LS_KEY = "newton-opbrengst-dag";

export function vandaagDatumKey(datum = new Date()) {
  return datum.toLocaleDateString("nl-NL");
}

export function laadOpbrengstDagSnapshots() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OPBRENGST_DAG_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
}

export function bewaarOpbrengstDagSnapshots(snapshots) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OPBRENGST_DAG_LS_KEY, JSON.stringify(snapshots));
  } catch {}
}

/** Legt opbrengstprijzen vast voor één dag (overschrijft alleen die dag). */
export function vastlegOpbrengstVoorDag(datumKey, opbrengst) {
  const snapshots = laadOpbrengstDagSnapshots();
  snapshots[datumKey] = { ...opbrengst };
  bewaarOpbrengstDagSnapshots(snapshots);
  return snapshots;
}

/** Maakt een snapshot voor een dag als die nog niet bestaat. */
export function zorgVoorDagSnapshot(datumKey, opbrengst) {
  const snapshots = laadOpbrengstDagSnapshots();
  if (!snapshots[datumKey]) {
    snapshots[datumKey] = { ...opbrengst };
    bewaarOpbrengstDagSnapshots(snapshots);
  }
  return snapshots;
}

export function getOpbrengstPrijsVoorDatum(datumKey, materiaalId, snapshots) {
  const dag = snapshots[datumKey];
  if (dag && dag[materiaalId] !== undefined && dag[materiaalId] !== "") {
    return parseFloat(dag[materiaalId]) || 0;
  }
  return null;
}

/** Omzet uit opbrengstprijs van de wegingsdag; valt terug op vastgelegde weging-prijs. */
export function berekenOmzetWeging(w, snapshots) {
  const kg = parseFloat(w.netto ?? w.gewicht) || 0;
  if (!kg) return 0;

  const matId = w.materiaal?.id;
  const datumKey = w.datum || vandaagDatumKey();

  if (matId && snapshots) {
    const opbrengstPrijs = getOpbrengstPrijsVoorDatum(datumKey, matId, snapshots);
    if (opbrengstPrijs !== null) {
      return Math.round(kg * opbrengstPrijs * 100) / 100;
    }
  }

  if (w.opbrengstOmzet !== undefined && w.opbrengstOmzet !== null) {
    return parseFloat(w.opbrengstOmzet) || 0;
  }

  if (w.opbrengstPrijs !== undefined) {
    return Math.round(kg * (parseFloat(w.opbrengstPrijs) || 0) * 100) / 100;
  }

  const inkoop = parseFloat(w.prijs || 0);
  if (inkoop) {
    const opbrengst = parseFloat(opbrengstVanInkoop(String(inkoop))) || 0;
    return Math.round(kg * opbrengst * 100) / 100;
  }

  return 0;
}
