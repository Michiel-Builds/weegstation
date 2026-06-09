/**
 * Bulters Weegsysteem - Lokale Weegbrug Server
 * Draait op de pc bij de weegbrug (Windows 7+)
 * Leest gewicht van Bilanciai via RS-232 (COM-poort)
 * Stuurt live gewicht door naar de app via WebSocket
 */

const http       = require('http');
const WebSocket  = require('ws');
const { SerialPort } = require('serialport');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { parseAllowedIps, isIpAllowed, verifyWsAuth } = require('./server/security.cjs');

// --- Configuratie
const CONFIG = {
  HTTP_PORT: 3000,
  WEEGBRUG_COM:       process.env.WEEGBRUG_COM || 'COM5',
  WEEGBRUG_BAUD:      4800,
  WEEGBRUG_DATA_BITS: 7,
  WEEGBRUG_STOP_BITS: 1,
  WEEGBRUG_PARITY:    'even',
  LOODS_COM:          process.env.LOODS_COM || 'COM2',
  LOODS_BAUD:         9600,
  LOODS_DATA_BITS:    8,
  LOODS_STOP_BITS:    1,
  LOODS_PARITY:       'none',
  NEWTON_XML_MAP: process.env.NEWTON_XML_MAP || 'C:\\NewTon\\XMLExport\\',
  API_KEY:        process.env.WEEGSERVER_KEY || 'BultersWs-8kM2pQ9v',
  ALLOWED_IPS:    parseAllowedIps(process.env.WEEGSERVER_ALLOWED_IPS),
};

// --- State
let huidigGewichtWeegbrug = null;
let huidigGewichtLoods    = null;
let wegingenBuffer        = [];
let verbondenClients      = new Set();

function log(msg) {
  const tijd = new Date().toLocaleTimeString('nl-NL');
  console.log('[' + tijd + '] ' + msg);
}

function serielePoortOpties(com, { baud, dataBits, stopBits, parity }) {
  return { path: com, baudRate: baud, dataBits, stopBits, parity };
}

function serieleFormaat({ baud, dataBits, stopBits, parity }) {
  const p = { none: 'N', even: 'E', odd: 'O', mark: 'M', space: 'S' }[parity] || '?';
  return baud + ' ' + dataBits + p + stopBits;
}

