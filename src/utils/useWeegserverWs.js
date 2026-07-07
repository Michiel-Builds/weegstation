import { useEffect, useRef, useCallback, useState } from "react";
import { maakWeegserverWsUrl, magWeegserverVerbinden } from "./weegserver";

/**
 * Stabiele WebSocket — maximaal 1 verbinding, geen stapelen (1→2→3 actief).
 */
export function useWeegserverWs({ actief, ip, sleutel, onBericht, onVerbonden, onVerbroken }) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const generatieRef = useRef(0);
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

  const verbind = useCallback(() => {
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
      onVerbondenRef.current?.();
    };

    ws.onmessage = (e) => {
      if (mijnGeneratie !== generatieRef.current) return;
      try {
        onBerichtRef.current?.(JSON.parse(e.data));
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
      onVerbrokenRef.current?.();
      if (actief && sleutelRef.current?.trim()) {
        stopReconnect();
        reconnectTimer.current = setTimeout(() => {
          if (generatieRef.current === mijnGeneratie) verbind();
        }, 5000);
      }
    };
  }, [actief, stopReconnect, sluitSocket]);

  const sluit = useCallback(() => {
    generatieRef.current += 1;
    stopReconnect();
    sluitSocket(wsRef.current);
    wsRef.current = null;
    setVerbonden(false);
  }, [stopReconnect, sluitSocket]);

  useEffect(() => {
    if (actief && sleutelRef.current?.trim()) {
      verbind();
    } else {
      sluit();
    }
    return () => sluit();
  }, [actief, ip, sleutel, verbind, sluit]);

  return { wsRef, verbonden, sluit };
}
