# Weegbrug Server — Deployment Gids

Deze gids legt uit hoe je de **lokale weegbrug-server** installeert op de PC bij de weegbrug.

## Overzicht

De weegbrug-PC draait een Node.js-server die:
- Het gewicht leest van een **Bilanciai D430** weegbrug via RS-232 (COM-poort)
- Optioneel: gewicht leest van een **loods weegschaal** via tweede COM-poort
- Optioneel: XML-bestanden van de **NewTon-software** inleest
- Het gewicht **live** doorstuurt naar de NewTon+ app via WebSocket (poort 3000)
- Een **HTTP API** biedt voor status-opvragingen

## Benodigdheden

- Windows 7 of hoger
- Node.js v14 of hoger — download: https://nodejs.org
- Bilanciai D430 weegbrug (of compatibel) met RS-232 aansluiting
- Optioneel: tweede weegschaal of NewTon XML-export

## Installatie

### 1. Installeer Node.js

Download en installeer Node.js LTS van https://nodejs.org.
Standaard-opties zijn goed.

### 2. Kopieer server-bestanden

Kopieer de volgende bestanden naar `C:\NewTon\Server\` op de weegbrug-PC:
- `server.cjs`
- `package.json`

### 3. Installeer dependencies

Open **Command Prompt** in die map en voer uit:

```cmd
cd C:\NewTon\Server
npm install
```

### 4. Configureer COM-poorten

Open `server.cjs` en controleer de `CONFIG`-sectie bovenaan:

```js
const CONFIG = {
  WEEGBRUG_COM:  'COM1',   // ← aanpassen naar jouw COM-poort
  WEEGBRUG_BAUD: 9600,
  LOODS_COM:     'COM2',   // ← null als niet aangesloten
  LOODS_BAUD:    9600,
  ...
};
```

**Hoe vind ik mijn COM-poort?**
1. Open **Apparaatbeheer** (`devmgmt.msc`)
2. Vouw **Poorten (COM & LPT)** uit
3. Noteer de COM-poort van de Bilanciai (bijv. `COM3`)

### 5. Firewall openzetten

Andere PCs moeten via poort 3000 verbinden. Zet de firewall open:

```powershell
# Als Administrator uitvoeren
New-NetFirewallRule -DisplayName "NewTon Weegserver" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 6. Start de server

```cmd
cd C:\NewTon\Server
node server.cjs
```

**Verwachte output:**
```
[15:51:48] === Metaalrecycling Bulters - Weegserver v1.0 ===
[15:51:48] Server gestart op poort 3000
[15:51:48] Lokaal IP: 192.168.1.27:3000
[15:51:48] Weegbrug COM niet beschikbaar, simuleren  ← als COM niet is aangesloten
[15:51:48] Simulatiemodus actief
```

**Met echte weegbrug:**
```
[15:51:48] Weegbrug verbonden op COM1
[15:51:48] Loods weegschaal verbonden op COM2
```

### 7. Automatisch starten bij Windows-boot (optioneel)

Maak een snelkoppeling in de **Opstarten-map**:
1. Druk `Win+R` → typ `shell:startup` → Enter
2. Kopieer een snelkoppeling naar `node C:\NewTon\Server\server.cjs` daarheen

Of maak een **Windows Service** met `node-windows` of `nssm` voor productie.

### 8. Vanuit de app verbinden

In de NewTon+ app, vul in de server-balk bovenaan het IP in:
```
192.168.1.27:3000
```
(kies het IP van de weegbrug-PC, getoond in de server-output)

De topbar wordt **groen (Live)** zodra de verbinding slaagt.

## Configuratie-opties

Via environment-variabelen:

| Variabele | Default | Beschrijving |
|---|---|---|
| `HTTP_PORT` | 3000 | WebSocket/HTTP poort |
| `WEEGBRUG_COM` | COM1 | COM-poort van de weegbrug |
| `LOODS_COM` | COM2 | COM-poort van de loods weegschaal |
| `NEWTON_XML_MAP` | `C:\NewTon\XMLExport\` | Map waar NewTon XML-bestanden zet |
| `WEEGSERVER_KEY` | `bulters-2024` | API-key voor HTTP-authenticatie |

Voorbeeld in een Windows-batch-bestand:
```cmd
set HTTP_PORT=3000
set WEEGBRUG_COM=COM3
set LOODS_COM=COM4
set WEEGSERVER_KEY=mijn-geheime-key
node server.cjs
```

## Testen

### HTTP API
```cmd
curl http://localhost:3000/status
```
Verwacht JSON met weegbrug, loods, wegingen.

### Met API-key
```cmd
curl -H "X-API-Key: bulters-2024" http://localhost:3000/status
```

### WebSocket
Open `http://<server-ip>:3000/` in de browser — krijg een "Niet gevonden" (404), maar geen connectie-fout. Dat betekent dat de server bereikbaar is.

## Troubleshooting

| Probleem | Oorzaak | Oplossing |
|---|---|---|
| `Weegbrug COM niet beschikbaar` | COM-poort bestaat niet of is bezet | Check Apparaatbeheer, sluit andere programma's die COM gebruiken |
| `EACCES` permissie-fout | Node heeft geen rechten op COM-poort | Voer uit als Administrator |
| App blijft "Simulatie" tonen | Verkeerd IP of firewall blokkeert | Check firewall, ping test |
| `Authentication failed` | Verkeerde API-key | Zorg dat `WEEGSERVER_KEY` in app matcht |
| Gewicht verandert niet | Verkeerd protocol van weegbrug | Pas `parseBilanciai` aan voor jouw formaat |

## Ondersteunde Bilanciai formaten

De `parseBilanciai` functie herkent:
- `"  001240 kg"` (gewicht met kg-eenheid)
- `"ST,GS,+001240"` (Bilanciai continuous output)
- `"1240"` (alleen cijfers)

Voor andere formaten kun je de `parseBilanciai` functie aanpassen in `server.cjs`.

## Onderhoud

- **Logs**: de server logt naar console. Voor productie: redirect naar bestand (`node server.cjs > server.log 2>&1`).
- **Updates**: haal nieuwe `server.cjs` uit GitHub, herstart de server (Ctrl+C en opnieuw starten).
- **Backups**: bewaar een kopie van je `server.cjs` met aangepaste COM-configuratie.

## Support

Voor vragen: neem contact op met de ontwikkelaar van NewTon+.