let ReadlineParser = null;
try {
  ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
} catch (e) {
  console.error('ReadlineParser niet beschikbaar:', e.message);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// --- WebSocket server
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const clientIp = req.socket.remoteAddress;
  if (!isIpAllowed(clientIp, CONFIG.ALLOWED_IPS)) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: 'Forbidden' }));
  }

  const clientKey = req.headers['x-api-key'];
  if (CONFIG.API_KEY && clientKey !== CONFIG.API_KEY) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  if (req.url === '/status') {
    res.end(JSON.stringify({
      weegbrug: huidigGewichtWeegbrug,
      loods:    huidigGewichtLoods,
      wegingen: wegingenBuffer.slice(0, 50),
      uptime:   process.uptime(),
      versie:   '1.0.0',
    }));
  } else if (req.url === '/gewicht') {
    res.end(JSON.stringify({
      weegbrug: huidigGewichtWeegbrug,
      loods:    huidigGewichtLoods,
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end('Niet gevonden');
  }
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;

  if (!isIpAllowed(ip, CONFIG.ALLOWED_IPS)) {
    log('WebSocket geweigerd — IP niet toegestaan: ' + ip);
    ws.close(1008, 'Forbidden');
    return;
  }
  if (!verifyWsAuth(req, CONFIG.API_KEY)) {
    log('WebSocket geweigerd — ongeldige sleutel vanaf ' + ip);
    ws.close(1008, 'Unauthorized');
    return;
  }

  verbondenClients.add(ws);
  log('App verbonden vanaf ' + ip + ' (' + verbondenClients.size + ' actief)');

  ws.send(JSON.stringify({
    type: 'init',
    weegbrug: huidigGewichtWeegbrug,
    loods:    huidigGewichtLoods,
    wegingen: wegingenBuffer.slice(0, 50),
  }));

  ws.on('message', (data) => {
    try {
      const bericht = JSON.parse(data);
      if (bericht.type === 'registreer_weging') {
        registreerWeging(bericht.weging);
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    verbondenClients.delete(ws);
    log('App verbroken (' + verbondenClients.size + ' actief)');
  });

  ws.on('error', (err) => {
    log('WebSocket fout: ' + err.message);
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  verbondenClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(json); } catch(e) {}
    }
  });
}

// --- Weging registreren
function registreerWeging(weging) {
  weging.id        = Date.now();
  weging.timestamp = new Date().toISOString();
  weging.bron      = weging.bron || 'weegbrug';
  wegingenBuffer.unshift(weging);
  if (wegingenBuffer.length > 500) wegingenBuffer.pop();
  broadcast({ type: 'nieuwe_weging', weging });
  log('Weging: ' + weging.kenteken + ' | ' + weging.materiaal + ' | ' + weging.gewicht + ' kg');
}

// --- RS-232 uitlezen: Weegbrug
function startWeegbrugSerieel() {
  if (!ReadlineParser) {
    log('Weegbrug: serialport niet beschikbaar, simuleren');
    simuleerWeegbrug();
    return;
  }
  try {
    const port = new SerialPort(serielePoortOpties(CONFIG.WEEGBRUG_COM, {
      baud: CONFIG.WEEGBRUG_BAUD,
      dataBits: CONFIG.WEEGBRUG_DATA_BITS,
      stopBits: CONFIG.WEEGBRUG_STOP_BITS,
      parity: CONFIG.WEEGBRUG_PARITY,
    }));

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on('data', (regel) => {
      const gewicht = parseBilanciai(regel);
      if (gewicht !== null && gewicht !== huidigGewichtWeegbrug) {
        huidigGewichtWeegbrug = gewicht;
        broadcast({ type: 'gewicht_weegbrug', gewicht, stabiel: gewicht > 0 });
      }
    });

    port.on('open', () => log(
      'Weegbrug verbonden op ' + CONFIG.WEEGBRUG_COM + ' (' + serieleFormaat({
        baud: CONFIG.WEEGBRUG_BAUD,
        dataBits: CONFIG.WEEGBRUG_DATA_BITS,
        stopBits: CONFIG.WEEGBRUG_STOP_BITS,
        parity: CONFIG.WEEGBRUG_PARITY,
      }) + ')'
    ));
    port.on('error', (err) => {
      log('Weegbrug COM fout: ' + err.message + ' - simuleren');
      simuleerWeegbrug();
    });

  } catch(e) {
    log('Weegbrug COM niet beschikbaar, simuleren');
    simuleerWeegbrug();
  }
}

// --- RS-232 uitlezen: Loods weegschaal
function startLoodsWeegsSchaalSerieel() {
  if (!ReadlineParser) {
    log('Loods weegschaal: serialport niet beschikbaar');
    return;
  }
  if (!CONFIG.LOODS_COM) {
    log('Loods weegschaal: niet geconfigureerd');
    return;
  }
  try {
    const port = new SerialPort(serielePoortOpties(CONFIG.LOODS_COM, {
      baud: CONFIG.LOODS_BAUD,
      dataBits: CONFIG.LOODS_DATA_BITS,
      stopBits: CONFIG.LOODS_STOP_BITS,
      parity: CONFIG.LOODS_PARITY,
    }));

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on('data', (regel) => {
      const gewicht = parseBilanciai(regel);
      if (gewicht !== null && gewicht !== huidigGewichtLoods) {
        huidigGewichtLoods = gewicht;
        broadcast({ type: 'gewicht_loods', gewicht, stabiel: gewicht > 0 });
      }
    });

    port.on('open',  () => log('Loods weegschaal verbonden op ' + CONFIG.LOODS_COM));
    port.on('error', (err) => log('Loods COM fout: ' + err.message));

  } catch(e) {
    log('Loods COM niet beschikbaar');
  }
}

// --- Bilanciai protocol parser
function parseBilanciai(regel) {
  regel = regel.trim();
  let match = regel.match(/([+-]?\d+\.?\d*)\s*kg/i);
  if (match) return parseFloat(match[1]);
  match = regel.match(/ST,GS,[+-]?(\d+)/);
  if (match) return parseInt(match[1]);
  match = regel.match(/^[+-]?\s*(\d+)\s*$/);
  if (match) return parseInt(match[1]);
  return null;
}

// --- Simulatie (fallback)
function simuleerWeegbrug() {
  log('Simulatiemodus actief (geen echte weegbrug)');
  let gewicht = 0;
  let richting = 1;
  setInterval(() => {
    gewicht += richting * Math.floor(Math.random() * 200 + 50);
    if (gewicht > 12000) richting = -1;
    if (gewicht < 0) { gewicht = 0; richting = 1; }
    const afgerond = Math.round(gewicht / 20) * 20;
    if (afgerond !== huidigGewichtWeegbrug) {
      huidigGewichtWeegbrug = afgerond;
      broadcast({ type: 'gewicht_weegbrug', gewicht: afgerond, stabiel: true, simulatie: true });
    }
  }, 500);
}

// --- Newton XML watcher
function startXMLWatcher() {
  if (!fs.existsSync(CONFIG.NEWTON_XML_MAP)) {
    log('Newton XML map niet gevonden: ' + CONFIG.NEWTON_XML_MAP);
    return;
  }
  log('Newton XML map gevonden: ' + CONFIG.NEWTON_XML_MAP);
  let verwerkt = new Set();
  setInterval(() => {
    fs.readdir(CONFIG.NEWTON_XML_MAP, (err, bestanden) => {
      if (err) return;
      bestanden
        .filter(b => b.endsWith('.xml') && !verwerkt.has(b))
        .forEach(bestand => {
          verwerkt.add(bestand);
          const pad = path.join(CONFIG.NEWTON_XML_MAP, bestand);
          fs.readFile(pad, 'utf8', (err, inhoud) => {
            if (err) return;
            broadcast({ type: 'newton_xml', bestand, inhoud });
            log('Newton XML ontvangen: ' + bestand);
          });
        });
    });
  }, 5000);
}

// --- Start alles op
httpServer.listen(CONFIG.HTTP_PORT, () => {
  log('=== Bulters Weegsysteem - Weegserver v1.0 ===');
  log('Server gestart op poort ' + CONFIG.HTTP_PORT);
  log('Lokaal IP: ' + getLocalIP() + ':' + CONFIG.HTTP_PORT);
  if (CONFIG.ALLOWED_IPS) {
    log('IP-whitelist actief: ' + CONFIG.ALLOWED_IPS.join(', '));
  }
  startWeegbrugSerieel();
  startLoodsWeegsSchaalSerieel();
  startXMLWatcher();
});

process.on('SIGINT', () => {
  log('Server afsluiten...');
  httpServer.close(() => process.exit(0));
});
