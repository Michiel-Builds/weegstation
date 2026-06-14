const WACHTWOORD_SALT = "weegstation-v1:";

export async function hashWachtwoord(wachtwoord) {
  const data = new TextEncoder().encode(WACHTWOORD_SALT + wachtwoord);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function controleerWachtwoord(wachtwoord, wachtwoordHash) {
  if (!wachtwoord || !wachtwoordHash) return false;
  return (await hashWachtwoord(wachtwoord)) === wachtwoordHash;
}
