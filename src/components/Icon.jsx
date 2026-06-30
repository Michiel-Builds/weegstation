/**
 * Lichtgewicht line-iconenset (geen externe dependency).
 * Inline SVG's met stroke="currentColor" zodat ze de kleur en grootte
 * van de omliggende tekst overnemen. Vervangt de oude emoji-iconen.
 *
 * Gebruik: <Icon name="dashboard" /> of <Icon name="truck" size={32} />
 */

const PADEN = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </>
  ),
  scale: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="6" y1="6" x2="18" y2="6" />
      <path d="M6 6L3 13a3 3 0 006 0L6 6z" />
      <path d="M18 6l-3 7a3 3 0 006 0l-3-7z" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </>
  ),
  weeg: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="6" y1="6" x2="18" y2="6" />
      <path d="M6 6L3 13a3 3 0 006 0L6 6z" />
      <path d="M18 6l-3 7a3 3 0 006 0l-3-7z" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
  lijst: (
    <>
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <line x1="4" y1="6" x2="4" y2="6" />
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="4" y1="18" x2="4" y2="18" />
    </>
  ),
  euro: (
    <>
      <path d="M17 6.5A6 6 0 008 9m0 6a6 6 0 009 2.5" />
      <line x1="4" y1="10" x2="12" y2="10" />
      <line x1="4" y1="14" x2="11" y2="14" />
    </>
  ),
  instellingen: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  rapport: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="11" width="3" height="7" rx="0.5" />
      <rect x="11" y="7" width="3" height="11" rx="0.5" />
      <rect x="16" y="13" width="3" height="5" rx="0.5" />
    </>
  ),
  import: (
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  formulieren: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 01-1 1h-4a1 1 0 01-1-1V4z" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </>
  ),
  truck: (
    <>
      <rect x="1" y="6" width="13" height="10" rx="1" />
      <path d="M14 9h4l3 3v4h-7V9z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  uitloggen: (
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  gebouw: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <line x1="9" y1="7" x2="10" y2="7" />
      <line x1="14" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="10" y2="11" />
      <line x1="14" y1="11" x2="15" y2="11" />
      <line x1="10" y1="21" x2="10" y2="17" />
      <line x1="14" y1="21" x2="14" y2="17" />
    </>
  ),
  persoon: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  personen: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21a6 6 0 0112 0" />
      <path d="M16 5.5a3.5 3.5 0 010 6.8" />
      <path d="M17 14.5a6 6 0 014 6" />
    </>
  ),
  zoek: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </>
  ),
  chevronOnder: <polyline points="6 9 12 15 18 9" />,
  chevronRechts: <polyline points="9 6 15 12 9 18" />,
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  opslaan: (
    <>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  bewerk: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
};

export default function Icon({ name, size = 18, className = "", strokeWidth = 2, style }) {
  const paden = PADEN[name];
  if (!paden) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paden}
    </svg>
  );
}
