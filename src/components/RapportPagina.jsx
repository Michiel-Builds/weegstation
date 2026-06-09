import { useState } from "react";
import BarChart from "./BarChart";
import { berekenRapportPerMateriaal } from "../utils/wegingen";
import { berekenRapportPerPeriode } from "../utils/rapport";
import { maakTestWegingen } from "../utils/testWegingen";
import { laadOpbrengstDagSnapshots } from "../utils/opbrengstDag";

function fmtKg(n) {
  return `${Number(n).toLocaleString("nl-NL")} kg`;
}

function fmtEuro(n) {
  return `€ ${Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function NettoCel({ waarde, eenheid = "kg" }) {
  const isNeg = waarde < 0;
  const tekst = eenheid === "kg" ? fmtKg(waarde) : fmtEuro(waarde);
  return (
    <td className="mono" style={{ fontWeight: 700, color: isNeg ? "var(--red)" : "var(--accent2)" }}>
      {tekst}
    </td>
  );
}

function PeriodeTabel({ rijen }) {
  if (rijen.length === 0) {
    return (
      <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
        Geen wegingen in deze periode.
      </div>
    );
  }
  return (
    <table style={{ marginTop: 8, minWidth: 900 }}>
      <thead>
        <tr>
          <th>Periode</th>
          <th>Materiaal</th>
          <th>↓ Inkomend</th>
          <th>↑ Uitgaand</th>
          <th>Netto kg</th>
          <th>↓ Inkomend €</th>
          <th>↑ Uitgaand €</th>
          <th>Netto €</th>
        </tr>
      </thead>
      <tbody>
        {rijen.map(r => (
          <tr key={`${r.periode}-${r.materiaalId}`}>
            <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{r.periodeLabel}</td>
            <td><span className={`tag ${r.tag}`}>{r.naam}</span></td>
            <td className="mono richting-inkomend">{fmtKg(r.kgInkomend)}</td>
            <td className="mono richting-uitgaand">{fmtKg(r.kgUitgaand)}</td>
            <NettoCel waarde={r.kg} eenheid="kg" />
            <td className="mono richting-inkomend">{fmtEuro(r.omzetInkomend)}</td>
            <td className="mono richting-uitgaand">{fmtEuro(r.omzetUitgaand)}</td>
            <NettoCel waarde={r.omzet} eenheid="euro" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TestBanner({ opEchteData, onToggle }) {
  return (
    <div className="rapport-test-banner">
      <span>
        {opEchteData
          ? "Testvoorbeeld — fictieve wegingen ter demonstratie"
          : "Nog geen echte wegingen — testvoorbeeld wordt getoond"}
      </span>
      <button type="button" className="rapport-test-btn" onClick={onToggle}>
        {opEchteData ? "Echte data tonen" : "Test verbergen"}
      </button>
    </div>
  );
}

export default function RapportPagina({ wegingen, materialen }) {
  const [rapTab, setRapTab] = useState("kg");
  const [periodeTab, setPeriodeTab] = useState("dag");
  const [toonTest, setToonTest] = useState(() => wegingen.length === 0);

  const heeftEchteData = wegingen.length > 0;
  const testWegingen = maakTestWegingen(materialen);
  const actief = toonTest ? testWegingen : wegingen;
  const dagSnapshots = toonTest ? {} : laadOpbrengstDagSnapshots();

  const rapportTotaal = berekenRapportPerMateriaal(actief, materialen, dagSnapshots);
  const rapportPeriode = berekenRapportPerPeriode(actief, materialen, periodeTab, dagSnapshots);

  if (!toonTest && !heeftEchteData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Rapportage</span>
        </div>
        <div className="rapport-leeg">
          <p>Nog geen wegingen. Registreer wegingen via Wegen met inkomend of uitgaand.</p>
          <button type="button" className="rapport-test-btn primair" onClick={() => setToonTest(true)}>
            Testvoorbeeld tonen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {toonTest && (
        <TestBanner
          opEchteData={heeftEchteData}
          onToggle={() => setToonTest(false)}
        />
      )}
      {!toonTest && heeftEchteData && (
        <div className="rapport-test-toggle">
          <button type="button" className="rapport-test-btn" onClick={() => setToonTest(true)}>
            Testvoorbeeld tonen
          </button>
        </div>
      )}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">Totaal per materiaal</span>
          <span className="badge">
            {toonTest ? "TEST" : `${actief.length} weging(en)`}
          </span>
        </div>
        <p className="rapport-hint">Netto = inkomend − uitgaand · omzet uit opbrengstprijzen van die dag</p>
        <div className="rapport-tabs">
          <button className={`rtab${rapTab === "kg" ? " active" : ""}`} onClick={() => setRapTab("kg")}>Gewicht (kg)</button>
          <button className={`rtab${rapTab === "omzet" ? " active" : ""}`} onClick={() => setRapTab("omzet")}>Waarde (€)</button>
        </div>
        <BarChart items={rapportTotaal} periode={rapTab} />
        <div className="rapport-tabel-wrap">
          <table className="rapport-tabel">
            <thead>
              <tr>
                <th>Materiaal</th>
                <th>↓ Inkomend</th>
                <th>↑ Uitgaand</th>
                <th>Netto kg</th>
                <th>↓ Inkomend €</th>
                <th>↑ Uitgaand €</th>
                <th>Netto €</th>
              </tr>
            </thead>
            <tbody>
              {rapportTotaal.filter(r => r.regels > 0).map(r => (
                <tr key={r.id}>
                  <td><span className={`tag ${r.tag}`}>{r.naam}</span></td>
                  <td className="mono richting-inkomend">{fmtKg(r.kgInkomend)}</td>
                  <td className="mono richting-uitgaand">{fmtKg(r.kgUitgaand)}</td>
                  <NettoCel waarde={r.kg} eenheid="kg" />
                  <td className="mono richting-inkomend">{fmtEuro(r.omzetInkomend)}</td>
                  <td className="mono richting-uitgaand">{fmtEuro(r.omzetUitgaand)}</td>
                  <NettoCel waarde={r.omzet} eenheid="euro" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Per periode per materiaal</span>
        </div>
        <p className="rapport-hint">Gewicht en omzet per dag, week, maand of jaar (opbrengstprijs vast per dag)</p>
        <div className="rapport-tabs">
          <button className={`rtab${periodeTab === "dag" ? " active" : ""}`} onClick={() => setPeriodeTab("dag")}>Dag</button>
          <button className={`rtab${periodeTab === "week" ? " active" : ""}`} onClick={() => setPeriodeTab("week")}>Week</button>
          <button className={`rtab${periodeTab === "maand" ? " active" : ""}`} onClick={() => setPeriodeTab("maand")}>Maand</button>
          <button className={`rtab${periodeTab === "jaar" ? " active" : ""}`} onClick={() => setPeriodeTab("jaar")}>Jaar</button>
        </div>
        <div className="rapport-tabel-wrap">
          <PeriodeTabel rijen={rapportPeriode} />
        </div>
      </div>
    </>
  );
}
