import { absoluteUrl } from "@/api/client";
import { escapeHtml } from "@/lib/format";
import { courseNameOf, type StudentRecord } from "@/screens/student/settings/types";

/**
 * The official student ID card, shared by the on-screen card and the PDF.
 * Same design as the website's StudentOfficialIDCard: a 320 x 520 card over the academy's template image,
 * the portrait in the top 250, then name, "STUDENT • course", ID and one extra line.
 */

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 520;
export const CARD_PHOTO_HEIGHT = 250;
export const CARD_DETAILS_TOP = 258;
export const CARD_RADIUS = 24;
/** The card's own colours: it is a printed document, so they do not follow the app theme */
export const CARD_BACKGROUND = "#121A36";
export const CARD_PHOTO_BACKGROUND = "#f1f5f9";
export const CARD_PHOTO_ICON = "#94a3b8";

export const CARD_FRONT_TEMPLATE = absoluteUrl("/teacher-id-template.png");
export const CARD_BACK_IMAGE = absoluteUrl("/teacher-id-back.png");

export type CardSide = "front" | "back";

export interface IdCardModel {
  fullName: string;
  designation: string;
  studentId: string;
  extraInfo: string;
  /** Full address of the portrait, or "" when the card shows the outline instead */
  photoUrl: string;
}

export function idCardModel(profile: StudentRecord): IdCardModel {
  const course = courseNameOf(profile);
  const guardian = profile.fatherName || profile.motherName;
  const extraInfo = guardian ? `Guardian: ${guardian}` : profile.teacherName ? `Teacher: ${profile.teacherName}` : profile.bloodGroup ? `Blood Group: ${profile.bloodGroup}` : "Fajr Academy Online";
  // A student without a photo: girls get the academy's default portrait, everyone else the outline
  const photo = profile.avatar || (profile.gender === "female" ? "/default-female.png" : "");
  return {
    fullName: (profile.fullName || "Student").toUpperCase(),
    designation: (course ? `STUDENT • ${course}` : "STUDENT").toUpperCase(),
    // Every student has an ID; the card falls back to one made from the record's own id
    studentId: profile.studentId || (profile._id ? `FJRS-${String(profile._id).slice(-4).toUpperCase()}` : "—"),
    extraInfo,
    photoUrl: photo ? absoluteUrl(photo) : "",
  };
}

/** The card is drawn larger in the PDF so it fills the page and prints sharply */
const PDF_SCALE = 1.4;

const USER_OUTLINE_SVG = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${CARD_PHOTO_ICON}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>`;

function frontHtml(model: IdCardModel, k: number): string {
  const px = (n: number) => `${Math.round(n * k * 100) / 100}px`;
  const photo = model.photoUrl
    ? `<img src="${escapeHtml(model.photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;" />`
    : USER_OUTLINE_SVG(Math.round(112 * k));
  const line = `margin:0;color:#ffffff;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;`;
  return `
  <div class="card">
    <img src="${escapeHtml(CARD_FRONT_TEMPLATE)}" alt="" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />
    <div style="position:absolute;left:0;top:0;right:0;height:${px(CARD_PHOTO_HEIGHT)};overflow:hidden;background:${CARD_PHOTO_BACKGROUND};display:flex;align-items:center;justify-content:center;">${photo}</div>
    <div style="position:absolute;left:0;right:0;top:${px(CARD_DETAILS_TOP)};bottom:0;padding:0 ${px(24)};text-align:center;">
      <h2 style="${line}-webkit-line-clamp:2;font-size:${px(21)};font-weight:900;line-height:1.25;letter-spacing:0.025em;text-transform:uppercase;text-shadow:0 2px 4px rgba(0,0,0,0.25);padding:0 ${px(4)};">${escapeHtml(model.fullName)}</h2>
      <p style="${line}-webkit-line-clamp:1;font-size:${px(12)};line-height:1.35;letter-spacing:0.1em;text-transform:uppercase;margin-top:${px(12)};">${escapeHtml(model.designation)}</p>
      <p style="${line}-webkit-line-clamp:1;font-size:${px(14)};line-height:1.4;letter-spacing:0.05em;margin-top:${px(16)};">ID: ${escapeHtml(model.studentId)}</p>
      <p style="${line}-webkit-line-clamp:1;font-size:${px(14)};line-height:1.4;letter-spacing:0.05em;margin-top:${px(4)};">${escapeHtml(model.extraInfo)}</p>
    </div>
  </div>`;
}

function backHtml(): string {
  return `
  <div class="card">
    <img src="${escapeHtml(CARD_BACK_IMAGE)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
  </div>`;
}

/** The card as a printable document: one side per page, centred */
export function idCardHtml(model: IdCardModel, sides: CardSide[]): string {
  const k = PDF_SCALE;
  const pages = sides.map((side) => `<section class="page">${side === "front" ? frontHtml(model, k) : backHtml()}</section>`).join("\n");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Student ID Card ${escapeHtml(model.studentId)}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #ffffff; font-family: 'Inter', 'Roboto', system-ui, -apple-system, sans-serif; }
  .page { padding-top: 40px; display: flex; justify-content: center; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .card { position: relative; flex: none; width: ${Math.round(CARD_WIDTH * k)}px; height: ${Math.round(CARD_HEIGHT * k)}px; border-radius: ${Math.round(CARD_RADIUS * k)}px; overflow: hidden; background: ${CARD_BACKGROUND}; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

export function idCardFileName(model: IdCardModel, side: CardSide): string {
  return `Student-ID-Card-${model.studentId}-${side.toUpperCase()}`;
}
