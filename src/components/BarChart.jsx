export default function BarChart({ items, periode }) {
  const waarden = items.map(i => (periode === "omzet" ? i.omzet : i.kg));
  const max = Math.max(...waarden.map(v => Math.abs(v)), 1);

  return (
    <div className="bar-chart">
      {items.map(item => {
        const val = periode === "omzet" ? item.omzet : item.kg;
        if (val === 0) return null;
        const pct = Math.round((Math.abs(val) / max) * 100);
        const isNeg = val < 0;
        const label = periode === "omzet"
          ? `${isNeg ? "−" : ""}€ ${Math.abs(val).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`
          : `${isNeg ? "−" : ""}${Math.abs(val).toLocaleString("nl-NL")} kg`;
        const kleur = isNeg ? "var(--red)" : item.kleur;
        return (
          <div key={item.naam} className="bar-row">
            <span className="bar-label">{item.naam}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: kleur }}>
                {pct > 20 ? label : ""}
              </div>
            </div>
            <span className="bar-val" style={{ color: isNeg ? "var(--red)" : undefined }}>{pct <= 20 ? label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
