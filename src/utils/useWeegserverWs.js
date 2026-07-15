import { useEffect, useRef, useCallback, useState } from "react";
import { maakWeegserverWsUrl, magWeegserverVerbinden } from "./weegserver";
import { openWeegserverKanaal, maakWsProxy } from "./weegserverBroadcast";

/**
 * WebSocket naar weegserver.
 * modus "eigenaar" = 1 verbinding (dashboard) — stuurt door naar andere vensters.
 * modus "volger" = geen eigen WS (wegen-venster) — deelt verbinding van eigenaar.
 */
export function useWeegserverWs({
  actief,
  ip,
  sleutel,
  onBericht,
  onVerbonden,
  onVerbroken,
  modus = "eigenaar",
}) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const generatieRef = useRef(0);
  const kanaalRef = useRef(null);
  const snapshotRef = useRef({ weegbrug: null, loods: null, stoplicht: null });
  const ipRef = useRef(ip);
  const sleutelRef = useRef(sleutel);
  const onBerichtRef = useRef(onBericht);
  const onVerbondenRef = useRef(onVerbonden);
  const onVerbrokenRef = useRef(onVerbroken);

  ipRef.current = ip;
  sleutelRef.current = sleutel;
  onBerichtRef.current = onBericht;
  onVerbondenRef.current = onVerbonden;
  onVerbrokenRef.current = onVerbroken;

  const [verbonden, setVerbonden] = useState(false);

  const stopReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const sluitSocket = useCallback((ws) => {
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try { ws.close(); } catch {}
    }
  }, []);

  const stuurNaarVolgers = useCallback((bericht) => {
    try {
      kanaalRef.current?.postMessage(bericht);
    } catch {}
  }, []);

  const werkSnapshotBij = useCallback((data) => {
    if (!data || !data.type) return;
    if (data.type === "init") {
      if (data.weegbrug !== null && data.weegbrug !== undefined) snapshotRef.current.weegbrug = data.weegbrug;
      if (data.loods !== null && data.loods !== undefined) snapshotRef.current.loods = data.loods;
      if (data.stoplicht) snapshotRef.current.stoplicht = data.stoplicht;
    }
    if (data.type === "gewicht_weegbrug") snapshotRef.current.weegbrug = data.gewicht;
    if (data.type === "gewicht_loods") snapshotRef.current.loods = data.gewicht;
    if (data.type === "stoplicht") snapshotRef.current.stoplicht = { kleur: data.kleur, enabled: data.enabled };
  }, []);

  const verbind = useCallback(() => {
    if (modus !== "eigenaar") return;
    if (!actief || !sleutelRef.current?.trim()) return;
    if (!magWeegserverVerbinden()) return;

    stopReconnect();
    generatieRef.current += 1;
    const mijnGeneratie = generatieRef.current;

    sluitSocket(wsRef.current);
    wsRef.current = null;
    setVerbonden(false);

    let ws;
    try {
      ws = new WebSocket(maakWeegserverWsUrl(ipRef.current, sleutelRef.current));
    } catch (e) {
      console.error("WebSocket constructie fout:", e);
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (mijnGeneratie !== generatieRef.current) return;
      setVerbonden(true);
      stuurNaarVolgers({ type: "status", verbonden: true });
      onVerbondenRef.current?.();
    };

    ws.onmessage = (e) => {
      if (mijnGeneratie !== generatieRef.current) return;
      try {
        const data = JSON.parse(e.data);
        werkSnapshotBij(data);
        stuurNaarVolgers({ type: "bericht", data });
        onBerichtRef.current?.(data);
      } catch (err) {
        console.error("WebSocket bericht fout:", err);
      }
    };

    ws.onerror = () => {
      if (mijnGeneratie !== generatieRef.current) return;
      setVerbonden(false);
    };

    ws.onclose = () => {
      if (mijnGeneratie !== generatieRef.current) return;
      setVerbonden(false);
      wsRef.current = null;
      stuurNaarVolgers({ type: "status", verbonden: false });
      onVerbrokenRef.current?.();
      if (actief && sleutelRef.current?.trim()) {
        stopReconnect();
        reconnectTimer.current = setTimeout(() => {
          if (generatieRef.current === mijnGeneratie) verbind();
        }, 5000);
      }
    };
  }, [actief, modus, stopReconnect, sluitSocket, stuurNaarVolgers, werkSnapshotBij]);

  const sluit = useCallback(() => {
    if (modus !== "eigenaar") return;
    generatieRef.current += 1;
    stopReconnect();
    sluitSocket(wsRef.current);
    wsRef.current = null;
    setVerbonden(false);
    stuurNaarVolgers({ type: "status", verbonden: false });
  }, [modus, stopReconnect, sluitSocket, stuurNaarVolgers]);

  useEffect(() => {
    if (modus !== "eigenaar") return;
    const kanaal = openWeegserverKanaal();
    if (!kanaal) return;
    kanaalRef.current = kanaal;

    kanaal.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === "ws-send" && wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(msg.payload));
        } catch {}
      }
      if (msg.type === "vraag-snapshot") {
        kanaal.postMessage({
          type: "snapshot",
          verbonden: wsRef.current?.readyState === WebSocket.OPEN,
          ...snapshotRef.current,
        });
      }
    };

    return () => {
      kanaal.close();
      kanaalRef.current = null;
    };
  }, [modus]);

  useEffect(() => {
    if (modus !== "eigenaar") return;
    if (actief && sleutelRef.current?.trim()) {
      verbind();
    } else {
      sluit();
    }
    return () => sluit();
  }, [modus, actief, ip, sleutel, verbind, sluit]);

  useEffect(() => {
    if (modus !== "volger" || !actief) {
      wsRef.current = null;
      setVerbonden(false);
      return;
    }

    const kanaal = openWeegserverKanaal();
    if (!kanaal) return;

    let verbondenNu = false;
    const proxy = maakWsProxy(kanaal, () => verbondenNu);
    wsRef.current = proxy;

    kanaal.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === "bericht" && msg.data) {
        onBerichtRef.current?.(msg.data);
      }
      if (msg.type === "status") {
        verbondenNu = !!msg.verbonden;
        setVerbonden(verbondenNu);
        if (msg.verbonden) onVerbondenRef.current?.();
        else onVerbrokenRef.current?.();
      }
      if (msg.type === "snapshot") {
        verbondenNu = !!msg.verbonden;
        setVerbonden(verbondenNu);
        if (msg.weegbrug !== null && msg.weegbrug !== undefined) {
          onBerichtRef.current?.({ type: "gewicht_weegbrug", gewicht: msg.weegbrug });
        }
        if (msg.loods !== null && msg.loods !== undefined) {
          onBerichtRef.current?.({ type: "gewicht_loods", gewicht: msg.loods });
        }
        if (msg.stoplicht) {
          onBerichtRef.current?.({ type: "stoplicht", kleur: msg.stoplicht.kleur, enabled: msg.stoplicht.enabled });
        }
      }
    };

    kanaal.postMessage({ type: "vraag-snapshot" });

    return () => {
      kanaal.close();
      wsRef.current = null;
      setVerbonden(false);
    };
  }, [modus, actief]);

  return { wsRef, verbonden, sluit };
}
