// The student's monthly lesson summary as a PDF: academy logo at the top, a table of the month's lessons, and a closing
// section signed off by the Head of Curriculum.
// The website draws this document with jsPDF and pictures Bengali / Arabic text through a canvas. The app writes the
// same document as HTML and lets the phone's PDF renderer print it: that renderer shapes every script itself.
import { Image } from "react-native";

import { absoluteUrl } from "@/api/client";
import { shareHtmlAsPdf } from "@/lib/files";
import { MONTH_NAMES, escapeHtml } from "@/lib/format";
import {
  classTypeLabel,
  conductedAt,
  formatLongDate,
  formatMinutes,
  formatTimeOfDay,
  formatWeekdayDate,
  monthLabel,
  sessionMinutes,
  summariseSessions,
  type HistorySession,
} from "@/screens/student/classes/class-history-utils";

export interface LessonSummaryInput {
  student: { fullName?: string; studentId?: string } | null;
  /** "YYYY-MM" */
  month: string;
  /** The month's completed classes, in any order */
  sessions: HistorySession[];
  generatedAt: Date;
}

/**
 * Who signs the summary. A handwritten signature shows above the name once the picture exists on the site at
 * /araf-signature.png; until it does the summary has a blank line to sign on.
 */
export const SIGNATORY = {
  name: "Araf",
  title: "Head of Curriculum",
  organisation: "Fajr Academy",
  signatureUrl: "/araf-signature.png",
} as const;

const LOGO_URLS = ["/mainlogo.png", "/fajr-logo.png", "/logo.png", "/fajr-academy-logo.png"];

/**
 * The website crops the logo to its visible part with a canvas before placing it. There is no canvas here, so the
 * visible box of the site's logo file (1262 x 440) is written down; a logo of any other size is placed whole.
 */
const LOGO_CROP = { width: 1262, height: 440, x: 267, y: 50, w: 620, h: 280 };

const NAVY = "#0B1A45";
const GOLD = "#DFB76C";
const INK = "#0F172A";
const MUTED = "#64748B";
const FAINT = "#9CA3AF";
const EMERALD = "#047857";
const ROSE = "#BE123C";
const PANEL = "#F8FAFC";
const RULE = "#E2E8F0";
const TOTAL_ROW = "#F1F5F9";

const FONT = 'Helvetica, Arial, "Noto Sans", "Noto Sans Bengali", "Noto Naskh Arabic", sans-serif';
const PROBE_TIMEOUT_MS = 8000;

// ── Pictures ─────────────────────────────────────────────────────────────────

interface RemoteImage {
  url: string;
  width: number;
  height: number;
}

/** The picture's address and size, or null when it does not exist or cannot be read (the PDF renderer cannot tell us itself). */
function probeImage(path: string): Promise<RemoteImage | null> {
  const url = absoluteUrl(path);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
    const done = (image: RemoteImage | null) => {
      clearTimeout(timer);
      resolve(image);
    };
    Image.getSize(
      url,
      (width, height) => done(width > 0 && height > 0 ? { url, width, height } : null),
      () => done(null)
    );
  });
}

/** The first address that answers with a picture. */
async function firstImage(paths: string[]): Promise<RemoteImage | null> {
  for (const path of paths) {
    const image = await probeImage(path);
    if (image) return image;
  }
  return null;
}

const mm = (value: number) => `${Math.round(value * 100) / 100}mm`;

/** Where the logo goes when its visible part is `heightMm` tall: the width of that part, and the whole picture's size and offset. */
function logoPlacement(logo: RemoteImage, heightMm: number) {
  const known = logo.width === LOGO_CROP.width && logo.height === LOGO_CROP.height;
  const crop = known ? LOGO_CROP : { x: 0, y: 0, w: logo.width, h: logo.height };
  const scale = heightMm / crop.h;
  return { boxWidth: crop.w * scale, width: logo.width * scale, height: logo.height * scale, left: -crop.x * scale, top: -crop.y * scale };
}

// ── Text ─────────────────────────────────────────────────────────────────────

/** Text as people typed it, with the characters that only upset layout removed: tabs and carriage returns become spaces/newlines, zero-width marks vanish. */
function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\t\u000B\u000C]/g, " ")
    .trim();
}

