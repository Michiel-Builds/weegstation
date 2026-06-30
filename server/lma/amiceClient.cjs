// =============================================
// AMICE webservice-client (mTLS)
// Verstuurt meldingen via de AMICE XML-Meldinterface met een client-certificaat
// (.pfx/.p12) + root CA. Draait in het Electron main-proces (Node), NIET in de
// browser, omdat client-certificaten daar niet beschikbaar zijn.
//
// LET OP: de exacte endpoints, SOAPAction-headers en envelope-structuur komen
// uit de WSDL + spec v3.3 (beschikbaar met BTO-account). Ze staan hier centraal
// in ENDPOINTS / buildSoap zodat ze eenvoudig aan te passen zijn.
// =============================================

const https = require("https");
const fs = require("fs");
const { URL } = require("url");

// Endpoints per omgeving (TODO: bevestigen uit WSDL).
const ENDPOINTS = {
  bto: {
    melden: "https://bto.amice.lma.nl/services/Melden",
    status: "https://bto.amice.lma.nl/services/Status",
    toetsen: "https://bto.amice.lma.nl/services/ToetsenAfvalstroomnummer",
  },
  productie: {
    melden: "https://amice.lma.nl/services/Melden",
    status: "https://amice.lma.nl/services/Status",
    toetsen: "https://amice.lma.nl/services/ToetsenAfvalstroomnummer",
  },
};

function leesCertificaat(certConfig = {}) {
  const opties = {};
  if (certConfig.pfxPad && fs.existsSync(certConfig.pfxPad)) {
    opties.pfx = fs.readFileSync(certConfig.pfxPad);
    if (certConfig.wachtwoord) opties.passphrase = certConfig.wachtwoord;
  }
  if (certConfig.caPad && fs.existsSync(certConfig.caPad)) {
    opties.ca = fs.readFileSync(certConfig.caPad);
  }
  return opties;
}

// Verpak XML-bericht in een SOAP-envelope (placeholder-structuur).
function buildSoap(innerXml, soapAction) {
  // Verwijder XML-declaratie uit inner (mag niet binnen envelope staan)
  const inner = String(innerXml).replace(/^<\?xml[^>]*\?>\s*/i, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${inner}
  </soap:Body>
</soap:Envelope>`;
}

function postXml(endpoint, body, certConfig, soapAction) {
  return new Promise((resolve) => {
    let url;
    try { url = new URL(endpoint); }
    catch (e) { return resolve({ ok: false, fout: "Ongeldig endpoint: " + endpoint }); }

    const certOpties = leesCertificaat(certConfig);
    if (!certOpties.pfx) {
      return resolve({ ok: false, fout: "Geen client-certificaat (.pfx) geconfigureerd" });
    }

    const data = Buffer.from(body, "utf-8");
    const opties = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": data.length,
        ...(soapAction ? { SOAPAction: soapAction } : {}),
      },
      ...certOpties,
    };

    const req = https.request(opties, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        resolve({ ok, status: res.statusCode, body: chunks });
      });
    });
    req.on("error", (err) => resolve({ ok: false, fout: err.message }));
    req.write(data);
    req.end();
  });
}

function getEndpoints(omgeving) {
  return ENDPOINTS[omgeving === "productie" ? "productie" : "bto"];
}

async function verzendMelding({ xml, omgeving, certConfig }) {
  const eps = getEndpoints(omgeving);
  const soap = buildSoap(xml, "Melden");
  const res = await postXml(eps.melden, soap, certConfig, "Melden");
  return { ...res, verzondenXml: soap, omgeving };
}

async function opvraagStatus({ kenmerk, omgeving, certConfig }) {
  const eps = getEndpoints(omgeving);
  const inner = `<StatusOpvragen><Kenmerk>${kenmerk || ""}</Kenmerk></StatusOpvragen>`;
  const soap = buildSoap(inner, "Status");
  return postXml(eps.status, soap, certConfig, "Status");
}

async function toetsAfvalstroomnummer({ asn, omgeving, certConfig }) {
  const eps = getEndpoints(omgeving);
  const inner = `<ToetsAfvalstroomnummer><Afvalstroomnummer>${asn || ""}</Afvalstroomnummer></ToetsAfvalstroomnummer>`;
  const soap = buildSoap(inner, "Toetsen");
  return postXml(eps.toetsen, soap, certConfig, "Toetsen");
}

// Lees vervaldatum/onderwerp uit een .pfx (best effort, zonder wachtwoord-check).
function certInfo(certConfig = {}) {
  try {
    if (!certConfig.pfxPad || !fs.existsSync(certConfig.pfxPad)) {
      return { aanwezig: false };
    }
    const stat = fs.statSync(certConfig.pfxPad);
    return { aanwezig: true, pad: certConfig.pfxPad, grootte: stat.size };
  } catch (e) {
    return { aanwezig: false, fout: e.message };
  }
}

module.exports = {
  ENDPOINTS,
  verzendMelding,
  opvraagStatus,
  toetsAfvalstroomnummer,
  certInfo,
  buildSoap,
};
