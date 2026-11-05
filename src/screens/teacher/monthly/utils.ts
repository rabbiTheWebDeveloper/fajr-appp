import { DAY_NAMES, MONTH_NAMES, MONTH_SHORT, academyDateKey, formatDate } from "@/lib/format";
import type { Palette } from "@/theme/palette";

/** GET / PATCH /api/teacher-portal/class-monthly */
export const CLASS_MONTHLY_PATH = "/api/teacher-portal/class-monthly";
export const PAGE_SIZE = 15;
/** The calendar and the PDF load the whole month in one page (the route caps `limit` at 500) */
export const FULL_MONTH_LIMIT = 500;

export type Attendance = "present" | "absent" | "not-marked";

export interface Session {
  _id: string;
  classId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  duration?: number | null;
  actualDuration?: number | null;
  /** "scheduled" | "in-progress" | "completed" | "cancelled" | "paused" */
  status: string;
  /** "present" | "absent" | "not-marked" */
  studentAttendance: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  notes?: string;
  /** An empty object when the student / course record no longer exists */
  student?: { _id?: string; fullName?: string; studentId?: string; avatar?: string; phone?: string } | null;
  course?: { _id?: string; title?: string; level?: string } | null;
}

export interface Summary {
  total: number;
  present: number;
  absent: number;
  notMarked: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  totalMins: number;
}

export interface DailyStat {
  /** "YYYY-MM-DD" in Bangladesh time */
  _id: string;
  total: number;
  present: number;
  absent: number;
  completed: number;
  scheduled: number;
  totalMins: number;
}

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MonthlyReply {
  success: boolean;
  message?: string;
  sessions?: Session[];
  summary?: Partial<Summary>;
  dailyStats?: DailyStat[];
  pagination?: PageInfo;
  month?: string;
  date?: string;
}

export const EMPTY_SUMMARY: Summary = { total: 0, present: 0, absent: 0, notMarked: 0, completed: 0, scheduled: 0, cancelled: 0, totalMins: 0 };

/** A class is dated by when it started; one that never started falls back to when it was created */
export function sessionInstant(s: Session): string {
  return s.startedAt || s.createdAt;
}

/** The session's day in the academy (Bangladesh time), "YYYY-MM-DD"; "" when the date is unreadable */
export function sessionDateKey(s: Session): string {
  const d = new Date(sessionInstant(s));
  return Number.isNaN(d.getTime()) ? "" : academyDateKey(d);
}

/** "Nov 5, 2026" */
export function sessionDateLabel(s: Session): string {
  return formatDate(sessionInstant(s), "medium");
}

/** Minutes taught: the real length when the class was held, otherwise the planned length */
export function sessionMinutes(s: Session): number {
  return s.actualDuration ?? s.duration ?? 45;
}

function parts(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d };
}

/** "2026-11-05" -> "Nov 5" */
export function monthDayLabel(dateKey: string): string {
  const { m, d } = parts(dateKey);
  return `${MONTH_SHORT[m - 1] ?? ""} ${d}`;
}

/** "2026-11-05" -> "November 5, 2026" */
export function longDateLabel(dateKey: string): string {
  const { y, m, d } = parts(dateKey);
  return `${MONTH_NAMES[m - 1] ?? ""} ${d}, ${y}`;
}

/** "2026-11-05" -> "Thursday, November 5, 2026" */
export function weekdayDateLabel(dateKey: string): string {
  const { y, m, d } = parts(dateKey);
  return `${DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${longDateLabel(dateKey)}`;
}

/** 135 -> "2h 15m" (always both parts, as the report shows it) */
export function hoursAndMinutes(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins || 0));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** Calendar dot colour: attendance for a finished class, otherwise the class status */
export function sessionDotColor(s: Session, c: Palette): string {
  if (s.status === "completed") return s.studentAttendance === "present" ? c.success : s.studentAttendance === "absent" ? c.danger : c.warning;
  if (s.status === "in-progress" || s.status === "paused") return c.info;
  if (s.status === "scheduled") return c.violet;
  return c.textFaint;
}