interface Para {
  text: string;
  size: number;
  style?: "normal" | "bold" | "italic";
  color?: string;
  /** Space above in mm, when it is not the first paragraph of the cell */
  gap?: number;
}

/** The paragraphs of one cell, one under the other. An empty paragraph is left out. */
function paragraphs(paras: Para[]): string {
  let html = "";
  for (const para of paras) {
    const text = normalizeText(para.text);
    if (!text) continue;
    const css = [
      `font-size:${para.size}pt`,
      para.style === "bold" ? "font-weight:bold" : "",
      para.style === "italic" ? "font-style:italic" : "",
      `color:${para.color ?? INK}`,
      html && para.gap ? `margin-top:${para.gap}mm` : "",
    ]
      .filter(Boolean)
      .join(";");
    html += `<div class="p" style="${css}">${escapeHtml(text)}</div>`;
  }
  return html;
}

const row = (cells: Para[][], className = "") => `<tr${className ? ` class="${className}"` : ""}>${cells.map((cell) => `<td>${paragraphs(cell)}</td>`).join("")}</tr>`;

const headRow = (labels: string[]) => `<thead><tr>${labels.map((label) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>`;

/** A CSS string for the text in the page margins (running header and footer) */
const cssString = (value: string) => `"${value.replace(/[\\"]/g, "\\$&").replace(/[\n\r\f]+/g, " ").replace(/</g, "\\3c ")}"`;

// ── Small pure helpers ───────────────────────────────────────────────────────

