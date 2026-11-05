// Pure helpers for the student's Class History list (no React).
// Ported from the website's class-history-utils.ts. The one difference: the website reads months, days and clock
// times in the browser's own time zone; the app reads them in academy time (Bangladesh, UTC+6) whatever the phone is
// set to, so a class is always filed under the month and day it was held at the academy.
import { DAY_SHORT, MONTH_NAMES, MONTH_SHORT, academyClock, academyMonthKey, formatClock as clockOfInstant, formatMonthKey } from "@/lib/format";

export interface HistorySession {
  _id: string;
  classId?: string;
  classType?: "regular" | "retake" | "makeup" | string;
  dayOfWeek?: string;
  /** Scheduled "HH:MM" (24h) */
  startTime?: string;
  endTime?: string;
  /** Planned minutes */
  duration?: number;
  /** Real minutes the class ran */
  actualDuration?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
  studentAttendance?: "present" | "absent" | "not-marked" | string;
  topic?: string;
  notes?: string;
  meetLink?: string | null;
  course?: { _id?: string; title?: string; level?: string; category?: string } | null;
  teacher?: { fullName?: string } | null;
}

export interface MonthOption {
  key: string;
  label: string;
  count: number;
}

export interface FlowStep {
  key: "created" | "scheduled" | "started" | "ended" | "attendance";
  label: string;
  /** When it happened; null when the step has no timestamp of its own or none was recorded */
  when: Date | null;
  detail: string;
  /** False when the data for this step was never recorded */
  recorded: boolean;
}

const CLASS_TYPE_LABELS: Record<string, string> = {
  regular: "Regular class",
  retake: "Retake class",
  makeup: "Make-up class",
};

const DEFAULT_CLASS_MINS = 45;

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-03" for any date, in academy time. */
export function monthKey(d: Date): string {
  return academyMonthKey(d);
}

/** "2026-03" -> "March 2026" */
export function monthLabel(key: string): string {
  return formatMonthKey(key);
}

/** The day the class was held: when it started, else ended, else was created. */
export function conductedAt(s: HistorySession): Date | null {
  return toDate(s.startedAt) ?? toDate(s.endedAt) ?? toDate(s.createdAt);
}

/** Minutes the class counts for: what it really ran, else what was planned. */
export function sessionMinutes(s: HistorySession): number {
  return s.actualDuration || s.duration || DEFAULT_CLASS_MINS;
}

export function classTypeLabel(type?: string): string {
  return CLASS_TYPE_LABELS[type || "regular"] || "Regular class";
}

/** Newest first; a session with no usable date goes last. */
export function sortNewestFirst(sessions: HistorySession[]): HistorySession[] {
  return [...sessions].sort((a, b) => (conductedAt(b)?.getTime() ?? -Infinity) - (conductedAt(a)?.getTime() ?? -Infinity));
}

/**
 * Months to offer in the filter, newest first: every month that has a class, plus the current month
 * (so it can be shown, empty, when nothing has been held yet).
 */
export function buildMonthOptions(sessions: HistorySession[], currentKey: string): MonthOption[] {
  const counts = new Map<string, number>([[currentKey, 0]]);
  for (const s of sessions) {
    const d = conductedAt(s);
    if (!d) continue;
    const key = monthKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, count]) => ({ key, label: monthLabel(key), count }));
}

