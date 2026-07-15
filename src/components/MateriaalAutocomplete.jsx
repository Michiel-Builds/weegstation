import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MATERIALEN } from "../data/stamdata";

export default function MateriaalAutocomplete({
  value, onChange, onSelect, placeholder = "bijv. Koper", modus = "particulier",
}) {
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [positie, setPositie] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  const lijst = filtering && value.trim()
    ? MATERIALEN.filter(m => m.naam.toLowerCase().includes(value.toLowerCase()))
    : MATERIALEN;

  function updatePositie() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPositie({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 160),
    });
  }

  function openDropdown() {
    updatePositie();
    setFiltering(false);
    setOpen(true);
    const idx = MATERIALEN.findIndex(m => m.naam.toLowerCase() === value.trim().toLowerCase());
    setHighlight(idx >= 0 ? idx : 0);
  }

  useEffect(() => {
    function handleClick(e) {
      if (ref.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
      setFiltering(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePositie();
    window.addEventListener("scroll", updatePositie, true);
    window.addEventListener("resize", updatePositie);
    return () => {
      window.removeEventListener("scroll", updatePositie, true);
      window.removeEventListener("resize", updatePositie);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open || !filtering) return;
    setHighlight(0);
  }, [value, open, filtering]);

  function kiesMateriaal(m) {
    onSelect(m);
    setOpen(false);
    setFiltering(false);
    setHighlight(0);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openDropdown();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, lijst.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && lijst[highlight]) {
      e.preventDefault();
      kiesMateriaal(lijst[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setFiltering(false);
    }
  }

  const dropdown = open && lijst.length > 0 && createPortal(
    <div
      ref={dropdownRef}
      className="klant-autocomplete-dropdown-kl materiaal-autocomplete-dropdown"
      style={{
        position: "fixed",
        top: positie.top,
        left: positie.left,
        width: positie.width,
        zIndex: 10000,
      }}
    >
      {lijst.map((m, i) => (
        <div
          key={m.id}
          className={"klant-autocomplete-item-kl" + (i === highlight ? " highlight" : "")}
          onMouseDown={e => { e.preventDefault(); kiesMateriaal(m); }}
          onMouseEnter={() => setHighlight(i)}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: m.kleur,
            display: "inline-block", marginRight: 8, verticalAlign: "middle",
          }} />
          {m.naam}
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        style={{
          width: "100%", background: "transparent", border: "1px solid transparent",
          color: "var(--text)", fontFamily: "var(--sans)", fontSize: 13,
          padding: "6px 8px", borderRadius: 4, outline: "none", textAlign: "left",
        }}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          setFiltering(true);
          setOpen(true);
          updatePositie();
          onChange(e.target.value);
        }}
        onMouseDown={e => {
          e.stopPropagation();
          openDropdown();
        }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}
