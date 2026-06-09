// Dummy weegserver voor Bulters Weegsysteem
// Draait op ws://localhost:3000

const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3000, host: "0.0.0.0" });

console.log("🌐 Bulters Weegsysteem weegserver gestart op ws://localhost:3000");

const MATERIAAL = [
  { id: 1, naam: "Koper",     kleur: "#4caf7d", tag: "tag-kop" },
  { id: 2, naam: "Aluminium", kleur: "#9ec1e8", tag: "tag-alu" },
  { id: 3, naam: "Staal",     kleur: "#a89a8c", tag: "tag-sta" },
  { id: 4, naam: "Messing",   kleur: "#d4b84a", tag: "tag-mes" },
  { id: 5, naam: "RVS",       kleur: "#8a8a8a", tag: "tag-rvs" },
];

const KENTEKENS = [
  "NL-KL-807", "NL-IJ-770", "NL-GH-733", "NL-EF-696", "NL-CD-659",
  "NL-AB-622", "NL-KL-585", "NL-IJ-548", "NL-DD-512", "NL-XX-001",
  "NL-EE-444", "NL-ZZ-999", "NL-FF-321", "NL-GG-654", "NL-HH-987"
];

const PRIJZEN = {
  1: 6.40,
  2: 1.85,
  3: 0.35,
  4: 4.20,
  5: 1.10,
};

const wegingen = [];
let weegbrugGewicht = 0;
let weegbrugRichting = 1;
let wegingCounter = 0;

function maakTijd() {
  return new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}
function maakDatum() {
  return new Date().toLocaleDateString("nl-NL");
}

function genereerWeging() {
  wegingCounter++;
  const mat = MATERIAAL[Math.floor(Math.random() * MATERIAAL.length)];
  const gewicht = Math.round((Math.random() * 6000 + 500) / 10) * 10;
  const prijs = PRIJZEN[mat.id];
  return {
    id: Date.now() + wegingCounter,
    kenteken: KENTEKENS[Math.floor(Math.random() * KENTEKENS.length)],
    materiaal: mat,
    gewicht: gewicht,
    prijs: prijs,
    totaal: Math.round(gewicht * prijs * 100) / 100,
    tijd: maakTijd(),
    datum: maakDatum(),
    bron: Math.random() > 0.5 ? "weegbrug" : "loods",
    isNieuw: true,
  };
}

for (let i = 0; i < 8; i++) {
  const w = genereerWeging();
  w.isNieuw = false;
  const uurGeleden = i * 0.7;
  w.tijd = new Date(Date.now() - uurGeleden * 3600000).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  wegingen.push(w);
}

function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

setInterval(() => {
  weegbrugGewicht += weegbrugRichting * (Math.random() * 200 + 50);
  if (weegbrugGewicht > 12000) weegbrugRichting = -1;
  if (weegbrugGewicht < 200)   weegbrugRichting = 1;
  weegbrugGewicht = Math.max(0, Math.round(weegbrugGewicht / 20) * 20);
  broadcast({ type: "gewicht_weegbrug", gewicht: weegbrugGewicht });
}, 500);

setInterval(() => {
  const w = genereerWeging();
  wegingen.unshift(w);
  if (wegingen.length > 200) wegingen.length = 200;
  broadcast({ type: "nieuwe_weging", weging: w });
  console.log(`📦 Nieuwe weging: ${w.materiaal.naam} ${w.gewicht} kg · € ${w.totaal}`);
}, 25000);

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`✓ Client verbonden vanaf ${ip}`);

  ws.send(JSON.stringify({
    type: "init",
    wegingen: wegingen,
    weegbrug: weegbrugGewicht,
    loods: null,
  }));

     ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === "registreer_weging") {
        const w = data.weging;
        w.id = Date.now() + Math.random();
        w.bron = "lokaal-via-server";
        w.isNieuw = true;
        w.tijd = maakTijd();
        w.datum = maakDatum();
        // klantNaam doorgeven als die er is
        if (data.weging.klantNaam) {
          w.klantNaam = data.weging.klantNaam;
        }
        // vol / leeg / netto doorgeven
        if (data.weging.vol    !== undefined) w.vol    = data.weging.vol;
        if (data.weging.leeg   !== undefined) w.leeg   = data.weging.leeg;
        if (data.weging.netto  !== undefined) w.netto  = data.weging.netto;
        if (data.weging.aftrek !== undefined) w.aftrek = data.weging.aftrek;
        wegingen.unshift(w);
        if (wegingen.length > 200) wegingen.length = 200;
        broadcast({ type: "nieuwe_weging", weging: w });
        console.log(`📥 Weging: ${w.klantNaam || "?"} · ${w.materiaal?.naam || "?"} · vol ${w.vol} − leeg ${w.leeg} = ${w.netto || w.gewicht} kg`);
      }
    } catch (e) {
      console.error("Bericht fout:", e.message);
    }
  });

process.on("SIGINT", () => {
  console.log("\n🛑 Weegserver gestopt");
  process.exit(0);
});
