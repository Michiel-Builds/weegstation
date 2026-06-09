import { useMemo } from "react";
import { bouwVoorbeeldVelden, getVoorbeeldPagina, getVoorbeeldPdf } from "../utils/formulierPrint";
import { OFFICIEEL_A4 } from "../data/formulierPosities";

const SCHaal = 0.52;

export default function FormulierVoorbeeld({ formType, data, kalibratie }) {
  const pagina = getVoorbeeldPagina(formType);
  const pdfUrl = getVoorbeeldPdf(formType);
  const veldenHtml = useMemo(
    () => bouwVoorbeeldVelden(formType, data, kalibratie),
    [formType, data, kalibratie]
  );

  if (formType === "annex7") return null;
  if (!pdfUrl) {
    return (
      <div className="form-voorbeeld-wrap">
        <div className="form-voorbeeld-titel">Voorbeeld — standaard CMR layout</div>
        <p className="form-voorbeeld-hint">CMR gebruikt het standaard 24-vakken raster. Kalibreer met de testprint op uw Beurtvaartadres CMR-formulier.</p>
      </div>
    );
  }

  return (
    <div className="form-voorbeeld-wrap">
      <div className="form-voorbeeld-titel">Voorbeeld — officiële layout (LMA / Beurtvaartadres)</div>
      <div className="form-voorbeeld-scaler" style={{ transform: `scale(${SCHaal})`, transformOrigin: "top left" }}>
        <div
          className="form-voorbeeld-pagina"
          style={{ width: `${OFFICIEEL_A4.breedte}mm`, height: `${OFFICIEEL_A4.hoogte}mm` }}
        >
          <iframe
            className="form-voorbeeld-pdf"
            src={`${pdfUrl}#page=1&view=Fit`}
            title="Officieel formulier"
          />
          <div
            className="form-voorbeeld-overlay"
            dangerouslySetInnerHTML={{ __html: veldenHtml }}
          />
        </div>
      </div>
      <p className="form-voorbeeld-hint">
        Officieel formulier {pagina.breedte}×{pagina.hoogte} mm. Print op voorbedruk schaalt naar 240 mm breed (Beurtvaartadres matrix).
      </p>
    </div>
  );
}
