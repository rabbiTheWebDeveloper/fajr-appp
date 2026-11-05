import { absoluteUrl } from "@/api/client";
import { DAY_NAMES, MONTH_SHORT, academyClock, academyDayIndex, academyMinutesNow, minutesToTime24 } from "@/lib/format";
import type { Tone } from "@/theme/palette";

/* ───────────────────────── Types (as the class routes return them) ───────────────────────── */

export type Tab = "scheduled" | "in-progress" | "completed";
export type ViewMode = "classes" | "students" | "attendance";
export type ClassType = "regular" | "retake" | "makeup";
export type ClassAction = "start" | "end" | "pause" | "resume" | "reset";
export type Attendance = "present" | "absent";

export interface Course {
  _id: string;
  title: string;
  courseId?: string;
  level?: string;
}

export interface StudentSchedule {
  dayOfWeek?: string;
  weekly_days_list?: string[];
  startTime?: string;
  endTime?: string;
  duration?: number | string;
  classDuration?: number | string;
  course?: string | null;
  meetLink?: string;
  day_times?: { day: string; startTime: string; endTime?: string; duration?: number }[];
}

export interface Student {
  _id: string;
  fullName: string;
  studentId: string;
  avatar?: string;
  gender?: string;
  email?: string;
  phone?: string;
  studentNumber?: string;
  studentStatus?: string;
  courses?: { title?: string }[];
  course?: Course | string | null;
  meetLink?: string;
  schedule?: StudentSchedule | null;
}

export interface ClassSession {
  _id: string;
  classId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDuration: number | null;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "paused";
  classType?: ClassType;
  studentAttendance?: "present" | "absent" | "not-marked";
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  meetLink?: string | null;
  topic?: string;
  /** Populated ({ _id, fullName, studentId, avatar }); a bare id only if the student was removed from the lookup */
  student?: Student | string | null;
  course?: Course | null;
}

export interface ClassKpiStats {
  totalClasses: number;
  inProgress: number;
  completed: number;
  scheduled?: number;
  totalMins: number;
  teachingHours?: string;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate?: number;
}

export interface ClassListReply {
  success: boolean;
  classes?: ClassSession[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

export interface StatsReply {
  success: boolean;
  stats?: ClassKpiStats;
}

export interface StudentsReply {
  success: boolean;
  allStudents?: Student[];
  students?: Student[];
}

export interface CoursesReply {
  success: boolean;
  courses?: Course[];
}

/** Reply of POST (create) and PATCH (every action) on /api/teacher-portal/class */
export interface ClassActionReply {
  success: boolean;
  message?: string;
  class?: ClassSession;
  gems?: { breakdown?: { action: string; gems: number }[] } | null;
  earlyStartPenalty?: { applied: boolean; earlyByMinutes: number; gems: number } | null;
}

export interface ClassForm {
  studentId: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  duration: string;
  notes: string;
  meetLink: string;
  topic: string;
  classType: ClassType;
}

export type TodaySessionStatus = "completed" | "in-progress" | "paused" | "scheduled" | "cancelled" | "uncreated";

export interface TodayScheduleItem {
  student: Student;
  todayClass: ClassSession | undefined;
  status: TodaySessionStatus;
  /** The student's slot for today, from their weekly schedule */
  slot: { startTime: string; endTime: string; duration: number };
}

export interface StudentAttendanceRow {
  student: Student | null;
  key: string;
  total: number;
  present: number;
  absent: number;
  notMarked: number;
}

/* ───────────────────────── Constants ───────────────────────── */

export const LIMIT = 10;
export const MIN_DURATION = 15;
export const MAX_DURATION = 180;
/** A class can be created from 30 minutes before its start time (the server enforces the same rule) */
export const CREATE_WINDOW_MINUTES = 30;

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const DURATION_PRESETS = [15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180];

export const BLANK_FORM: ClassForm = {
  studentId: "",
  courseId: "",
  dayOfWeek: "monday",
  startTime: "10:00",
  duration: "45",
  notes: "",
  meetLink: "",
  topic: "",
  classType: "regular",
};

export const CLASS_TYPE_LABELS: Record<string, string> = {
  regular: "Regular Class",
  retake: "Retake Class",
  makeup: "Make-up Class",
  "Regular Class": "Regular Class",
  "Retake Class": "Retake Class",
  "Make-up Class": "Make-up Class",
};

export const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: "regular", label: "Regular Class" },
  { value: "retake", label: "Retake Class" },
  { value: "makeup", label: "Make-up Class" },
];

export function classTypeTone(type?: string | null): Tone {
  if (type === "retake") return "warning";
  if (type === "makeup") return "violet";
  return "primary";
}

export function statusTone(status: ClassSession["status"]): Tone {
  if (status === "in-progress") return "warning";
  if (status === "completed") return "success";
  if (status === "paused") return "info";
  return "primary";
}

export const STATUS_LABELS: Record<ClassSession["status"], string> = {
  scheduled: "Scheduled",
  "in-progress": "In Progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function levelTone(level?: string): Tone {
  if (level === "beginner") return "info";
  if (level === "intermediate") return "violet";
  if (level === "advanced") return "danger";
  return "neutral";
}

export function studentStatusTone(status?: string): Tone {
  switch (status || "active") {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "at-risk":
    case "pause":
    case "paused":
      return "warning";
    case "suspended":
    case "discontinue":
    case "discontinued":
      return "danger";
    default:
      return "neutral";
  }
}

