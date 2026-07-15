# WeegStation Mobiel — installatie

## Wat is dit?

Android/iOS companion-app voor chauffeurs op de weegbrug. Verbindt via WiFi/LAN met de weegserver (`192.168.10.50:3000`).

## Vereisten

- Telefoon/tablet op **hetzelfde netwerk** als de weegbrug-PC
- Weegserver draait (`start-weegserver.bat`)
- API-sleutel uit `.env` op weegbrug (`WEEGSERVER_KEY`)

## Eerste keer opstarten

1. Open de app
2. Vul in:
   - **Weegserver IP:** `192.168.10.50` (of het IP van de weegbrug-PC)
   - **API-sleutel:** zelfde waarde als `WEEGSERVER_KEY` in `.env`
   - **Chauffeursnaam + wachtwoord** (lokaal op telefoon)
3. Log in en weeg

## Kantoor sync (optioneel)

Op de **kantoor-PC** (WeegStation desktop) draait een sync-API op poort **3847** zodra de app open is.

- Token-bestand: `%LOCALAPPDATA%\WeegStation\sync-api-token.txt`
- In mobiele instellingen: kantoor-PC IP (`192.168.10.10`) + sync-token
- Endpoints: `/api/klanten`, `/api/wegingen`, `/api/bon-omzet`, `/api/status`

## Ontwikkelaar — bouwen

```bash
npm run build:mobile
npx cap sync
npx cap open android   # Android Studio
npx cap open ios       # Xcode (Mac vereist)
```

APK debug (Android Studio + JDK 17 vereist):
```bash
npm run cap:sync
cd mobile/android
gradlew.bat assembleDebug
```

APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

**Let op:** Zonder Android Studio/JDK faalt de Gradle-build. Installeer [Android Studio](https://developer.android.com/studio) en zet `JAVA_HOME` op de meegeleverde JBR.

## Netwerk

- WebSocket: `ws://IP:3000?key=SLEUTEL` (geen TLS — alleen LAN)
- Android: cleartext traffic toegestaan via `network_security_config.xml`

## Terugval

Desktop-app blijft ongewijzigd. Mobiel is een apart build-pad (`dist-mobile/`).
