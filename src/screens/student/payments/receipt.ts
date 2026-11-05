import { api } from "@/api/client";
import { shareHtmlAsPdf } from "@/lib/files";
import { academyDateKey, academyMonthKey, formatMonthKey, formatNumber } from "@/lib/format";
import { buildPdfPage, n, svgCircle, svgLine, svgRect, svgText } from "@/screens/student/payments/pdfSvg";
import type { PaymentRecord, StudentPaymentInfo } from "@/screens/student/payments/types";

/**
 * The official money receipt ("Invoice" button), rebuilt from the website's generateInvoicePDF()
 * (src/lib/invoice-generator.ts): the same 240 x 160 mm slip with the logo, MONEY RECEIPT badge, the boxed
 * details and fee table, the round PAID / PENDING / UNPAID seal, the barcode strip and the helpdesk footer.
 */

/** The student's class schedule, as GET /api/schedules?studentId= returns it in `schedule` */
export interface ReceiptSchedule {
  teacher?: { fullName?: string } | null;
  weekly_days_list?: string[];
  day_times?: { day?: string }[];
}

const NAVY = "rgb(43,57,144)";
const BLACK = "#000000";
const HEADER_GRAY = "rgb(211,211,211)";

const PAGE_W = 240;
const PAGE_H = 160;

const DAY_MAP: Record<string, string> = {
  saturday: "SAT",
  sunday: "SUN",
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
};

/** 3500 -> "Three Thousand Five Hundred Taka Only" (South Asian grouping: crore, lakh, thousand) */
export function numberToWords(num: number): string {
  if (num === 0) return "Zero Taka Only";
  const ones = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num < 0) return "Minus " + numberToWords(Math.abs(num));
  if (num > 999999999) return num.toString() + " Taka Only";

  const parts = ("000000000" + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!parts) return "";
  const group = (digits: string) => ones[Number(digits)] || `${tens[Number(digits[0])]} ${ones[Number(digits[1])]}`;

  let words = "";
  words += Number(parts[1]) !== 0 ? group(parts[1]) + "Crore " : "";
  words += Number(parts[2]) !== 0 ? group(parts[2]) + "Lakh " : "";
  words += Number(parts[3]) !== 0 ? group(parts[3]) + "Thousand " : "";
  words += Number(parts[4]) !== 0 ? group(parts[4]) + "Hundred " : "";
  words += Number(parts[5]) !== 0 ? (words !== "" ? "and " : "") + group(parts[5]) : "";
  return words.trim() + " Taka Only";
}

/** The class days for the "Routine" line: "SAT, SUN, MON" */
function routineDays(schedule: ReceiptSchedule | null): string {
  const listed = schedule?.weekly_days_list?.length ? schedule.weekly_days_list : (schedule?.day_times ?? []).map((slot) => slot.day ?? "");
  return listed
    .map((day) => {
      const key = String(day).trim().toLowerCase();
      return DAY_MAP[key] || key.slice(0, 3).toUpperCase();
    })
    .filter(Boolean)
    .join(", ");
}

/** The decorative barcode strip of the receipt (random bars, like the website draws) */
function barcode(x: number, y: number, w: number, h: number): string {
  let path = "";
  let cursor = x;
  while (cursor < x + w) {
    const barWidth = Math.random() * 1.5 + 0.3;
    if (cursor + barWidth > x + w) break;
    if (Math.random() > 0.3) path += `M${n(cursor)} ${n(y)}h${n(barWidth)}v${n(h)}h${n(-barWidth)}z`;
    cursor += barWidth + Math.random() * 0.8;
  }
  return `<path d="${path}" fill="${BLACK}"/>`;
}

