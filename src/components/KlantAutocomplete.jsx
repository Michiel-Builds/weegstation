import { useState, useEffect, useRef } from "react";

export default function KlantAutocomplete({
  klanten, value, onChange, onSelect,
  placeholder = "Klantnaam...", alleenZakelijk = false, alleenParticulier = false
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [positie, setPositie] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  const gefilterd = klanten.filter(k => {
    if (alleenZakelijk && k.type !== "zakelijk") return false;
    if (alleenParticulier && k.type !== "particulier") return false;
    if (!value) return true;
    const q = value.toLowerCase();
    return k.naam.toLowerCase().includes(q) ||
           (k.plaats || "").toLowerCase().includes(q) ||
           (k.kvk || "").toLowerCase().includes(q);
  }).slice(0, 8);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPositie({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open, value]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, gefilterd.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && gefilterd[highlight]) {
      e.preventDefault();
      kiesKlant(gefilterd[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function kiesKlant(k) {
    onSelect && onSelect(k);
    setOpen(false);
    setHighlight(0);
  }

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <input
          className="weeg-veld-input"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      {open && gefilterd.length > 0 && (
        <div
          ref={dropdownRef}
          className="klant-autocomplete-dropdown-kl"
          style={{
            position: "absolute",
            top: positie.top,
            left: positie.left,
            width: positie.width,
            zIndex: 1000
          }}
        >
          {gefilterd.map((k, i) => (
            <div
              key={k.id}
              className={"klant-autocomplete-item-kl" + (i === highlight ? " highlight" : "")}
              onClick={() => kiesKlant(k)}
              onMouseEnter={() => setHighlight(i)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12 }}>{k.type === "zakelijk" ? "🏢" : "👤"}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{k.naam}</span>
              </div>
              {k.plaats && (
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, paddingLeft: 22, fontFamily: "var(--mono)" }}>
                  {k.plaats}{k.kvk ? ` · KvK ${k.kvk}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
