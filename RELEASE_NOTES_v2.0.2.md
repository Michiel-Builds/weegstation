## Bulters Weegsysteem v2.0.2

Complete levering voor klant: kantoor-app + weegbrug-server (zonder broncode).

### Downloads

| Bestand | PC | Gebruik |
|---------|-----|---------|
| **Bulters Weegsysteem-Setup-2.0.2.exe** | Kantoor | Installeer en start de app |
| **Bulters-Weegserver.zip** | Weegbrug | Uitpakken, Node.js installeren, `start-weegserver.bat` |

### Nieuw in v2.0.2

- Apart **weegserver-pakket** voor de weegbrug-PC — geen volledige projectmap meer nodig
- `LEESMIJ.txt` in de ZIP met installatiestappen voor de klant
- Bevat alle beveiliging van v2.0.1 (login-hash, WebSocket-sleutel, DevTools uit in .exe)

### Installatie

**Kantoor-PC:** installeer de `.exe` → inloggen (zie `INSTALLATIE.txt` bij leverancier)

**Weegbrug-PC:**
1. Node.js LTS installeren
2. ZIP uitpakken naar `C:\Bulters\Weegserver\`
3. Dubbelklik `start-weegserver.bat`
4. IP noteren → invullen in app op kantoor-PC
