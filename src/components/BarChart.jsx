import { MATERIALEN } from "../data/stamdata";

export default function BarChart({ wegingen, prijzen, periode }) {
  const totals = {};
  MATERIALEN.forEach(m => {
    totals[m.id] = { kg: 0, omzet: 0, naam: m.naam, kleur: m.kleur };
  });
  wegingen.forEach(w => {
    if (!totals[w.materiaal.id]) return;
    totals[w.materiaal.id].kg    += w.gewicht;
    totals[w.materiaal.id].omzet += w.gewicht * parseFloat(prijzen[w.materiaal.id] || 0);
  });
  const items    = Object.values(totals);
  const maxKg    = Math.max(...items.map(i => i.kg), 1);
  const maxOmzet = Math.max(...items.map(i => i.omzet), 1);

  return (
    <div className="bar-chart">
      {items.map(item => {
        const val = periode === "omzet" ? item.omzet : item.kg;
        const max = periode === "omzet" ? maxOmzet : maxKg;
        const pct = Math.round((val / max) * 100);
        const label = periode === "omzet"
          ? `€ ${item.omzet.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`
          : `${item.kg.toLocaleString("nl-NL")} kg`;
        return (
          <div key={item.naam} className="bar-row">
            <span className="bar-label">{item.naam}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: item.kleur }}>
                {pct > 20 ? label : ""}
              </div>
            </div>
            <span className="bar-val">{pct <= 20 ? label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
