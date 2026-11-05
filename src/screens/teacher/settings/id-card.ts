import { absoluteUrl } from "@/api/client";
import { escapeHtml } from "@/lib/format";

import type { TeacherProfileData } from "@/screens/teacher/settings/types";

export type CardSide = "front" | "back";

/** The website draws the card at 320 x 520; every measure below is a share of that */
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 520;
export const CARD_BACKGROUND = "#121A36";

/** The artwork the website's card uses from its public folder */
export const CARD_TEMPLATE_URL = absoluteUrl("/teacher-id-template.png");
export const CARD_BACK_URL = absoluteUrl("/teacher-id-back.png");

export interface IdCardFields {
  fullName: string;
  designation: string;
  idNumber: string;
  bloodGroup: string;
  /** "" when the teacher has no photo (the card then shows a person outline) */
  photoUrl: string;
  /** Name size on the 320-wide card: long names are set smaller */
  nameSize: number;
}

/** What the front of the card prints, with the same fallbacks as the website's card */
export function idCardFields(profile: TeacherProfileData | null): IdCardFields {
  const fullName = (profile?.fullName || "OFFICIAL NAME").toUpperCase();
  const designation = (profile?.designation || (profile?.role ? profile.role.replace("-", " ") : "ADMINISTRATOR")).toUpperCase();
  const idNumber = profile?.employeeId || profile?.teacherId || profile?.staffId || profile?.adminId || (profile?._id ? `FJRA-${String(profile._id).slice(-4).toUpperCase()}` : "FJRA-0001");
  return {
    fullName,
    designation,
    idNumber,
    bloodGroup: profile?.bloodGroup || "A+",
    photoUrl: profile?.avatar ? absoluteUrl(profile.avatar) : "",
    nameSize: fullName.length > 25 ? 19 : fullName.length > 17 ? 14 : 21,
  };
}

/** The file name of an exported side, as the website names its downloads */
export function idCardFileName(profile: TeacherProfileData | null, side: CardSide): string {
  return `ID-Card-${profile?.teacherId || "Teacher"}-${side.toUpperCase()}`;
}

/**
 * One side of the card as a printable page (turned into a PDF and shared).
 * The card is drawn larger than on screen so it prints crisply; the layout is the website's, scaled.
 */
export function idCardHtml(profile: TeacherProfileData | null, side: CardSide): string {
  const k = 1.4;
  const px = (n: number) => `${Math.round(n * k * 10) / 10}px`;
  const f = idCardFields(profile);
  const shadow = "text-shadow:0 1px 3px rgba(0,0,0,0.45);";
  const line = `color:#ffffff;font-weight:700;margin:0;${shadow}`;

  const portrait = f.photoUrl
    ? `<img src="${escapeHtml(f.photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;" />`
    : `<svg width="${px(112)}" height="${px(112)}" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>`;

  const front = `
    <img src="${CARD_TEMPLATE_URL}" alt="" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />
    <div style="position:absolute;left:0;top:0;right:0;height:${px(250)};overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">${portrait}</div>
    <div style="position:absolute;left:0;right:0;top:${px(258)};bottom:0;padding:0 ${px(16)};text-align:center;">
      <p style="${line}font-weight:900;font-size:${px(f.nameSize)};line-height:1.25;letter-spacing:0.02em;white-space:nowrap;overflow:hidden;">${escapeHtml(f.fullName)}</p>
      <p style="${line}font-size:${px(13)};letter-spacing:0.1em;margin-top:${px(12)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(f.designation)}</p>
      <p style="${line}font-size:${px(14.5)};letter-spacing:0.05em;margin-top:${px(16)};">ID: ${escapeHtml(f.idNumber)}</p>
      <p style="${line}font-size:${px(14.5)};letter-spacing:0.05em;margin-top:${px(4)};">Blood Group: ${escapeHtml(f.bloodGroup)}</p>
    </div>`;

  const back = `<img src="${CARD_BACK_URL}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { display: flex; flex-direction: column; align-items: center; padding-top: 40px; }
  .card { position: relative; width: ${px(CARD_WIDTH)}; height: ${px(CARD_HEIGHT)}; border-radius: ${px(24)}; overflow: hidden; background: ${CARD_BACKGROUND}; }
</style>
</head>
<body>
  <div class="page">
    <div class="card">${side === "front" ? front : back}</div>
  </div>
</body>
</html>`;
}
