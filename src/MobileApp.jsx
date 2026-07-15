import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import "./styles.css";
import "./styles-mobile.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/jetbrains-mono/500.css";

import MobieleSetup from "./components/MobieleSetup";
import MobieleLoginScherm from "./components/MobieleLoginScherm";
import MobieleInstellingen from "./components/MobieleInstellingen";
import ChauffeurScherm from "./components/ChauffeurScherm";
import { isMobieleSetupKlaar } from "./utils/mobileAuth";
import { laadServerIP, laadServerKey, bewaarServerIP, bewaarServerKey } from "./utils/weegserver";
import { laadBedrijfConfig } from "./utils/bedrijfConfig";
import { useWeegserverWs } from "./utils/useWeegserverWs";
import { pasThemaToe } from "./utils/thema";

function verstuurWegingViaWs(wsRef, weging) {
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ type: "registreer_weging", weging }));
    return true;
  }
  return false;
}

export default function MobileApp() {
  const [fase, setFase] = useState("laden");
  const [gebruiker, setGebruiker] = useState(null);
  const [bedrijfsnaam, setBedrijfsnaam] = useState("WeegStation");
  const [serverIP, setServerIP] = useState(() => laadServerIP());
  const [serverKey, setServerKey] = useState(() => laadServerKey());
  const [gewichtWeegbrug, setGewichtWeegbrug] = useState(null);
  const [gewichtLoods, setGewichtLoods] = useState(null);
  const [toonInstellingen, setToonInstellingen] = useState(false);
  const [toast, setToast] = useState(null);

  const toonToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#1a1c1e" }).catch(() => {});
    }
    isMobieleSetupKlaar().then(klaar => setFase(klaar ? "login" : "setup"));
    laadBedrijfConfig().then(cfg => {
      if (cfg) {
        setBedrijfsnaam(cfg.bedrijfsnaam || "WeegStation");
        pasThemaToe(cfg);
      }
    });
  }, []);

  const wsActief = !!(gebruiker && serverKey.trim());

  const { wsRef, verbonden: serverVerbonden } = useWeegserverWs({
    actief: wsActief,
    ip: serverIP,
    sleutel: serverKey,
    onBericht: (data) => {
      if (data.type === "init") {
        if (data.weegbrug !== null && data.weegbrug !== undefined) setGewichtWeegbrug(data.weegbrug);
        if (data.loods !== null && data.loods !== undefined) setGewichtLoods(data.loods);
      }
      if (data.type === "gewicht_weegbrug") setGewichtWeegbrug(data.gewicht);
      if (data.type === "gewicht_loods") setGewichtLoods(data.gewicht);
    },
    onVerbonden: () => toonToast("Live verbonden met weegserver"),
    onVerbroken: () => {},
  });

  function handleWeging(weging) {
    if (verstuurWegingViaWs(wsRef, weging)) {
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    } else {
      toonToast("Geen verbinding — weging niet verstuurd");
    }
  }

  function pasServerToe() {
    setServerIP(laadServerIP());
    setServerKey(laadServerKey());
  }

  if (fase === "laden") return null;

  if (fase === "setup") {
    return (
      <MobieleSetup onKlaar={() => setFase("login")} />
    );
  }

  if (!gebruiker) {
    return (
      <MobieleLoginScherm onLogin={u => { setGebruiker(u); setFase("app"); }} />
    );
  }

  return (
    <>
      <div className="mobile-topbar mobile-safe">
        <span className={`mobile-conn${serverVerbonden ? " ok" : ""}`}>
          {serverVerbonden ? "● Live" : "○ Offline"}
        </span>
        <button type="button" className="mobile-settings-btn" onClick={() => setToonInstellingen(true)} aria-label="Instellingen">
          ⚙
        </button>
        <button type="button" className="mobile-settings-btn" onClick={() => setGebruiker(null)} aria-label="Uitloggen">
          ↪
        </button>
      </div>
      <ChauffeurScherm
        gebruiker={gebruiker}
        onLogout={() => setGebruiker(null)}
        onWeging={handleWeging}
        gewichtWeegbrug={gewichtWeegbrug}
        gewichtLoods={gewichtLoods}
        serverVerbonden={serverVerbonden}
        bedrijfsnaam={bedrijfsnaam}
        mobiel
      />
      {toonInstellingen && (
        <MobieleInstellingen
          verbonden={serverVerbonden}
          onSluiten={() => setToonInstellingen(false)}
          onToegepast={pasServerToe}
        />
      )}
      {toast && <div className="toast mobile-toast">{toast}</div>}
    </>
  );
}
