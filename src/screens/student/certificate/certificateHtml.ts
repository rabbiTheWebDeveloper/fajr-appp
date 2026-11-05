import { CEO_NAME, DEFAULT_COURSE_NAME, duaText, enrollmentDate, longDate, parentPhrase, type Certificate } from "@/screens/student/certificate/helpers";
import { PT_TO_MM, buildPdfPage, serifTextWidth, svgCircle, svgLine, svgRect, svgText, wrapSerifText } from "@/screens/student/payments/pdfSvg";

/**
 * The downloadable certificate, rebuilt from the website's jsPDF code (student/certificate/page.tsx):
 * an A4 landscape page with the navy and gold frame, watermark, logo, title, the student's name,
 * the certifying sentence, the du'a, the details row, both signatures, the official seal and the issue date.
 */

const W = 297;
const H = 210;

const NAVY = "rgb(11,26,69)";
const GOLD = "rgb(180,150,60)";

/** Height / width of the images the certificate places (they are sized by width, like the website does) */
const LOGO_RATIO = 357 / 1024;
const MANAGEMENT_SIGNATURE_RATIO = 52 / 241;
const CEO_SIGNATURE_RATIO = 115 / 292;

export function buildCertificate(cert: Certificate): { html: string; fileName: string } {
  const cx = W / 2;
  const studentName = cert.studentName || "Student Name";
  const studentId = cert.studentId || "N/A";
  const courseName = cert.courseName || DEFAULT_COURSE_NAME;
  const parents = parentPhrase(cert);

  const body: string[] = [];

  // Frame: navy outer border, gold line inside it, thin inner accent
  body.push(svgRect(0, 0, W, H, { fill: "#ffffff" }));
  body.push(svgRect(6, 6, W - 12, H - 12, { stroke: NAVY, width: 4 }));
  body.push(svgRect(10, 10, W - 20, H - 20, { stroke: GOLD, width: 1 }));
  body.push(svgRect(13, 13, W - 26, H - 26, { stroke: "rgb(200,170,90)", width: 0.35 }));

  // Faint diagonal watermark
  body.push(svgText(cx, H / 2 + 10, "FAJR ACADEMY", { size: 72, bold: true, anchor: "middle", fill: NAVY, opacity: 0.035, transform: `rotate(-25 ${cx} ${H / 2 + 10})` }));

  // Corner ornaments
  const cs = 14;
  const co = 16;
  const corner = (x: number, y: number, dx: number, dy: number) => svgLine(x, y, x + dx * cs, y, GOLD, 1.2) + svgLine(x, y, x, y + dy * cs, GOLD, 1.2);
  body.push(corner(co, co, 1, 1), corner(W - co, co, -1, 1), corner(co, H - co, 1, -1), corner(W - co, H - co, -1, -1));

  // Logo, then the gold separator under it
  const logoW = 70;
  const logoH = LOGO_RATIO * logoW;
  const logoBottom = 16 + logoH + 1;
  body.push(svgLine(cx - 38, logoBottom + 7, cx + 38, logoBottom + 7, GOLD, 0.7));

  // Title
  const titleY = logoBottom + 14;
  body.push(svgText(cx, titleY, "THIS CERTIFICATE IS PRESENTED TO:", { size: 10, anchor: "middle", fill: GOLD }));
  body.push(svgText(cx, titleY + 11, "Certificate of Completion", { size: 30, bold: true, anchor: "middle", fill: NAVY }));
  body.push(svgLine(cx - 70, titleY + 14, cx + 70, titleY + 14, GOLD, 0.8));
  body.push(svgCircle(cx - 70, titleY + 14, 0.8, { fill: GOLD }), svgCircle(cx + 70, titleY + 14, 0.8, { fill: GOLD }), svgCircle(cx, titleY + 14, 0.8, { fill: GOLD }));

  // Student name with a gold underline as wide as the name
  const nameY = titleY + 24;
  const nameMax = 240;
  body.push(svgText(cx, nameY, studentName, { size: 26, bold: true, italic: true, anchor: "middle", fill: NAVY, maxWidth: nameMax }));
  const nameW = Math.min(serifTextWidth(studentName, 26, true), nameMax);
  body.push(svgLine(cx - nameW / 2 - 8, nameY + 2.5, cx + nameW / 2 + 8, nameY + 2.5, GOLD, 0.55));

  // The certifying sentence (two parts, each wrapped to 230 mm)
  const bodyY = nameY + 11;
  let sentence1 = `This certifies that ${studentName} (ID: ${studentId})`;
  if (parents) sentence1 += `, ${parents},`;
  const sentence2 = `has successfully completed the course in "${courseName}".`;
  const lines1 = wrapSerifText(sentence1, 230, 11.5);
  const lines2 = wrapSerifText(sentence2, 230, 11.5);
  const lineStep = 11.5 * 1.4 * PT_TO_MM;
  const paragraph = (lines: string[], y: number) => lines.map((line, index) => svgText(cx, y + index * lineStep, line, { size: 11.5, anchor: "middle", fill: "rgb(50,50,50)", maxWidth: 255 })).join("");
  body.push(paragraph(lines1, bodyY));
  const line2Y = bodyY + lines1.length * 6;
  body.push(paragraph(lines2, line2Y));

  // Du'a
  const duaY = line2Y + lines2.length * 6 + 3;
  body.push(svgText(cx, duaY, duaText(cert), { size: 10.5, bold: true, italic: true, anchor: "middle", fill: "rgb(160,120,50)" }));

  // Details row between two hairlines
  const metaTopY = duaY + 7;
  const hairline = "rgb(200,200,200)";
  const metaFill = "rgb(90,90,90)";
  body.push(svgLine(20, metaTopY, W - 20, metaTopY, hairline, 0.25));
  body.push(svgText(25, metaTopY + 6, `Student ID: ${studentId}`, { size: 9, font: "helvetica", fill: metaFill, maxWidth: 62 }));
  body.push(svgText(cx, metaTopY + 6, `Course: ${courseName}`, { size: 9, font: "helvetica", anchor: "middle", fill: metaFill, maxWidth: 110 }));
  body.push(svgText(W - 25, metaTopY + 6, `Enrollment Date: ${enrollmentDate(cert)}`, { size: 9, font: "helvetica", anchor: "end", fill: metaFill }));
  body.push(svgLine(20, metaTopY + 9, W - 20, metaTopY + 9, hairline, 0.25));

  // Signatures and the seal
  const sigY = metaTopY + 18;
  const signLine = "rgb(150,150,150)";

  const mgmtW = 40;
  const mgmtH = MANAGEMENT_SIGNATURE_RATIO * mgmtW;
  body.push(svgLine(22, sigY + 14, 90, sigY + 14, signLine, 0.4));
  body.push(svgText(56, sigY + 19, "ACADEMY MANAGEMENT", { size: 9, bold: true, anchor: "middle", fill: NAVY }));
  body.push(svgText(56, sigY + 24, "Fajr Academy", { size: 8, anchor: "middle", fill: "rgb(130,130,130)" }));

  // The seal lettering is kept inside the inner ring whatever serif face the phone prints with
  body.push(svgCircle(cx, sigY + 9, 13, { stroke: GOLD, width: 0.9 }), svgCircle(cx, sigY + 9, 10, { stroke: GOLD, width: 0.4 }));
  body.push(svgText(cx, sigY + 7, "FAJR ACADEMY", { size: 7, bold: true, anchor: "middle", fill: GOLD, maxWidth: 17.5 }));
  body.push(svgText(cx, sigY + 11, "OFFICIAL SEAL", { size: 7, bold: true, anchor: "middle", fill: GOLD, maxWidth: 17.5 }));

  const ceoW = 45;
  const ceoH = CEO_SIGNATURE_RATIO * ceoW;
  body.push(svgLine(W - 110, sigY + 14, W - 22, sigY + 14, signLine, 0.4));
  body.push(svgText(W - 66, sigY + 19, CEO_NAME.toUpperCase(), { size: 8.5, bold: true, anchor: "middle", fill: NAVY, maxWidth: 88 }));
  body.push(svgText(W - 66, sigY + 24, "CEO, FAJR ACADEMY", { size: 8, bold: true, anchor: "middle", fill: GOLD }));

  // Date of issue (the day the PDF is made) over the bottom ornament line
  body.push(svgLine(cx - 55, H - 19, cx + 55, H - 19, GOLD, 0.7));
  body.push(svgText(cx, H - 16, `Date of Issue: ${longDate(new Date())}`, { size: 8.5, anchor: "middle", fill: "rgb(100,100,100)" }));

  const html = buildPdfPage({
    title: `${studentName} Certificate`,
    width: W,
    height: H,
    // Just under the full page width so rounding can never push the frame onto a second page
    widthPercent: 99,
    topPercent: 0.2,
    images: [
      { path: "/fajr-horizontal-logo.png", x: cx - logoW / 2, y: 16, width: logoW, height: logoH },
      { path: "/management-signature.png", x: 56 - mgmtW / 2, y: sigY - mgmtH + 12, width: mgmtW, height: mgmtH },
      { path: "/ceo-signature-stroke.png", x: W - 110 + (68 - ceoW) / 2, y: sigY - ceoH + 12, width: ceoW, height: ceoH },
    ],
    body: body.join(""),
  });

  return { html, fileName: `${studentName.replace(/\s+/g, "_")}_Certificate.pdf` };
}
