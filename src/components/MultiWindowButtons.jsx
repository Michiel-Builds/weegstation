export default function MultiWindowButtons() {
  function openVenster(naam) {
    const fn = window.electronAPI && window.electronAPI[naam];
    if (fn) {
      fn();
      return;
    }
    // Fallback voor dev in browser
    const h = naam === "openBonVenster" ? "bon" : "wegen";
    window.open(window.location.pathname + "#/" + h, "_blank", "width=1100,height=850");
  }

  return (
    <>
      <button
        className="btn-open-mw"
        onClick={() => openVenster("openBonVenster")}
        title="Open bon in apart venster"
      >📄 Bon-venster</button>
      <button
        className="btn-open-mw"
        onClick={() => openVenster("openWegenVenster")}
        title="Open wegen in apart venster"
      >⚖ Wegen-venster</button>
    </>
  );
}