/** The decorative QR block of the receipt: three finder squares and random cells */
function qrBlock(x: number, y: number, size: number): string {
  const cells = 21;
  const cell = size / cells;
  let path = "";
  const mark = (row: number, col: number) => {
    path += `M${n(x + col * cell)} ${n(y + row * cell)}h${n(cell)}v${n(cell)}h${n(-cell)}z`;
  };
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const inFinder = (i < 7 && j < 7) || (i > cells - 8 && j < 7) || (i < 7 && j > cells - 8);
      if (inFinder) {
        const onRing = i === 0 || i === 6 || j === 0 || j === 6 || i === cells - 1 || i === cells - 7 || j === cells - 1 || j === cells - 7;
        const inCore = (i >= 2 && i <= 4 && j >= 2 && j <= 4) || (i >= cells - 5 && i <= cells - 3 && j >= 2 && j <= 4) || (i >= 2 && i <= 4 && j >= cells - 5 && j <= cells - 3);
        if (onRing || inCore) mark(i, j);
      } else if (Math.random() > 0.5) {
        mark(i, j);
      }
    }
  }
  return `<path d="${path}" fill="${BLACK}"/>`;
}

/** Letters set along an arc of the seal; `top` runs over the top of the circle, otherwise along the bottom */
function arcText(text: string, cx: number, cy: number, radius: number, startDeg: number, rangeDeg: number, top: boolean, fill: string): string {
  const chars = text.split("");
  const step = chars.length > 1 ? rangeDeg / (chars.length - 1) : 0;
  return chars
    .map((ch, index) => {
      if (ch === " ") return "";
      const angle = top ? startDeg + index * step : startDeg - index * step;
      const rad = (angle * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      return svgText(0, 0, ch, { size: 8.5, font: "helvetica", bold: true, anchor: "middle", middle: true, fill, transform: `translate(${n(x)} ${n(y)}) rotate(${n(top ? angle + 90 : angle - 90)})` });
    })
    .join("");
}

/** The round "FAJR ACADEMY" stamp with PAID / PENDING / UNPAID in the middle */
function stampSeal(cx: number, cy: number, status: string): string {
  const r = 22;
  const color = status === "PAID" ? "rgb(18,145,95)" : status === "PENDING" ? "rgb(217,119,6)" : "rgb(220,38,38)";
  return [
    svgCircle(cx, cy, r, { stroke: color, width: 1.2 }),
    svgCircle(cx, cy, r - 1.5, { stroke: color, width: 0.4 }),
    svgCircle(cx, cy, r - 15, { stroke: color, width: 0.4 }),
    arcText("F A J R   A C A D E M Y", cx, cy, r - 8, 205, 130, true, color),
    arcText("F A J R   A C A D E M Y", cx, cy, r - 8, 155, 130, false, color),
    svgText(cx - (r - 8), cy, "*", { size: 12, font: "helvetica", bold: true, anchor: "middle", middle: true, fill: color }),
    svgText(cx + (r - 8), cy, "*", { size: 12, font: "helvetica", bold: true, anchor: "middle", middle: true, fill: color }),
    svgText(cx, cy, status, { size: 12, font: "helvetica", italic: true, anchor: "middle", middle: true, fill: color }),
  ].join("");
}

interface ReceiptDocument {
  html: string;
  fileName: string;
}

/** Builds the receipt for one payment. `info` fills in what the payment row itself does not carry. */
export function buildReceipt(txn: PaymentRecord, info: StudentPaymentInfo | null, schedule: ReceiptSchedule | null): ReceiptDocument {
  const rawStatus = (txn.status || "pending").toLowerCase();
  const isPaid = ["completed", "approved", "paid"].includes(rawStatus);
  const isPending = rawStatus === "pending" || rawStatus === "in_review";
  const statusLabel = isPaid ? "PAID" : isPending ? "PENDING" : "UNPAID";

  const amount = Number(txn.amount || 0);
  const discount = Number(txn.discount || 0);
  const totalDue = Math.max(0, amount - discount);

  const invoiceNo = txn.invoiceId || txn.transactionId || `INV-${String(txn._id || "").slice(-8).toUpperCase()}`;
  const mrNo = txn.mrNumber || invoiceNo;
  const issuedAt = txn.createdAt || Date.now();
  const [year, month, day] = academyDateKey(new Date(issuedAt)).split("-");
  const issueDate = `${day}-${month}-${year}`;
  const targetMonth = txn.month || formatMonthKey(academyMonthKey(new Date(issuedAt)), true);

  const student = txn.student && typeof txn.student === "object" ? txn.student : null;
  const studentName = student?.fullName || info?.fullName || "Valued Student";
  // The website prints a made-up "STU-001" / "SAT, SUN, MON" when these are unknown; a receipt must not, so a dash stands in
  const studentId = student?.studentId || info?.studentId || "—";
  const teacherName = schedule?.teacher?.fullName || "—";
  const routine = routineDays(schedule) || "—";

  const courseTitle = txn.course?.title || info?.course || "Academic Program";
  const feeLabel = (txn.type || "").toLowerCase().includes("admission") ? "Admission Fee" : courseTitle;
  const amountStr = formatNumber(totalDue);
  const words = numberToWords(totalDue);

  const cx = PAGE_W / 2;
  const boxX = 40;
  const boxY = 50;
  const boxW = 160;
  const boxH = 95;

  const body: string[] = [];

  // "MONEY RECEIPT" badge
  body.push(svgRect(cx - 35, 35, 70, 10, { fill: NAVY, radius: 5 }));
  body.push(svgText(cx, 42, "MONEY RECEIPT", { size: 14, font: "helvetica", bold: true, anchor: "middle", fill: "#ffffff" }));

  // Main box and the three detail lines
  body.push(svgRect(boxX, boxY, boxW, boxH, { stroke: BLACK, width: 0.3, radius: 2 }));
  const label = (x: number, y: number, text: string) => svgText(x, y, text, { size: 10.5 });
  const value = (x: number, y: number, text: string, maxWidth: number) => svgText(x, y, text, { size: 10.5, bold: true, maxWidth });

  body.push(label(boxX + 5, boxY + 7, "MR No: "), value(boxX + 22, boxY + 7, mrNo, 92));
  body.push(label(boxX + boxW - 40, boxY + 7, "Date: "), value(boxX + boxW - 28, boxY + 7, issueDate, 26));

  body.push(label(boxX + 5, boxY + 14, "Student Name: "), value(boxX + 32, boxY + 14, studentName, 58));
  body.push(label(boxX + boxW - 68, boxY + 14, "Teacher: "), value(boxX + boxW - 52, boxY + 14, teacherName, 50));

  body.push(label(boxX + 5, boxY + 21, "Student ID: "), value(boxX + 28, boxY + 21, studentId, 62));
  body.push(label(boxX + boxW - 68, boxY + 21, "Routine: "), value(boxX + boxW - 52, boxY + 21, routine, 50));

  // Fee table: SL | Particulars | Month | Amount(Tk) | Scholarship Amount(Tk)
  const tY = boxY + 26;
  const colSl = 12;
  const colMonth = 25;
  const colAmount = 30;
  const colScholarship = 30;
  const colParticulars = boxW - colSl - colMonth - colAmount - colScholarship;

  const x1 = boxX;
  const x2 = x1 + colSl;
  const xMonth = x2 + colParticulars;
  const x3 = xMonth + colMonth;
  const x4 = x3 + colAmount;
  const x5 = boxX + boxW;

  body.push(svgRect(x1, tY, boxW, 10, { fill: HEADER_GRAY }));
  const rule = (ax: number, ay: number, bx: number, by: number) => svgLine(ax, ay, bx, by, BLACK, 0.2);
  body.push(rule(x1, tY, x5, tY), rule(x1, tY + 10, x5, tY + 10), rule(x1, tY + 18, x5, tY + 18));
  // The total and "in word" rows stop at the scholarship column
  body.push(rule(x1, tY + 26, x4, tY + 26), rule(x1, tY + 32, x4, tY + 32));
  body.push(rule(x2, tY, x2, tY + 18), rule(xMonth, tY, xMonth, tY + 18), rule(x3, tY, x3, tY + 26), rule(x4, tY, x4, tY + 32));

  const head = (x: number, y: number, text: string, anchor: "start" | "middle" = "middle") => svgText(x, y, text, { size: 10, bold: true, anchor });
  body.push(head(x1 + 2, tY + 6, "SL", "start"));
  body.push(head(x2 + colParticulars / 2, tY + 6, "Particulars"));
  body.push(head(xMonth + colMonth / 2, tY + 6, "Month"));
  body.push(head(x3 + colAmount / 2, tY + 6, "Amount(Tk)"));
  body.push(head(x4 + colScholarship / 2, tY + 4, "Scholarship"));
  body.push(head(x4 + colScholarship / 2, tY + 8, "Amount(Tk)"));

  body.push(svgText(x1 + 2, tY + 15, "1", { size: 10 }));
  body.push(svgText(x2 + 2, tY + 15, feeLabel, { size: 10, maxWidth: colParticulars - 4 }));
  body.push(svgText(xMonth + colMonth / 2, tY + 15, targetMonth, { size: 10, anchor: "middle", maxWidth: colMonth - 2 }));
  body.push(svgText(x4 - 2, tY + 15, amountStr, { size: 10, anchor: "end" }));

  body.push(svgText(x3 - 5, tY + 23, "Total", { size: 10, bold: true, anchor: "end" }));
  body.push(svgText(x4 - 2, tY + 23, amountStr, { size: 10, bold: true, anchor: "end" }));

  body.push(svgText(x1 + 2, tY + 30, `In word: ${words}`, { size: 10, maxWidth: x4 - x1 - 4 }));

  // Signature caption and the status stamp
  body.push(svgText(boxX + 5, boxY + 75, "Account Clearance", { size: 10 }));
  body.push(stampSeal(boxX + boxW - 35, boxY + 65, statusLabel));

  // Left strip: barcode and QR block
  const leftX = 8;
  body.push(svgText(leftX + 13, boxY + 10, "Please don't write/stamp", { size: 6, font: "helvetica", anchor: "middle" }));
  body.push(svgText(leftX + 13, boxY + 13, "inside barcode area", { size: 6, font: "helvetica", anchor: "middle" }));
  body.push(barcode(leftX, boxY + 16, 26, 12));
  body.push(svgText(leftX + 13, boxY + 16 + 12 + 3, "213004800", { size: 7, font: "helvetica", bold: true, anchor: "middle" }));
  body.push(qrBlock(leftX + 1, boxY + 35, 24));

  // Right strip, reading top to bottom
  body.push(svgText(0, 0, "STUDENT'S COPY", { size: 11, font: "helvetica", transform: `translate(${n(boxX + boxW + 8)} ${n(boxY + 45)}) rotate(90)` }));

  // Footer
  body.push(
    svgText(cx, boxY + boxH + 9, "Customer Care Helpdesk: +880 1410-764581  |  Email: hellofajracademy@gmail.com", { size: 8.5, font: "helvetica", bold: true, anchor: "middle", fill: NAVY })
  );

  const html = buildPdfPage({
    title: `Money Receipt ${invoiceNo}`,
    width: PAGE_W,
    height: PAGE_H,
    // The slip is 3:2; at 96% of an A4 landscape page it stays on one page with a small margin
    widthPercent: 96,
    topPercent: 2,
    images: [
      // Faint watermark behind the box, then the letterhead logo (both placed and sized as on the website)
      { path: "/mainlogo.png", x: cx - 70, y: 75, width: 140, height: 40, opacity: 0.08 },
      { path: "/mainlogo.png", x: cx - 50, y: 5, width: 100, height: 28 },
    ],
    body: body.join(""),
  });

  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
  const safeInvoice = invoiceNo.replace(/[^a-zA-Z0-9\-_]/g, "_");
  return { html, fileName: `FajrAcademy_Receipt_${safeInvoice}_${safeName}.pdf` };
}

/** The teacher and class days printed on the receipt come from the student's schedule; null when there is none */
export async function loadReceiptSchedule(studentMongoId: string | undefined): Promise<ReceiptSchedule | null> {
  if (!studentMongoId) return null;
  try {
    const reply = await api.get<{ success?: boolean; schedule?: ReceiptSchedule | null }>("/api/schedules", { studentId: studentMongoId });
    return reply.success && reply.schedule ? reply.schedule : null;
  } catch {
    // The receipt is still valid without the teacher / routine lines
    return null;
  }
}

/** Builds the receipt and opens the share sheet (save, send, print) */
export async function shareReceipt(txn: PaymentRecord, info: StudentPaymentInfo | null, schedule: ReceiptSchedule | null): Promise<void> {
  const { html, fileName } = buildReceipt(txn, info, schedule);
  await shareHtmlAsPdf(html, fileName, { landscape: true });
}
