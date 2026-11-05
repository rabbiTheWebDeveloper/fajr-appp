import { escapeHtml, formatTime12 } from "@/lib/format";
import { SLOT_DAYS, type SlotDay } from "@/lib/teacher-slot-shared";

/** The student's weekly Schedule document, as GET /api/student-portal/schedule returns it in `schedule` (course and teacher are filled in) */
export interface ScheduleDoc {
  _id?: string;
  course?: { _id?: string; title?: string } | null;
  teacher?: { _id?: string; fullName?: string; email?: string } | null;
  /** The weekdays the class runs on, lower case */
  weekly_days_list?: string[];
  startTime?: string;
  endTime?: string;
  /** A time of its own for each weekday, when the teacher set the days at different hours */
  day_times?: { day?: string; startTime?: string; endTime?: string }[];
}

export interface ScheduleReply {
  success?: boolean;
  /** null when no schedule has been assigned yet */
  schedule?: ScheduleDoc | null;
  message?: string;
}

/** Monday first, as the website's timetable */
export const DAYS: readonly SlotDay[] = SLOT_DAYS;

export const DAY_SHORT: Record<SlotDay, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export const hasClassOn = (schedule: ScheduleDoc, day: SlotDay) => Array.isArray(schedule.weekly_days_list) && schedule.weekly_days_list.includes(day);

/**
 * When the class runs on one weekday: that day's own time when the schedule has one (a teacher can set
 * Monday at 5 PM and Wednesday at 7 PM), otherwise the schedule's main time.
 */
export function timesOn(schedule: ScheduleDoc, day: SlotDay): { start: string; end: string } {
  const own = Array.isArray(schedule.day_times) ? schedule.day_times.find((entry) => String(entry?.day ?? "").toLowerCase() === day) : undefined;
  if (own?.startTime) return { start: own.startTime, end: own.endTime || "" };
  return { start: schedule.startTime || "", end: schedule.endTime || "" };
}

/** "14:30" -> "2:30 PM"; "TBD" when no time is set */
export const timeText = (value?: string) => formatTime12(value) || "TBD";

/** "2:30 PM – 3:15 PM" */
export const timeRangeText = (times: { start: string; end: string }) => `${timeText(times.start)} – ${timeText(times.end)}`;

/**
 * The weekly timetable as a landscape page for "Export PDF": the same seven-column grid the website
 * turns into its PDF (course, start time, teacher and "Online" on class days, "Free" on the others).
 */
export function buildTimetableHtml(schedule: ScheduleDoc): string {
  const course = escapeHtml(schedule.course?.title || "Class");
  const teacher = escapeHtml(schedule.teacher?.fullName || "Teacher");
  const head = DAYS.map((day) => `<th>${DAY_SHORT[day]}</th>`).join("");
  const cells = DAYS.map((day) => {
    if (!hasClassOn(schedule, day)) return `<td><div class="free">Free</div></td>`;
    return `<td class="on"><div class="card"><div class="bar"></div><div class="title">${course}</div><div class="line">🕒 ${escapeHtml(timeText(timesOn(schedule, day).start))}</div><div class="line">👤 ${teacher}</div><div class="line">📍 Online</div></div></td>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 28px; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #0d1b3e; }
  h1 { margin: 0; font-size: 20px; }
  .sub { margin: 3px 0 14px; font-size: 11px; color: #8a93a8; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #bfdbfe; }
  th { background: #0d1b3e; color: #93c5fd; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 11px 0; }
  td { height: 170px; padding: 9px; vertical-align: top; border-left: 1px solid #dbeafe; }
  td:first-child { border-left: 0; }
  td.on { background: #eff6ff; }
  .card { height: 100%; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px; }
  .bar { height: 4px; border-radius: 2px; background: #2563eb; margin-bottom: 8px; }
  .title { font-size: 11px; font-weight: 800; line-height: 1.3; margin-bottom: 8px; word-wrap: break-word; }
  .line { font-size: 9.5px; font-weight: 600; color: #1e3a8a; margin-bottom: 5px; word-wrap: break-word; }
  .free { padding-top: 70px; text-align: center; font-size: 10px; color: #b6bcc9; }
</style>
</head>
<body>
  <h1>Weekly Class Timetable</h1>
  <p class="sub">Fajr Academy Student Portal</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody><tr>${cells}</tr></tbody>
  </table>
</body>
</html>`;
}
