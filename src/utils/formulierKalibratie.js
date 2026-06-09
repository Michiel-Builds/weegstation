const STORAGE_KEY = "newton-formulier-kalibratie";

const DEFAULTS = {
  begeleidingsbrief: { offsetBoven: 10, offsetLinks: 0, fontSize: 10, bondingRand: true },
  cmr:               { offsetBoven: 8,  offsetLinks: 0, fontSize: 9,  bondingRand: true },
  annex7:            { offsetBoven: 8,  offsetLinks: 0, fontSize: 9,  bondingRand: true },
};

export function laadKalibratie(formType) {
  if (typeof window === "undefined") return { ...DEFAULTS[formType] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      if (all[formType]) return { ...DEFAULTS[formType], ...all[formType] };
    }
  } catch (e) {}
  return { ...DEFAULTS[formType] };
}

export function bewaarKalibratie(formType, instellingen) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[formType] = instellingen;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {}
}

export function laadAlleKalibratie() {
  return {
    begeleidingsbrief: laadKalibratie("begeleidingsbrief"),
    cmr: laadKalibratie("cmr"),
    annex7: laadKalibratie("annex7"),
  };
}
