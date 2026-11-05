import { escapeHtml, formatTime12 } from "@/lib/format";
import { capitalizeFirst, hoursAndMinutes, sessionDateLabel, sessionInstant, sessionMinutes, type Session, type Summary } from "@/screens/teacher/monthly/utils";

interface ReportInput {
  sessions: Session[];
  summary: Summary;
  /** "November 2026" or "Date: 2026-11-05" */
  periodLabel: string;
  /** "5 Nov 2026, 2:30 PM" */
  generatedAt: string;
}

/**
 * The "Monthly Class & Attendance Report" as an HTML document (A4 landscape): the same header line,
 * six summary boxes and eleven-column table the website's PDF export draws.
 */
export function buildReportHtml({ sessions, summary, periodLabel, generatedAt }: ReportInput): string {
  const boxes: [string, string][] = [
    ["Total Classes", String(summary.total)],
    ["Present", String(summary.present)],
    ["Absent", String(summary.absent)],
    ["Not Marked", String(summary.notMarked)],
    ["Completed", String(summary.completed)],
    ["Total Hours", hoursAndMinutes(summary.totalMins)],
  ];

  const rows = sessions
    .map((s, i) => {
      const day = capitalizeFirst(s.dayOfWeek || "");
      const status = capitalizeFirst(s.status || "").replace("-", " ");
      const attendance = capitalizeFirst((s.studentAttendance || "not-marked").replace("-", " "));
      const cells = [
        String(i + 1),
        sessionInstant(s) ? sessionDateLabel(s) : "—",
        day,
        s.student?.fullName || "—",
        s.course?.title || "—",
        s.course?.level || "—",
        `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`,
        `${sessionMinutes(s)} min`,
        status,
        attendance,
        s.notes || "",
      ];
      return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
    })
    .join("");

  const head = ["#", "Date", "Day", "Student", "Course", "Level", "Time", "Duration", "Status", "Attendance", "Notes"];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4 landscape; margin: 18px; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #0f172a; }
  .head { background: #0a1931; color: #ffffff; padding: 12px 16px; border-radius: 6px; }
  .head h1 { margin: 0; font-size: 17px; }
  .head p { margin: 5px 0 0; font-size: 9.5px; }
  .boxes { display: flex; gap: 8px; margin: 10px 0 12px; }
  .box { flex: 1; background: #f8fafc; border-radius: 6px; padding: 7px 9px; }
  .box span { display: block; font-size: 8px; color: #64748b; }
  .box b { display: block; font-size: 12px; color: #0a1931; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  thead { display: table-header-group; }
  th { background: #0a1931; color: #ffffff; text-align: left; padding: 6px 5px; font-weight: bold; }
  td { padding: 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="head">
    <h1>Fajr Academy — Monthly Class &amp; Attendance Report</h1>
    <p>Period: ${escapeHtml(periodLabel)} &nbsp; | &nbsp; Total Sessions: ${escapeHtml(summary.total)} &nbsp; | &nbsp; Generated: ${escapeHtml(generatedAt)}</p>
  </div>
  <div class="boxes">
    ${boxes.map(([label, value]) => `<div class="box"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}
  </div>
  <table>
    <thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
