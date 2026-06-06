import { useState, useRef } from "react";
import { parseNewtonXML } from "../utils/helpers";

export default function XMLImport({ onImport }) {
  const [drag, setDrag]     = useState(false);
  const [log, setLog]       = useState([]);
  const [succes, setSucces] = useState(null);
  const fileRef             = useRef();

  function addLog(type, tekst) {
    const tijd = new Date().toLocaleTimeString("nl-NL");
    setLog(prev => [{ type, tekst, tijd }, ...prev].slice(0, 30));
  }

  function verwerkBestand(file) {
    if (!file) return;
    if (!file.name.endsWith(".xml")) {
      addLog("err", `${file.name} — geen XML`);
      return;
    }
    addLog("ok", `Bestand geladen: ${file.name}`);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wegingen = parseNewtonXML(e.target.result);
        addLog("ok", `${wegingen.length} weging(en) ingelezen`);
        setSucces(wegingen.length);
        onImport(wegingen);
      } catch (err) {
        addLog("err", `Fout: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <div className="xml-wrap">
        <div>
          <div
            className={`dropzone${drag ? " drag" : ""}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); verwerkBestand(e.dataTransfer.files[0]); }}
          >
            <div className="dropzone-icon">📂</div>
            <div className="dropzone-title">Sleep een XML-bestand hierheen</div>
            <div className="dropzone-sub">of klik om te bladeren</div>
            <input
              ref={fileRef}
              className="file-input"
              type="file"
              accept=".xml"
              onChange={e => verwerkBestand(e.target.files[0])}
            />
          </div>
          {succes && (
            <div className="import-success">✓ {succes} weging(en) ingeladen</div>
          )}
        </div>
        <div className="xml-log">
          <div className="xml-log-title">Import log</div>
          {log.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Nog geen activiteit...</div>
          )}
          {log.map((l, i) => (
            <div key={i} className="log-line">
              <span className="log-time">{l.tijd}</span>
              <span className={l.type === "ok" ? "log-ok" : "log-err"}>{l.tekst}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}