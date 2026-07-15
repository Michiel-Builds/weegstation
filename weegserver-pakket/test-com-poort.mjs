/**
 * Leest 30 seconden ruwe data van een COM-poort (diagnose weegbrug).
 * Werkt altijd in de map waar dit bestand staat (ook na verplaatsen).
 */
import { SerialPort } from 'serialport';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptPad = fileURLToPath(import.meta.url);
const root = path.dirname(scriptPad);

function laadDotEnv(pad) {
  try {
    if (!fs.existsSync(pad)) return;
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
  } catch (e) {}
}

laadDotEnv(path.join(root, '.env'));

const com = (process.argv[2] || process.env.WEEGBRUG_COM || 'COM5').toUpperCase();
const baud = parseInt(process.env.WEEGBRUG_BAUD || '4800', 10);
const dataBits = parseInt(process.env.WEEGBRUG_DATA_BITS || '7', 10);
const stopBits = parseInt(process.env.WEEGBRUG_STOP_BITS || '1', 10);
const parity = (process.env.WEEGBRUG_PARITY || 'even').toLowerCase();

console.log('');
console.log('COM-test weegbrug — 30 seconden luisteren');
console.log('Map:', root);
console.log('Script:', scriptPad);
console.log('Poort:', com, '|', baud, dataBits + parity[0].toUpperCase() + stopBits);
console.log('');

async function main() {
  const poorten = await SerialPort.list();
  console.log('Beschikbare COM-poorten op DEZE pc:');
  if (!poorten.length) {
    console.log('  (geen — geen USB/RS232 aangesloten?)');
  } else {
    poorten.forEach(function (p) {
      console.log('  ' + (p.path || '?') + '  ' + (p.friendlyName || p.manufacturer || ''));
    });
  }
  console.log('');

  const bestaat = poorten.some(function (p) {
    return String(p.path || '').toUpperCase() === com;
  });

  if (!bestaat) {
    console.error('FOUT: ' + com + ' bestaat NIET op deze pc.');
    console.error('');
    console.error('Dit is GEEN probleem met test-com-poort.mjs —');
    console.error('de COM-poort uit .env klopt niet (meestal na andere USB-poort of andere pc).');
    console.error('');
    console.error('Oplossing:');
    console.error('  1. Dubbelklik lijst-com-poorten.bat');
    console.error('  2. Dubbelklik wijzig-com.bat en kies het juiste nummer');
    console.error('  3. Of: test-com-poort.bat COM3  (andere poort proberen)');
    process.exit(1);
  }

  console.log('Openen van ' + com + '...');
  console.log('Zet iets op de weegschaal of wacht op live data.');
  console.log('---');

  let regels = 0;

  await new Promise(function (resolve, reject) {
    const port = new SerialPort({
      path: com,
      baudRate: baud,
      dataBits: dataBits,
      stopBits: stopBits,
      parity: parity,
    });

    port.on('open', function () {
      console.log('Verbonden op', com);
    });

    port.on('data', function (chunk) {
      regels++;
      const tekst = chunk.toString('latin1');
      const schoon = tekst.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('[' + regels + '] tekst:', schoon || '(leeg)');
      console.log('     hex: ', chunk.toString('hex'));
    });

    port.on('error', function (err) {
      reject(err);
    });

    setTimeout(function () {
      port.close(function () {
        resolve(regels);
      });
    }, 30000);
  }).then(function (regels) {
    console.log('');
    if (regels === 0) {
      console.log('Geen data ontvangen in 30 sec.');
      console.log('COM bestaat wel — check RS-232 kabel en weegschaal (continuous mode).');
    } else {
      console.log('Klaar —', regels, 'data-blok(ken) ontvangen.');
      console.log('Zet in .env: WEEGBRUG_COM=' + com);
    }
  }).catch(function (err) {
    console.error('');
    console.error('FOUT bij openen ' + com + ':', err.message);
    console.error('');
    if (/file not found|cannot open|unknown|ENOENT/i.test(err.message)) {
      console.error('Meestal: COM-poort bestaat niet of is in gebruik door ander programma.');
      console.error('Sluit start-weegserver.bat en andere COM-programma\'s.');
    }
    console.error('Start eventueel dit venster als Administrator.');
    process.exit(1);
  });
}

main();