/** "14:05" or "2:05 PM" -> "2:05 PM"; anything unreadable is returned as given. */
export function formatClock(value?: string): string {
  if (!value) return "";
  const text = value.trim().toUpperCase();
  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = match[2];
  if (match[3] === "PM" && hour < 12) hour += 12;
  if (match[3] === "AM" && hour === 12) hour = 0;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function capitalise(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/**
 * The life of one class, in order: created, slot it was set for, started, ended, attendance marked.
 * A step whose data was never saved is kept, marked as not recorded, so the gap is visible instead of hidden.
 */
export function buildClassFlow(s: HistorySession): FlowStep[] {
  const planned = s.duration || DEFAULT_CLASS_MINS;
  const startedAt = toDate(s.startedAt);
  const endedAt = toDate(s.endedAt);

  const slot = [
    s.dayOfWeek ? capitalise(s.dayOfWeek) : "",
    s.startTime ? `${formatClock(s.startTime)}${s.endTime ? ` – ${formatClock(s.endTime)}` : ""}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  let endedDetail = "End time not recorded";
  if (endedAt) {
    if (s.actualDuration) {
      const diff = s.actualDuration - planned;
      const against = diff === 0 ? "as planned" : diff > 0 ? `${diff} min longer than planned` : `${-diff} min shorter than planned`;
      endedDetail = `Ran for ${s.actualDuration} min, ${against}`;
    } else {
      endedDetail = "Closed by the teacher";
    }
  }

  const attendance = s.studentAttendance;
  const attendanceDetail =
    attendance === "present" ? "You were marked present" : attendance === "absent" ? "You were marked absent" : "Attendance was not marked";

  return [
    { key: "created", label: "Class created", when: toDate(s.createdAt), detail: "Booked by your teacher", recorded: !!toDate(s.createdAt) },
    {
      key: "scheduled",
      label: "Scheduled for",
      when: null,
      detail: slot ? `${slot} (${planned} min planned)` : `${planned} min planned`,
      recorded: !!slot,
    },
    {
      key: "started",
      label: "Class started",
      when: startedAt,
      detail: startedAt ? "Teacher opened the class" : "Start time not recorded",
      recorded: !!startedAt,
    },
    { key: "ended", label: "Class completed", when: endedAt, detail: endedDetail, recorded: !!endedAt },
    {
      key: "attendance",
      label: "Attendance marked",
      when: null,
      detail: attendanceDetail,
      recorded: attendance === "present" || attendance === "absent",
    },
  ];
}

export interface CourseTotals {
  title: string;
  classes: number;
  minutes: number;
  present: number;
  absent: number;
}

export interface SessionTotals {
  classes: number;
  present: number;
  absent: number;
  notMarked: number;
  minutes: number;
  /** Classes whose real running time was never saved, so their planned time is what is counted */
  plannedOnly: number;
  /** Classes that have a lesson topic written */
  topics: number;
  /** Per course, the busiest first */
  courses: CourseTotals[];
}

/** The figures shown above the history list and printed in the lesson summary PDF: one place, so they cannot differ. */
export function summariseSessions(sessions: HistorySession[]): SessionTotals {
  const totals: SessionTotals = { classes: sessions.length, present: 0, absent: 0, notMarked: 0, minutes: 0, plannedOnly: 0, topics: 0, courses: [] };
  const byCourse = new Map<string, CourseTotals>();
  for (const s of sessions) {
    const minutes = sessionMinutes(s);
    totals.minutes += minutes;
    if (!s.actualDuration) totals.plannedOnly++;
    if (s.topic?.trim()) totals.topics++;
    const present = s.studentAttendance === "present";
    const absent = s.studentAttendance === "absent";
    if (present) totals.present++;
    else if (absent) totals.absent++;
    else totals.notMarked++;

    const title = s.course?.title?.trim() || "Class Session";
    const course = byCourse.get(title) ?? { title, classes: 0, minutes: 0, present: 0, absent: 0 };
    course.classes++;
    course.minutes += minutes;
    if (present) course.present++;
    if (absent) course.absent++;
    byCourse.set(title, course);
  }
  totals.courses = [...byCourse.values()].sort((a, b) => b.classes - a.classes || a.title.localeCompare(b.title));
  return totals;
}

/** 135 -> "2h 15m", 45 -> "45m", 120 -> "2h" */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Case-insensitive match on the words a student would search by. */
export function matchesSearch(s: HistorySession, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [s.course?.title, s.topic, s.teacher?.fullName, s.notes, s.classId].some((field) => field?.toLowerCase().includes(q));
}

// ── Date wording ─────────────────────────────────────────────────────────────
// The website writes these with toLocaleDateString("en-US"); the same wording here, read in academy time.

/** "Nov 5", or "November 5" with `long` */
export function formatMonthDay(d: Date, long = false): string {
  const clock = academyClock(d);
  return `${(long ? MONTH_NAMES : MONTH_SHORT)[clock.getUTCMonth()]} ${clock.getUTCDate()}`;
}

/** "Thu, Nov 5", or "Thu, Nov 5, 2026" with `withYear` */
export function formatWeekdayDate(d: Date, withYear = false): string {
  const clock = academyClock(d);
  return `${DAY_SHORT[clock.getUTCDay()]}, ${formatMonthDay(d)}${withYear ? `, ${clock.getUTCFullYear()}` : ""}`;
}

/** "November 5, 2026" */
export function formatLongDate(d: Date): string {
  return `${formatMonthDay(d, true)}, ${academyClock(d).getUTCFullYear()}`;
}

/** "2:05 PM" */
export function formatTimeOfDay(d: Date): string {
  return clockOfInstant(d);
}

/** "Nov 5, 2026, 2:05 PM" */
export function formatStamp(d: Date): string {
  return `${formatMonthDay(d)}, ${academyClock(d).getUTCFullYear()}, ${formatTimeOfDay(d)}`;
}
