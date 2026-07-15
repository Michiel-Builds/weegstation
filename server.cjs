/**
 * WeegStation - Lokale Weegbrug Server
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
const { normalizeIp, parseAllowedIps, isIpAllowed, parseWsKey, verifyWsAuth } = require('./server/security.cjs');

let maakStoplicht;
try {
  ({ maakStoplicht } = require('./stoplicht.cjs'));
} catch (e) {
  ({ maakStoplicht } = require('./server/stoplicht.cjs'));
}

function laadDotEnv(pad) {
  try {
    if (!fs.existsSync(pad)) return false;
    let inhoud = fs.readFileSync(pad, 'utf8');
    if (inhoud.charCodeAt(0) === 0xfeff) inhoud = inhoud.slice(1);
    inhoud.split('\n').forEach(function (regel) {
      regel = regel.replace(/\r$/, '');
      if (!regel.trim() || regel.trim().startsWith('#')) return;
      const m = regel.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let waarde = m[2].replace(/^["']|["']$/g, '').trim();
      const hash = waarde.indexOf(' #');
      if (hash >= 0) waarde = waarde.slice(0, hash).trim();
      process.env[m[1]] = waarde;
    });
    return true;
  } catch (e) {
    console.error('Kon .env niet laden:', e.message);
    return false;
  }
}

const ENV_PAD = path.join(__dirname, '.env');
const envGeladen = laadDotEnv(ENV_PAD);

function parseEnvInt(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

function parseEnvParity(name, fallback) {
  const v = (process.env[name] || fallback || 'none').toLowerCase();
  return ['none', 'even', 'odd', 'mark', 'space'].includes(v) ? v : fallback;
}

// --- Configuratie
const CONFIG = {
  HTTP_PORT: 3000,
  WEEGBRUG_COM:       process.env.WEEGBRUG_COM || 'COM5',
  WEEGBRUG_BAUD:      parseEnvInt('WEEGBRUG_BAUD', 4800),
  WEEGBRUG_DATA_BITS: parseEnvInt('WEEGBRUG_DATA_BITS', 7),
  WEEGBRUG_STOP_BITS: parseEnvInt('WEEGBRUG_STOP_BITS', 1),
  WEEGBRUG_PARITY:    parseEnvParity('WEEGBRUG_PARITY', 'even'),
  LOODS_COM:          process.env.LOODS_COM || '',
  LOODS_BAUD:         parseEnvInt('LOODS_BAUD', 9600),
  LOODS_DATA_BITS:    parseEnvInt('LOODS_DATA_BITS', 8),
  LOODS_STOP_BITS:    parseEnvInt('LOODS_STOP_BITS', 1),
  LOODS_PARITY:       parseEnvParity('LOODS_PARITY', 'none'),
  NEWTON_XML_MAP: process.env.NEWTON_XML_MAP || 'C:\\NewTon\\XMLExport\\',
  API_KEY:        process.env.WEEGSERVER_KEY || '',
  ALLOWED_IPS:    parseAllowedIps(process.env.WEEGSERVER_ALLOWED_IPS),
};

if (!CONFIG.API_KEY) {
  console.error('');
  console.error('FOUT: WEEGSERVER_KEY ontbreekt.');
  console.error('Maak een .env bestand in deze map met bijvoorbeeld:');
  console.error('  WEEGSERVER_KEY=jouw-geheime-sleutel');
  console.error('(Zelfde sleutel als in WeegStation op kantoor-PC)');
  console.error('');
  process.exit(1);
}

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

// --- State
let huidigGewichtWeegbrug = null;
let huidigGewichtLoods    = null;
let wegingenBuffer        = [];
let verbondenClients      = new Set();
let weegbrugSimuleert     = false;

const serieelStatus = {
  weegbrug: {
    com: CONFIG.WEEGBRUG_COM,
    status: 'verbinden',
    laatsteRegel: '',
    formaat: serieleFormaat({
      baud: CONFIG.WEEGBRUG_BAUD,
      dataBits: CONFIG.WEEGBRUG_DATA_BITS,
      stopBits: CONFIG.WEEGBRUG_STOP_BITS,
      parity: CONFIG.WEEGBRUG_PARITY,
    }),
  },
  loods: {
    com: CONFIG.LOODS_COM || null,
    status: CONFIG.LOODS_COM ? 'verbinden' : 'niet_geconfigureerd',
    laatsteRegel: '',
  },
};

function isLocalhost(ip) {
  const n = normalizeIp(ip || '');
  return n === '127.0.0.1' || n === '::1' || n === 'localhost';
}

function fmtMonitorGewicht(kg) {
  if (kg === null || kg === undefined) return '—';
  const n = Number(kg);
  if (isNaN(n)) return '—';
  return n.toFixed(3).replace('.', ',') + ' kg';
}

function monitorStatusKlasse(status) {
  if (status === 'verbonden') return 'status-ok';
  if (status === 'simulatie') return 'status-warn';
  if (status === 'fout') return 'status-err';
  if (status === 'niet_geconfigureerd') return 'status-wait';
  return 'status-wait';
}

function monitorStatusTekst(com, status, formaat) {
  const labels = {
    verbinden: 'Verbinden…',
    verbonden: 'Verbonden',
    simulatie: 'Simulatie (geen COM)',
    fout: 'Fout',
    niet_geconfigureerd: 'Niet geconfigureerd',
  };
  const label = labels[status] || status;
  const comTekst = com || '—';
  const extra = formaat ? ' (' + formaat + ')' : '';
  return comTekst + ' — ' + label + extra;
}

function renderMonitorHtml() {
  const data = getMonitorData();
  const wb = data.serieel.weegbrug;
  let html = fs.readFileSync(MONITOR_HTML_PAD, 'utf8');

  html = html.replace('{{WEGBRUG_GEWICHT}}', fmtMonitorGewicht(data.weegbrug));
  html = html.replace('{{WEGBRUG_STATUS_KLASSE}}', monitorStatusKlasse(wb.status));
  html = html.replace('{{WEGBRUG_STATUS_TEKST}}', monitorStatusTekst(wb.com, wb.status, wb.formaat));
  html = html.replace(
    '{{WEGBRUG_DEBUG}}',
    wb.laatsteRegel ? 'Laatste regel: ' + wb.laatsteRegel : ''
  );

  const ld = data.serieel.loods;
  let loodsBlok = '';
  if (ld && ld.com && ld.status !== 'niet_geconfigureerd') {
    loodsBlok =
      '<div class="card"><div class="label">Loods</div>' +
      '<div class="gewicht" style="font-size:28px">' + fmtMonitorGewicht(data.loods) + '</div>' +
      '<div class="status ' + monitorStatusKlasse(ld.status) + '">' +
      monitorStatusTekst(ld.com, ld.status, ld.formaat) + '</div>' +
      '<div class="debug">' +
      (ld.laatsteRegel ? 'Laatste regel: ' + ld.laatsteRegel : '') +
      '</div></div>';
  }
  html = html.replace('{{LOODS_BLOK}}', loodsBlok);
  html = html.replace('{{IP_POORT}}', (data.ip || '—') + ':' + (data.poort || CONFIG.HTTP_PORT));
  html = html.replace('{{APPS_VERBONDEN}}', String(data.appsVerbonden || 0) + ' actief');
  html = html.replace('{{TIJD}}', new Date().toLocaleTimeString('nl-NL'));

  return html;
}

function getMonitorData() {
  return {
    weegbrug: huidigGewichtWeegbrug,
    loods: huidigGewichtLoods,
    serieel: serieelStatus,
    appsVerbonden: verbondenClients.size,
    ip: getLocalIP(),
    poort: CONFIG.HTTP_PORT,
    uptime: process.uptime(),
    stoplicht: stoplicht.getStatus(),
    timestamp: new Date().toISOString(),
  };
}

const MONITOR_HTML_PAD = path.join(__dirname, 'monitor.html');

const stoplicht = maakStoplicht(process.env, log);

function stuurWeegbrugGewicht(gewicht, extra) {
  huidigGewichtWeegbrug = gewicht;
  stoplicht.onGewicht(gewicht);
  broadcast(Object.assign({ type: 'gewicht_weegbrug', gewicht, stabiel: gewicht > 0 }, extra || {}));
}

let ReadlineParser = null;
try {
  ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
} catch (e) {
  console.error('ReadlineParser niet beschikbaar:', e.message);
}

// --- WebSocket server
const httpServer = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  const clientIp = req.socket.remoteAddress;

  if (isLocalhost(clientIp) && (url === '/monitor' || url === '/api/monitor')) {
    if (url === '/monitor') {
      try {
        const html = renderMonitorHtml();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Monitor fout: ' + e.message + '\nPad: ' + MONITOR_HTML_PAD);
      }
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(getMonitorData()));
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!isIpAllowed(clientIp, CONFIG.ALLOWED_IPS)) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: 'Forbidden' }));
  }

  const clientKey = req.headers['x-api-key'];
  if (CONFIG.API_KEY && clientKey !== CONFIG.API_KEY) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  if (url === '/status') {
    res.end(JSON.stringify({
      weegbrug: huidigGewichtWeegbrug,
      loods:    huidigGewichtLoods,
      wegingen: wegingenBuffer.slice(0, 50),
      uptime:   process.uptime(),
      versie:   '3.2.0',
      stoplicht: stoplicht.getStatus(),
    }));
  } else if (url === '/gewicht') {
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

  const clientIp = normalizeIp(ip);
  verbondenClients.forEach(function (bestaand) {
    if (bestaand._clientIp === clientIp && bestaand.readyState === WebSocket.OPEN) {
      log('Oude verbinding van ' + clientIp + ' sluiten (nieuwe app-verbinding)');
      try { bestaand.close(1000, 'Vervangen door nieuwe verbinding'); } catch (e) {}
      verbondenClients.delete(bestaand);
    }
  });
  ws._clientIp = clientIp;

  verbondenClients.add(ws);
  log('App verbonden vanaf ' + ip + ' (' + verbondenClients.size + ' actief)');

  ws.send(JSON.stringify({
    type: 'init',
    weegbrug: huidigGewichtWeegbrug,
    loods:    huidigGewichtLoods,
    wegingen: wegingenBuffer.slice(0, 50),
    stoplicht: stoplicht.getStatus(),
  }));

  ws.on('message', (data) => {
    try {
      const bericht = JSON.parse(data);
      if (bericht.type === 'registreer_weging') {
        registreerWeging(bericht.weging);
      }
      if (bericht.type === 'stoplicht_groen') {
        stoplicht.naarGroen().then(function (res) {
          ws.send(JSON.stringify({ type: 'stoplicht_bevestig', ok: res.ok, kleur: 'groen', fout: res.fout }));
        });
      }
      if (bericht.type === 'stoplicht_rood') {
        stoplicht.naarRood('handmatig').then(function (res) {
          ws.send(JSON.stringify({ type: 'stoplicht_bevestig', ok: res.ok, kleur: 'rood', fout: res.fout }));
        });
      }
    } catch(e) {}
  });

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch (e) {}
    }
  }, 25000);

  ws.on('close', () => {
    clearInterval(pingTimer);
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

stoplicht.setBroadcast(broadcast);

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

let weegbrugSerieelBuffer = '';

function sanitiseSerieelRegel(regel) {
  return String(regel || '').replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function verwerkWeegbrugRegel(rawRegel) {
  const regel = sanitiseSerieelRegel(rawRegel);
  if (!regel) return;
  serieelStatus.weegbrug.laatsteRegel = regel.slice(0, 120);
  const gewicht = parseBilanciai(regel);
  if (gewicht !== null) {
    stuurWeegbrugGewicht(gewicht);
  }
}

function koppelWeegbrugDataHandler(port) {
  port.on('data', (chunk) => {
    const tekst = chunk.toString('latin1');
    serieelStatus.weegbrug.laatsteRegel = sanitiseSerieelRegel(tekst).slice(0, 120);
    weegbrugSerieelBuffer += tekst;
    const delen = weegbrugSerieelBuffer.split(/\r\n|\r|\n/);
    weegbrugSerieelBuffer = delen.pop() || '';
    for (let i = 0; i < delen.length; i++) {
      verwerkWeegbrugRegel(delen[i]);
    }
    if (weegbrugSerieelBuffer.length > 200) {
      verwerkWeegbrugRegel(weegbrugSerieelBuffer);
      weegbrugSerieelBuffer = '';
    }
  });
}

// --- RS-232 uitlezen: Weegbrug
function startWeegbrugSerieel() {
  serieelStatus.weegbrug.com = CONFIG.WEEGBRUG_COM;
  serieelStatus.weegbrug.status = 'verbinden';
  weegbrugSerieelBuffer = '';
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

    koppelWeegbrugDataHandler(port);

    port.on('open', () => {
      serieelStatus.weegbrug.status = 'verbonden';
      log(
        'Weegbrug verbonden op ' + CONFIG.WEEGBRUG_COM + ' (' + serieelStatus.weegbrug.formaat + ')'
      );
      setTimeout(function () {
        if (huidigGewichtWeegbrug === null && !serieelStatus.weegbrug.laatsteRegel) {
          log('Geen data van weegbrug — check COM-poort, kabel en instellingen (4800 7E1)');
          log('Tip: dubbelklik test-com-poort.bat om ruwe data te zien');
        }
      }, 8000);
    });
    port.on('error', (err) => {
      serieelStatus.weegbrug.status = 'fout';
      log('Weegbrug COM fout: ' + err.message + ' - simuleren');
      simuleerWeegbrug();
    });

  } catch(e) {
    serieelStatus.weegbrug.status = 'fout';
    log('Weegbrug COM niet beschikbaar, simuleren');
    simuleerWeegbrug();
  }
}

// --- RS-232 uitlezen: Loods weegschaal
function startLoodsWeegsSchaalSerieel() {
  if (!CONFIG.LOODS_COM) {
    serieelStatus.loods.status = 'niet_geconfigureerd';
    log('Loods weegschaal: niet geconfigureerd');
    return;
  }
  serieelStatus.loods.com = CONFIG.LOODS_COM;
  serieelStatus.loods.status = 'verbinden';
  if (!ReadlineParser) {
    serieelStatus.loods.status = 'fout';
    log('Loods weegschaal: serialport niet beschikbaar');
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
      serieelStatus.loods.laatsteRegel = String(regel).trim().slice(0, 120);
      const gewicht = parseBilanciai(regel);
      if (gewicht !== null && gewicht !== huidigGewichtLoods) {
        huidigGewichtLoods = gewicht;
        broadcast({ type: 'gewicht_loods', gewicht, stabiel: gewicht > 0 });
      }
    });

    port.on('open', () => {
      serieelStatus.loods.status = 'verbonden';
      log('Loods weegschaal verbonden op ' + CONFIG.LOODS_COM);
    });
    port.on('error', (err) => {
      serieelStatus.loods.status = 'fout';
      log('Loods COM fout: ' + err.message);
    });

  } catch(e) {
    serieelStatus.loods.status = 'fout';
    log('Loods COM niet beschikbaar');
  }
}

// --- Bilanciai / industrieel protocol parser
function parseBilanciai(regel) {
  regel = sanitiseSerieelRegel(regel);
  if (!regel) return null;

  // "$     20" — gewicht na $ (jullie weegbrug-formaat, kg)
  let match = regel.match(/^\$\s*(\d+(?:[.,]\d+)?)/);
  if (match) return parseFloat(match[1].replace(',', '.'));

  match = regel.match(/([+-]?\d+[.,]?\d*)\s*kg/i);
  if (match) return parseFloat(match[1].replace(',', '.'));

  match = regel.match(/ST,GS,\s*[+-]?(\d+(?:[.,]\d+)?)/i);
  if (match) return parseFloat(match[1].replace(',', '.'));

  match = regel.match(/GS,\s*[+-]?(\d+(?:[.,]\d+)?)/i);
  if (match) return parseFloat(match[1].replace(',', '.'));

  match = regel.match(/([+-]?\d+[.,]\d+)/);
  if (match) return parseFloat(match[1].replace(',', '.'));

  match = regel.match(/^[+-]?\s*(\d+)\s*$/);
  if (match) return parseInt(match[1], 10);

  return null;
}

// --- Simulatie (fallback)
function simuleerWeegbrug() {
  if (weegbrugSimuleert) return;
  weegbrugSimuleert = true;
  serieelStatus.weegbrug.status = 'simulatie';
  log('Simulatiemodus actief (geen echte weegbrug)');
  let gewicht = 0;
  let richting = 1;
  setInterval(() => {
    gewicht += richting * Math.floor(Math.random() * 200 + 50);
    if (gewicht > 12000) richting = -1;
    if (gewicht < 0) { gewicht = 0; richting = 1; }
    const afgerond = Math.round(gewicht / 20) * 20;
    if (afgerond !== huidigGewichtWeegbrug) {
      stuurWeegbrugGewicht(afgerond, { simulatie: true, stabiel: true });
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
  log('=== WeegStation - Weegserver v3.1.11 ===');
  if (envGeladen) {
    log('.env geladen: ' + ENV_PAD);
  } else {
    log('WAARSCHUWING: geen .env in ' + ENV_PAD);
  }
  log('Server gestart op poort ' + CONFIG.HTTP_PORT);
  log(
    'COM-poort weegbrug: ' + CONFIG.WEEGBRUG_COM +
    ' (' + serieelStatus.weegbrug.formaat + ')' +
    (process.env.WEEGBRUG_COM ? ', uit .env' : ', standaard')
  );
  if (CONFIG.LOODS_COM) log('COM-poort loods: ' + CONFIG.LOODS_COM);
  log('Lokaal IP: ' + getLocalIP() + ':' + CONFIG.HTTP_PORT);
  log('Monitor: http://localhost:' + CONFIG.HTTP_PORT + '/monitor');
  if (CONFIG.ALLOWED_IPS) {
    log('IP-whitelist actief: ' + CONFIG.ALLOWED_IPS.join(', '));
  }
  startWeegbrugSerieel();
  startLoodsWeegsSchaalSerieel();
  startXMLWatcher();
  stoplicht.init();
});

process.on('SIGINT', () => {
  log('Server afsluiten...');
  httpServer.close(() => process.exit(0));
});