/** "2026-11" -> "1 – 30 November 2026" */
export function periodLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `1 – ${last} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** A file name with only plain letters and digits; a name in another script falls back to the student ID. */
export function lessonSummaryFileName(input: Pick<LessonSummaryInput, "student" | "month">): string {
  const plain = (value?: string) =>
    (value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const who = plain(input.student?.fullName) || plain(input.student?.studentId) || "student";
  return `Fajr-Lesson-Summary_${who}_${input.month}.pdf`;
}

// ── The document ─────────────────────────────────────────────────────────────

/** Builds the summary. `logo` and `signature` are the pictures found on the site; either may be missing. */
export function buildLessonSummaryHtml(input: LessonSummaryInput, pictures: { logo: RemoteImage | null; signature: RemoteImage | null }): string {
  const { logo, signature } = pictures;
  const month = monthLabel(input.month);

  const sessions = [...input.sessions].sort((a, b) => (conductedAt(a)?.getTime() ?? 0) - (conductedAt(b)?.getTime() ?? 0));
  const totals = summariseSessions(sessions);
  const studentName = input.student?.fullName?.trim() || "Student";

  // ── Page 1 header: logo on the left, title and month on the right ──
  let logoHtml = "";
  let runningLogo = "";
  if (logo) {
    const big = logoPlacement(logo, 17);
    logoHtml = `<div class="logo" style="width:${mm(big.boxWidth)}"><img src="${escapeHtml(logo.url)}" style="width:${mm(big.width)};height:${mm(big.height)};margin-left:${mm(big.left)};margin-top:${mm(big.top)}"></div>`;
    // The slim header of the later pages carries the logo 9 mm tall, 8 mm from the top edge
    const small = logoPlacement(logo, 9);
    runningLogo = `background: url("${logo.url}") no-repeat ${mm(small.left)} ${mm(8 + small.top)} / ${mm(small.width)} ${mm(small.height)};`;
  }

  // ── Student panel ──
  const panel = [
    { label: "STUDENT", value: studentName, width: "82mm" },
    { label: "STUDENT ID", value: input.student?.studentId || "—", width: "38mm" },
    { label: "PERIOD", value: periodLabel(input.month), width: "" },
  ]
    .map((col) => `<div class="pcol" style="${col.width ? `width:${col.width}` : "flex:1"}"><div class="plabel">${col.label}</div><div class="pvalue">${escapeHtml(normalizeText(col.value))}</div></div>`)
    .join("");

  // ── Summary tiles ──
  const presentPct = totals.classes > 0 ? Math.round((totals.present / totals.classes) * 100) : 0;
  const tiles: [string, string][] = [
    ["CLASSES HELD", String(totals.classes)],
    ["PRESENT", `${totals.present} (${presentPct}%)`],
    ["ABSENT", String(totals.absent)],
    ["TOTAL TIME", formatMinutes(totals.minutes)],
    ["TOPICS COVERED", String(totals.topics)],
  ];
  const tilesHtml = tiles.map(([label, value]) => `<div class="tile"><div class="tbar"></div><div class="tlabel">${label}</div><div class="tvalue">${escapeHtml(value)}</div></div>`).join("");

  // ── Lesson table ──
  const attendanceLook = (value?: string): { text: string; color: string } =>
    value === "present" ? { text: "Present", color: EMERALD } : value === "absent" ? { text: "Absent", color: ROSE } : { text: "Not marked", color: MUTED };

  const lessonRows = sessions
    .map((s, i) => {
      const when = conductedAt(s);
      const attendance = attendanceLook(s.studentAttendance);
      const planned = !s.actualDuration;
      const topic = s.topic?.trim();
      const note = s.notes?.trim();
      return row([
        [{ text: String(i + 1), size: 8, color: MUTED }],
        [
          { text: when ? formatWeekdayDate(when) : "—", size: 8, style: "bold" },
          { text: when ? formatTimeOfDay(when) : "", size: 7.5, color: MUTED },
        ],
        [
          { text: s.course?.title || "Class Session", size: 8.5, style: "bold" },
          { text: s.teacher?.fullName || "FAJR Certified Teacher", size: 7.5, color: MUTED, gap: 0.6 },
          { text: s.classType && s.classType !== "regular" ? classTypeLabel(s.classType) : "", size: 7, color: NAVY, gap: 0.6 },
        ],
        [
          topic ? { text: topic, size: 8.5 } : { text: "Not recorded", size: 8, style: "italic", color: FAINT },
          { text: note ? `Teacher's note: ${note}` : "", size: 7.5, style: "italic", color: MUTED, gap: 1.4 },
        ],
        [{ text: `${sessionMinutes(s)} min${planned ? " *" : ""}`, size: 8 }],
        [{ text: attendance.text, size: 8, style: "bold", color: attendance.color }],
      ]);
    })
    .join("");

  const lessonsHtml =
    sessions.length === 0
      ? `<p class="none">No completed classes were recorded in this month.</p>`
      : `<table class="grid striped lessons">
<colgroup><col style="width:8mm"><col style="width:26mm"><col style="width:40mm"><col><col style="width:17mm"><col style="width:21mm"></colgroup>
${headRow(["#", "Date & time", "Course & instructor", "Lesson topic", "Time", "Attendance"])}
<tbody>${lessonRows}</tbody>
</table>`;

  // ── Closing section: month at a glance, then the sign-off. It moves to a fresh page as a whole, never split. ──
  const notes: string[] = [];
  if (totals.plannedOnly > 0) notes.push(`* Planned time. The real running time was not recorded for ${totals.plannedOnly} ${totals.plannedOnly === 1 ? "class" : "classes"}, so the planned time is counted.`);
  if (totals.notMarked > 0) notes.push(`${totals.notMarked} ${totals.notMarked === 1 ? "class has" : "classes have"} no attendance mark.`);
  notes.push("Attendance, time and lesson topics come from the class records completed by the teacher at the end of each class.");

  const courseRows =
    totals.courses
      .map((c) =>
        row([
          [{ text: c.title, size: 8.5, style: "bold" }],
          [{ text: String(c.classes), size: 8.5 }],
          [{ text: formatMinutes(c.minutes), size: 8.5 }],
          [{ text: String(c.present), size: 8.5, color: EMERALD, style: "bold" }],
          [{ text: String(c.absent), size: 8.5, color: c.absent > 0 ? ROSE : MUTED, style: "bold" }],
        ])
      )
      .join("") +
    row(
      [
        [{ text: "Total", size: 8.5, style: "bold", color: NAVY }],
        [{ text: String(totals.classes), size: 8.5, style: "bold", color: NAVY }],
        [{ text: formatMinutes(totals.minutes), size: 8.5, style: "bold", color: NAVY }],
        [{ text: String(totals.present), size: 8.5, style: "bold", color: EMERALD }],
        [{ text: String(totals.absent), size: 8.5, style: "bold", color: totals.absent > 0 ? ROSE : MUTED }],
      ],
      "total"
    );

  // The signature sits on the line when the picture exists; without it the line is left blank to sign on
  const signatureHtml = signature ? `<img src="${escapeHtml(signature.url)}">` : "";

  const footerText = `Fajr Academy  ·  Monthly Lesson Summary  ·  ${month}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(`Monthly Lesson Summary - ${month}`)}</title>
<meta name="author" content="Fajr Academy">
<meta name="subject" content="${escapeHtml(`${studentName} - ${month}`)}">
<style>
@page { size: A4; margin: 24mm 14mm 16mm 14mm; }
@page :first { margin-top: 9mm; }
/* Every page after the first: a slim header (logo, student and month, title over a gold rule). Every page: the footer. */
@page {
  @top-left { content: ""; ${runningLogo} border-bottom: 0.5mm solid ${GOLD}; margin-bottom: 5mm; }
  @top-center { content: ${cssString(`${studentName}  ·  ${month}`)}; font-family: ${FONT}; font-size: 7.5pt; color: ${MUTED}; vertical-align: bottom; padding-bottom: 1.2mm; border-bottom: 0.5mm solid ${GOLD}; margin-bottom: 5mm; }
  @top-right { content: "Monthly Lesson Summary"; font-family: ${FONT}; font-size: 8.5pt; font-weight: bold; color: ${NAVY}; vertical-align: bottom; padding-bottom: 1.2mm; border-bottom: 0.5mm solid ${GOLD}; margin-bottom: 5mm; }
  @bottom-left { content: ${cssString(footerText)}; font-family: ${FONT}; font-size: 7pt; color: ${FAINT}; vertical-align: top; padding-top: 1.3mm; border-top: 0.2mm solid ${RULE}; margin-top: 4.5mm; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: ${FONT}; font-size: 7pt; color: ${FAINT}; vertical-align: top; padding-top: 1.3mm; border-top: 0.2mm solid ${RULE}; margin-top: 4.5mm; }
}
@page :first {
  @top-left { content: none; }
  @top-center { content: none; }
  @top-right { content: none; }
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: ${FONT}; font-size: 8pt; line-height: 1.3; color: ${INK}; background: #ffffff; }
.p { white-space: pre-line; overflow-wrap: anywhere; unicode-bidi: plaintext; text-align: left; }

.head { display: flex; justify-content: space-between; align-items: flex-start; min-height: 17mm; }
.logo { height: 17mm; overflow: hidden; flex-shrink: 0; }
.logo img { display: block; max-width: none; }
.headText { margin-left: auto; text-align: right; }
.docTitle { font-size: 17pt; font-weight: bold; color: ${NAVY}; line-height: 1; margin-top: 3.6mm; white-space: nowrap; }
.docMonth { font-size: 10.5pt; color: ${MUTED}; line-height: 1; margin-top: 3mm; }
.ruleGold { border-top: 1mm solid ${GOLD}; margin-top: 3.5mm; }
.ruleNavy { border-top: 0.25mm solid ${NAVY}; margin-top: 0.8mm; }

.panel { display: flex; margin-top: 4.5mm; min-height: 17mm; padding: 3.2mm 4mm 2.6mm 4mm; background: ${PANEL}; border: 0.2mm solid ${RULE}; border-radius: 1.5mm; }
.pcol { padding-right: 4mm; min-width: 0; }
.pcol:last-child { padding-right: 0; }
.plabel { font-size: 6.5pt; color: ${MUTED}; line-height: 1.2; }
.pvalue { font-size: 10pt; font-weight: bold; color: ${INK}; margin-top: 0.9mm; overflow-wrap: anywhere; unicode-bidi: plaintext; text-align: left; }

.tiles { display: flex; gap: 3mm; margin-top: 5mm; }
.tile { position: relative; flex: 1; height: 16mm; padding: 3.3mm 1mm 0 3.5mm; background: #ffffff; border: 0.2mm solid ${RULE}; border-radius: 1.5mm; overflow: hidden; }
.tbar { position: absolute; left: 0; top: 2mm; width: 0.9mm; height: 12mm; background: ${GOLD}; }
.tlabel { font-size: 6.3pt; color: ${MUTED}; line-height: 1.2; white-space: nowrap; }
.tvalue { font-size: 11pt; font-weight: bold; color: ${NAVY}; line-height: 1.2; margin-top: 2.2mm; white-space: nowrap; }

.section { font-size: 10pt; font-weight: bold; color: ${NAVY}; line-height: 1.2; }
.lessonsTitle { margin-top: 7mm; margin-bottom: 2mm; }
.none { font-size: 9pt; font-style: italic; color: ${MUTED}; margin: 3mm 0 4mm 0; }

table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.grid thead { display: table-header-group; }
table.grid tr { break-inside: avoid; page-break-inside: avoid; }
table.grid th, table.grid td { border: 0.1mm solid ${RULE}; padding: 2.2mm; text-align: left; vertical-align: top; }
table.grid th { background: ${NAVY}; color: #ffffff; font-size: 8pt; font-weight: bold; }
table.lessons tbody tr { height: 9.5mm; }
table.striped tbody tr:nth-child(even) td { background: ${PANEL}; }
table.courses tbody tr { height: 7.5mm; }
table.courses tr.total td { background: ${TOTAL_ROW}; }

.closing { break-inside: avoid; page-break-inside: avoid; margin-top: 8mm; }
.glance { display: flex; align-items: center; margin-bottom: 2mm; }
.glance .bar { display: inline-block; width: 1.2mm; height: 5mm; background: ${GOLD}; margin-right: 2.3mm; }
.notes { margin-top: 5mm; }
.note { font-size: 7.5pt; color: ${MUTED}; line-height: 3.5mm; margin: 0 0 1.2mm 0; }

.signoff { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 7mm; }
.generated { font-size: 7.5pt; color: ${MUTED}; }
.sign { width: 64mm; text-align: center; }
.signLabel { font-size: 7.5pt; color: ${MUTED}; }
.signArea { height: 15mm; margin-top: 1mm; display: flex; align-items: flex-end; justify-content: center; }
.signArea img { display: block; max-width: 56mm; max-height: 15mm; }
.signLine { border-top: 0.3mm solid ${NAVY}; margin-top: 1.5mm; }
.signName { font-size: 11pt; font-weight: bold; color: ${NAVY}; line-height: 1.2; margin-top: 1.8mm; }
.signTitle { font-size: 8.5pt; color: ${INK}; line-height: 1.2; margin-top: 1.2mm; }
.signOrg { font-size: 7.5pt; color: ${MUTED}; line-height: 1.2; margin-top: 1.1mm; }
</style>
</head>
<body>
<div class="head">
${logoHtml}
<div class="headText"><div class="docTitle">MONTHLY LESSON SUMMARY</div><div class="docMonth">${escapeHtml(month)}</div></div>
</div>
<div class="ruleGold"></div>
<div class="ruleNavy"></div>

<div class="panel">${panel}</div>

<div class="tiles">${tilesHtml}</div>

<div class="section lessonsTitle">Lesson details</div>
${lessonsHtml}

<div class="closing">
<div class="section glance"><span class="bar"></span>Month at a glance</div>
<table class="grid courses">
<colgroup><col><col style="width:24mm"><col style="width:28mm"><col style="width:24mm"><col style="width:24mm"></colgroup>
${headRow(["Course", "Classes", "Time", "Present", "Absent"])}
<tbody>${courseRows}</tbody>
</table>
<div class="notes">${notes.map((note) => `<p class="note">${escapeHtml(note)}</p>`).join("")}</div>
<div class="signoff">
<div class="generated">Generated on ${escapeHtml(formatLongDate(input.generatedAt))}</div>
<div class="sign">
<div class="signLabel">Reviewed and approved by</div>
<div class="signArea">${signatureHtml}</div>
<div class="signLine"></div>
<div class="signName">${escapeHtml(SIGNATORY.name)}</div>
<div class="signTitle">${escapeHtml(SIGNATORY.title)}</div>
<div class="signOrg">${escapeHtml(SIGNATORY.organisation)}</div>
</div>
</div>
</div>
</body>
</html>`;
}

/** Makes the summary and opens the phone's share sheet with it (save to Files, send, print). */
export async function shareLessonSummaryPdf(input: LessonSummaryInput): Promise<void> {
  const [logo, signature] = await Promise.all([firstImage(LOGO_URLS), probeImage(SIGNATORY.signatureUrl)]);
  await shareHtmlAsPdf(buildLessonSummaryHtml(input, { logo, signature }), lessonSummaryFileName(input));
}
