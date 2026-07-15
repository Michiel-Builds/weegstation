/**
 * Toont alle beschikbare COM-poorten op deze PC.
 * Handig bij .env instellen zonder Apparaatbeheer.
 */
import { SerialPort } from 'serialport';

console.log('');
console.log('Beschikbare COM-poorten:');
console.log('');

try {
  const poorten = await SerialPort.list();
  if (!poorten.length) {
    console.log('  (geen poorten gevonden)');
    console.log('');
    console.log('Controleer of de weegschaal is aangesloten en drivers geinstalleerd zijn.');
  } else {
    poorten.forEach(function (p) {
      const pad = (p.path || '').padEnd(8);
      const naam = [p.manufacturer, p.friendlyName || p.pnpId].filter(Boolean).join(' — ');
      console.log('  ' + pad + (naam || '(onbekend apparaat)'));
    });
  }
} catch (e) {
  console.error('Fout bij ophalen poorten:', e.message);
  process.exit(1);
}

console.log('');
console.log('Zet in .env bijvoorbeeld: WEEGBRUG_COM=COM5');
console.log('');
