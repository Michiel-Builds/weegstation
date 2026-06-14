const TEKENS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function genereerWeegserverSleutel(lengte = 32) {
  const buf = new Uint8Array(lengte);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => TEKENS[b % TEKENS.length]).join("");
}