/* ───────────────────────── Helpers ───────────────────────── */

const pad2 = (n: number) => String(n).padStart(2, "0");

export function capitalize(value?: string | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

/** Convert any common time string to HH:MM (24h). Returns null if unparseable. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    return `${pad2(h)}:${pad2(m)}`;
  }
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toLowerCase();
    if (period === "am" && h === 12) h = 0;
    if (period === "pm" && h !== 12) h += 12;
    return `${pad2(h)}:${pad2(m)}`;
  }
  return null;
}

/** "18:04" -> "6:04 PM"; a time already in AM/PM is kept; nothing -> "—" */
export function time12(timeStr?: string | null): string {
  if (!timeStr) return "—";
  const str = timeStr.trim();
  if (/am|pm/i.test(str)) return str;
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return str;
  const h = parseInt(match[1], 10);
  if (Number.isNaN(h)) return str;
  return `${h % 12 === 0 ? 12 : h % 12}:${match[2]} ${h >= 12 ? "PM" : "AM"}`;
}

/** An instant in Bangladesh time as "05.11.2026 : 06:04PM" (the stamp the class cards show) */
export function formatDT(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const clock = academyClock(d);
  const h24 = clock.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad2(clock.getUTCDate())}.${pad2(clock.getUTCMonth() + 1)}.${clock.getUTCFullYear()} : ${pad2(h12)}:${pad2(clock.getUTCMinutes())}${h24 >= 12 ? "PM" : "AM"}`;
}

/** Today's weekday in Bangladesh time, lowercase ("tuesday") */
export function bdDayKey(at: Date = new Date()): string {
  return DAY_NAMES[academyDayIndex(at)].toLowerCase();
}

/** "Thursday, Nov 5, 2026" in Bangladesh time */
export function bdTodayFormatted(at: Date = new Date()): string {
  const clock = academyClock(at);
  return `${DAY_NAMES[clock.getUTCDay()]}, ${MONTH_SHORT[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()}`;
}

/** The current Bangladesh wall-clock time as 24-hour "HH:MM": sent as `clientTime` with every class action */
export function bdClientTime(at: Date = new Date()): string {
  return minutesToTime24(academyMinutesNow(at));
}

export function avatarUri(src?: string | null): string | null {
  return src ? absoluteUrl(src) : null;
}

/** The populated student of a class (null when the reply only carries an id) */
export function classStudent(cls: ClassSession): Student | null {
  return cls.student && typeof cls.student === "object" ? cls.student : null;
}

export function classStudentId(cls: ClassSession): string {
  if (!cls.student) return "";
  return typeof cls.student === "object" ? String(cls.student._id ?? "") : String(cls.student);
}

/** The student's slot for today from their weekly schedule, or null when they have no class today */
export function todayScheduleFor(student: Student, todayDayKey: string): { startTime: string; endTime: string; duration: number } | null {
  const sch = student.schedule;
  if (!sch) return null;
  const dt = Array.isArray(sch.day_times) ? sch.day_times.find((d) => String(d.day || "").toLowerCase().trim() === todayDayKey) : undefined;
  const rawDay = sch.dayOfWeek || sch.weekly_days_list?.[0] || "";
  const isSingleMatch = String(rawDay).toLowerCase().trim() === todayDayKey;
  const isListMatch = Array.isArray(sch.weekly_days_list) && sch.weekly_days_list.map((d) => String(d).toLowerCase().trim()).includes(todayDayKey);

  if (!isSingleMatch && !isListMatch && !dt) return null;

  return {
    startTime: dt?.startTime || sch.startTime || "",
    endTime: dt?.endTime || sch.endTime || "",
    duration: Number(dt?.duration) || Number(sch.duration) || 45,
  };
}

/** The course a student studies: their own course, else the one on their schedule */
export function studentCourseId(student: Student): string {
  if (typeof student.course === "object" && student.course !== null) return student.course._id;
  if (typeof student.course === "string") return student.course;
  return student.schedule?.course ? String(student.schedule.course) : "";
}

/**
 * Adds "https://" when the scheme is missing and checks the result is a usable web address.
 * Returns null for an address a browser would reject (no host, spaces in the host…).
 */
export function normalizeMeetLink(raw: string): string | null {
  let link = raw.trim();
  if (!link) return null;
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (!/^https?:\/\/[^\s/?#\\<>^|]+([/?#].*)?$/i.test(link)) return null;
  try {
    new URL(link);
  } catch {
    return null;
  }
  return link;
}

/** Keeps a class length inside the allowed 15–180 minutes */
export function clampDuration(raw: string | number): number {
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Number(raw) || MIN_DURATION));
}

/** One row per student over a list of completed classes, most recent student first */
export function buildStudentAttendance(completed: ClassSession[]): StudentAttendanceRow[] {
  const rows = new Map<string, StudentAttendanceRow>();
  for (const cls of completed) {
    const key = classStudentId(cls) || "unknown";
    let row = rows.get(key);
    if (!row) {
      row = { student: classStudent(cls), key, total: 0, present: 0, absent: 0, notMarked: 0 };
      rows.set(key, row);
    }
    row.total += 1;
    if (cls.studentAttendance === "present") row.present += 1;
    else if (cls.studentAttendance === "absent") row.absent += 1;
    else row.notMarked += 1;
  }
  return Array.from(rows.values());
}
