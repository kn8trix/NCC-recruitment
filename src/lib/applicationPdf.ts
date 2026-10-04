import { segments } from "../data/segments";

export type PdfApplication = {
  id: string;
  fields: {
    fullName: string;
    studentId: string;
    department: string;
    whatsapp: string;
    email: string;
    priorKnowledgeExperience: string;
    whyJoinNcc: string;
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
  const logoProperties = doc.getImageProperties(logoDataUrl);
  const logoAspectRatio = logoProperties.height / logoProperties.width;
  const selectedSegments = application.segments.map((name) => ({
    name,
    segment: segments.find((item) => item.name === name),
  }));

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(205, 205, 205);
  doc.roundedRect(margin, 8, 27, 27, 2, 2, "FD");
  const headerLogoHeight = 22;
  const headerLogoWidth = headerLogoHeight / logoAspectRatio;
  doc.addImage(
    logoDataUrl,
    "PNG",
    margin + (27 - headerLogoWidth) / 2,
    8 + (27 - headerLogoHeight) / 2,
    headerLogoWidth,
    headerLogoHeight,
  );
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NITER COMPUTER CLUB", margin + 34, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("OFFICIAL RECRUITMENT APPLICATION · SESSION 2026", margin + 34, 25);
  doc.setTextColor(55, 55, 55);
  doc.setFont("helvetica", "bold");
  doc.text(`APPLICATION  ${application.id.slice(0, 8).toUpperCase()}`, margin + 34, 33);
  const photoFormat = application.photoUrl.startsWith("data:image/png") ? "PNG" : "JPEG";

  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.07 }));
  const watermarkWidth = 72;
  const watermarkHeight = watermarkWidth * logoAspectRatio;
  doc.addImage(
    logoDataUrl,
    "PNG",
    (pageWidth - watermarkWidth) / 2,
    (297 - watermarkHeight) / 2,
    watermarkWidth,
    watermarkHeight,
  );
  doc.restoreGraphicsState();

  doc.setDrawColor(255, 255, 255);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("APPLICANT INFORMATION", margin + 4, 58.5);

  const photoWidth = 43;
  const photoHeight = 57;
  const photoX = pageWidth - margin - photoWidth;
  const photoY = 79;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(190, 190, 190);
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
  ];
  const labelX = margin + 4;
  const valueX = margin + 49;
  const detailStartY = 70;
  const detailRowHeight = 9;
  const detailEndX = photoX - 5;

  detailRows.forEach(([label, value], index) => {
    const y = detailStartY + index * detailRowHeight;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${label}:`, labelX, y);
    doc.setTextColor(45, 45, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const valueLines = doc.splitTextToSize(value, detailEndX - valueX);
    doc.text(valueLines.slice(0, 1), valueX, y);
    if (index < detailRows.length - 1) {
      doc.setDrawColor(195, 195, 195);
      doc.setLineWidth(0.25);
      doc.line(labelX, y + 3, detailEndX, y + 3);
    }
  });

  doc.setDrawColor(255, 255, 255);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SELECTED SEGMENTS", margin + 4, 158.5);
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${selectedSegments.length} selected`, pageWidth - margin - 4, 158.5, { align: "right" });

  const segmentNames = selectedSegments.map(({ name, segment }) => segment?.name ?? name);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 45);
  const segmentLines = doc.splitTextToSize(segmentNames.join(" · "), contentWidth);
  const segmentStartY = 165;
  const segmentLineHeight = 3.2;
  doc.text(segmentLines, margin + 4, segmentStartY);

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

  const responses: [string, string][] = [
    ["Prior Knowledge & Experience", application.fields.priorKnowledgeExperience] as [string, string],
    ["Why Join NITER Computer Club?", application.fields.whyJoinNcc] as [string, string],
  ].filter(([, value]) => value.trim());

  if (responses.length) {
    const responseStartY = segmentStartY + segmentLines.length * segmentLineHeight + 5;
    const responseLimitY = footerY - 7;
    const responseLayouts = responses.map(([heading, value]) => ({
      heading,
      lines: [] as string[],
      value: value.trim(),
    }));
    let responseFontSize = 7;

    for (let fontSize = 7; fontSize >= 3.5; fontSize -= 0.5) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const layouts = responseLayouts.map((response) => ({
        ...response,
        lines: doc.splitTextToSize(response.value, contentWidth),
      }));
      const lineHeight = fontSize * 0.42;
      const requiredHeight = layouts.reduce(
        (height, response) => height + 4.5 + response.lines.length * lineHeight + 3,
        0,
      );
      if (requiredHeight <= responseLimitY - responseStartY) {
        responseFontSize = fontSize;
        responseLayouts.splice(0, responseLayouts.length, ...layouts);
        break;
      }
      if (fontSize === 3.5) {
        throw new Error("The application responses do not fit on a single page.");
      }
    }

    let responseY = responseStartY;
    const responseLineHeight = responseFontSize * 0.42;
    for (const response of responseLayouts) {
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(response.heading, margin + 4, responseY);
      responseY += 4.5;

      doc.setTextColor(45, 45, 45);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(responseFontSize);
      doc.text(response.lines, margin + 4, responseY, { lineHeightFactor: 1.05 });
      responseY += response.lines.length * responseLineHeight + 3;
    }
  }

  return doc;
}
