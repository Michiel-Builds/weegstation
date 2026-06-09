import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function fmt(n) {
  return Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtI(n) {
  return Number(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 });
}

export function exporteerBonNaarPdf({ bonnummer, klant, klantType, regels, totaalKg, totaalEuro }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 18;

  // === KOP ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(46, 125, 50); // var(--accent)
  doc.text("Metaalrecycling Bulters", pageW / 2, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Bulters B.V. · Dit document is automatisch gegenereerd", pageW / 2, y, { align: "center" });

  // === BON-NUMMER + DATUM ===
  y += 12;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text("Bon " + bonnummer, margin, y);

  const datum = new Date().toLocaleDateString("nl-NL");
  const tijd = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(datum + "  ·  " + tijd, pageW - margin, y, { align: "right" });

  // === KLANTGEGEVENS ===
  y += 8;
  doc.setFillColor(249, 249, 249);
  doc.rect(margin, y, pageW - 2 * margin, klantType === "bedrijf" ? 38 : 32, "F");

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text((klantType === "bedrijf" ? "BEDRIJF" : "PARTICULIER").toUpperCase(), margin + 3, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  if (klantType === "bedrijf") {
    doc.text(klant.bedrijf || "—", margin + 3, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    if (klant.contactpersoon) { doc.text("T.a.v. " + klant.contactpersoon, margin + 3, y); y += 4; }
    if (klant.adres || klant.plaats) {
      doc.text([klant.adres, klant.postcode, klant.plaats].filter(Boolean).join(", "), margin + 3, y);
      y += 4;
    }
    if (klant.btw) { doc.text("BTW: " + klant.btw, margin + 3, y); y += 4; }
    if (klant.kvk) { doc.text("KvK: " + klant.kvk, margin + 3, y); y += 4; }
    if (klant.email) { doc.text(klant.email, margin + 3, y); }
  } else {
    doc.text(klant.naam || "—", margin + 3, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    if (klant.adres || klant.plaats) {
      doc.text([klant.adres, klant.plaats].filter(Boolean).join(", "), margin + 3, y);
      y += 4;
    }
    if (klant.telefoon) { doc.text("Tel: " + klant.telefoon, margin + 3, y); y += 4; }
    if (klant.email) { doc.text(klant.email, margin + 3, y); y += 4; }
    if (klant.legitimatieType && klant.legitimatieNummer) {
      doc.setTextColor(20);
      doc.setFont("helvetica", "bold");
      doc.text(klant.legitimatieType + ": " + klant.legitimatieNummer, margin + 3, y);
    }
  }

  y = Math.max(y, 60) + 8;

  // === TABEL ===
  const tableData = regels.map((r, i) => [
    String(i + 1),
    r.materiaal?.naam || r.materiaal || "—",
    r.kenteken || "—",
    fmtI(r.totaal || r.gewicht) + " kg",
    "€ " + fmt(r.prijs) + "/kg",
    "€ " + fmt(r.totaal || (r.gewicht * r.prijs)),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Materiaal", "Kenteken", "Gewicht", "Prijs/kg", "Bedrag"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [46, 125, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: 40 },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    foot: [[
      { content: "TOTAAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtI(totaalKg) + " kg", styles: { halign: "right", fontStyle: "bold" } },
      { content: "", styles: { halign: "right" } },
      { content: "€ " + fmt(totaalEuro), styles: { halign: "right", fontStyle: "bold", textColor: [46, 125, 50] } },
    ]],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: 20,
    },
  });

  // === HANDTEKENING ===
  const finalY = doc.lastAutoTable.finalY + 25;
  doc.setDrawColor(150);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, finalY, pageW - margin, finalY);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Voor akkoord:", margin, finalY + 6);

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin + 25, finalY + 18, pageW - margin, finalY + 18);

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("Handtekening klant", margin + 25, finalY + 22);

  // === FOOTER ===
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Bulters Weegsysteem · Metaalrecycling Bulters · Bon " + bonnummer + " · " + new Date().toLocaleString("nl-NL"),
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  // === DOWNLOAD ===
  const bestandsnaam = "Bon-" + bonnummer + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
  doc.save(bestandsnaam);
  return bestandsnaam;
}
