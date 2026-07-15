const KANAAL = "weegstation-weegserver";

export function openWeegserverKanaal() {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(KANAAL);
}

export function maakWsProxy(kanaal, isVerbonden) {
  return {
    get readyState() {
      return isVerbonden() ? WebSocket.OPEN : WebSocket.CLOSED;
    },
    send(payload) {
      let bericht = payload;
      if (typeof payload === "string") {
        try { bericht = JSON.parse(payload); } catch { bericht = { raw: payload }; }
      }
      kanaal.postMessage({ type: "ws-send", payload: bericht });
    },
  };
}
