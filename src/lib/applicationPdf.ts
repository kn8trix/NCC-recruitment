import { segments } from "../data/segments";

export type PdfApplication = {
  id: string;
  fields: {
    fullName: string;
    studentId: string;
    department: string;
    whatsapp: string;
    email: string;
  };
  segments: string[];
  photoUrl: string;
  xp: number;
};

type ImageDataUrlLoader = (path: string) => Promise<string>;

export async function createApplicationPdf(
  application: PdfApplication,
  loadImageDataUrl: ImageDataUrlLoader,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const logoDataUrl = await loadImageDataUrl("/images/ncc-logo.png");
  const selectedSegments = application.segments.map((name) => ({
    name,
    segment: segments.find((item) => item.name === name),
  }));

  doc.setFillColor(36, 29, 35);
  doc.rect(0, 0, pageWidth, 43, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 8, 27, 27, 2, 2, "F");
  doc.addImage(logoDataUrl, "PNG", margin + 2, 10, 23, 23);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NITER COMPUTER CLUB", margin + 34, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 214, 218);
  doc.text("OFFICIAL RECRUITMENT APPLICATION · SESSION 2026", margin + 34, 25);
  doc.setTextColor(165, 230, 181);
  doc.setFont("helvetica", "bold");
  doc.text(`APPLICATION  ${application.id.slice(0, 8).toUpperCase()}`, margin + 34, 33);
  const photoFormat = application.photoUrl.startsWith("data:image/png") ? "PNG" : "JPEG";

  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.07 }));
  doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - 39, 111, 78, 78);
  doc.restoreGraphicsState();

  doc.setFillColor(239, 233, 237);
  doc.roundedRect(margin, 51, contentWidth, 11, 1.5, 1.5, "F");
  doc.setTextColor(55, 43, 53);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("APPLICANT INFORMATION", margin + 4, 58.5);
  doc.setTextColor(90, 76, 87);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("APPLICATION DETAILS", pageWidth - margin - 4, 58.5, { align: "right" });

  const photoWidth = 43;
  const photoHeight = 57;
  const photoX = pageWidth - margin - photoWidth;
  const photoY = 79;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(213, 205, 210);
  doc.roundedRect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2, 1.5, 1.5, "FD");
  doc.addImage(application.photoUrl, photoFormat, photoX, photoY, photoWidth, photoHeight);

  const detailRows = [
    ["Application Number", `NCC-${application.id.slice(0, 8).toUpperCase()}`],
    ["Full Name", application.fields.fullName],
    ["Student ID", application.fields.studentId],
    ["Department", application.fields.department],
    ["WhatsApp Number", application.fields.whatsapp],
    ["Email Address", application.fields.email],
    ["Application Date", new Date().toISOString().slice(0, 10)],
    ["Submitted On", new Date().toLocaleString()],
  ];
  const labelX = margin + 4;
  const valueX = margin + 49;
  const detailStartY = 70;
  const detailRowHeight = 9;
  const detailEndX = photoX - 5;

  detailRows.forEach(([label, value], index) => {
    const y = detailStartY + index * detailRowHeight;
    doc.setTextColor(45, 43, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${label}:`, labelX, y);
    doc.setTextColor(48, 46, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const valueLines = doc.splitTextToSize(value, detailEndX - valueX);
    doc.text(valueLines.slice(0, 1), valueX, y);
    if (index < detailRows.length - 1) {
      doc.setDrawColor(224, 220, 222);
      doc.setLineWidth(0.25);
      doc.line(labelX, y + 3, detailEndX, y + 3);
    }
  });

  doc.setFillColor(231, 242, 234);
  doc.roundedRect(margin, 151, contentWidth, 11, 1.5, 1.5, "F");
  doc.setTextColor(45, 94, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SELECTED SEGMENTS", margin + 4, 158.5);
  doc.setTextColor(75, 101, 81);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`${selectedSegments.length} selected`, pageWidth - margin - 4, 158.5, { align: "right" });

  const listTop = 169;
  const rowHeight = selectedSegments.length > 7 ? 14.5 : 16.5;
  selectedSegments.forEach(({ name, segment }, index) => {
    const y = listTop + index * rowHeight;
    const number = String(index + 1).padStart(2, "0");
    const title = segment?.name ?? name;

    doc.setFillColor(231, 242, 234);
    doc.circle(margin + 5, y + 2.5, 3.4, "F");
    doc.setTextColor(45, 94, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(number, margin + 5, y + 3.4, { align: "center" });

    doc.setTextColor(36, 29, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin + 13, y + 2);

    if (segment) {
      doc.setTextColor(91, 82, 89);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(segment.short, margin + 13, y + 7);
    }

    if (index < selectedSegments.length - 1) {
      doc.setDrawColor(222, 218, 221);
      doc.setLineWidth(0.25);
      doc.line(margin + 13, y + rowHeight - 1.5, pageWidth - margin, y + rowHeight - 1.5);
    }
  });

  const footerY = 286;
  doc.setDrawColor(205, 205, 205);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(135, 135, 135);
  doc.text("NITER Computer Club · Member Recruitment 2026", pageWidth / 2, footerY + 5, {
    align: "center",
  });

  return doc;
}
