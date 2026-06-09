import { berekenOmzetWeging } from "./opbrengstDag";

const MAAND_NAMEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function maakLegeBucket() {
  return {
    kgInkomend: 0,
    kgUitgaand: 0,
    omzetInkomend: 0,
    omzetUitgaand: 0,
    regels: 0,
    kg: 0,
    omzet: 0,
  };
}

function voegToeAanBucket(bucket, kg, omzet, uitgaand) {
  if (uitgaand) {
    bucket.kgUitgaand += kg;
    bucket.omzetUitgaand += omzet;
  } else {
    bucket.kgInkomend += kg;
    bucket.omzetInkomend += omzet;
  }
  bucket.regels += 1;
  bucket.kg = bucket.kgInkomend - bucket.kgUitgaand;
  bucket.omzet = bucket.omzetInkomend - bucket.omzetUitgaand;
}

export function parseWegingDatum(w) {
  if (w.datum && /^\d{1,2}-\d{1,2}-\d{4}$/.test(w.datum)) {
    const [d, m, y] = w.datum.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const ts = Number(w.id);
  if (!isNaN(ts) && ts > 1e12) return new Date(ts);
  return new Date();
}

function isoWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function periodeKey(date, type) {
  const dag = date.toLocaleDateString("nl-NL");
  const jaar = String(date.getFullYear());
  const maand = `${jaar}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const week = isoWeekKey(date);
  if (type === "dag") return dag;
  if (type === "week") return week;
  if (type === "maand") return maand;
  return jaar;
}

function periodeSortWaarde(date, type) {
  if (type === "dag") return date.getTime();
  if (type === "week") {
    const [y, w] = isoWeekKey(date).split("-W").map(Number);
    return y * 100 + w;
  }
  if (type === "maand") return date.getFullYear() * 100 + (date.getMonth() + 1);
  return date.getFullYear();
}

export function formatPeriodeLabel(type, key) {
  if (type === "dag") return key;
  if (type === "jaar") return key;
  if (type === "week") {
    const [y, w] = key.split("-W");
    return `Week ${Number(w)}, ${y}`;
  }
  if (type === "maand") {
    const [y, m] = key.split("-");
    return `${MAAND_NAMEN[Number(m) - 1]} ${y}`;
  }
  return key;
}

export function berekenRapportPerPeriode(wegingen, materialen, periodeType, dagSnapshots = {}) {
  const map = {};

  wegingen.forEach(w => {
    const matId = w.materiaal?.id;
    if (!matId) return;
    const mat = materialen.find(m => m.id === matId);
    if (!mat) return;

    const date = parseWegingDatum(w);
    const periode = periodeKey(date, periodeType);
    const bucketKey = `${periode}|${matId}`;

    if (!map[bucketKey]) {
      map[bucketKey] = {
        periode,
        periodeLabel: formatPeriodeLabel(periodeType, periode),
        periodeSort: periodeSortWaarde(date, periodeType),
        materiaalId: matId,
        naam: mat.naam,
        tag: mat.tag,
        kleur: mat.kleur,
        ...maakLegeBucket(),
      };
    }

    const kg = parseFloat(w.netto ?? w.gewicht) || 0;
    const omzet = berekenOmzetWeging(w, dagSnapshots);
    voegToeAanBucket(map[bucketKey], kg, omzet, w.richting === "uitgaand");
  });

  return Object.values(map).sort((a, b) => {
    if (b.periodeSort !== a.periodeSort) return b.periodeSort - a.periodeSort;
    return a.naam.localeCompare(b.naam, "nl");
  });
}
