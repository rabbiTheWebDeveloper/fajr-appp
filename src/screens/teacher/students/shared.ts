import { useRef } from "react";

import { absoluteUrl, apiRaw } from "@/api/client";
import { MONTH_NAMES, academyClock, formatClock, formatDate } from "@/lib/format";
import type { Tone } from "@/theme/palette";

/* ───────────────────────── API shapes (traced from the route handlers) ───────────────────────── */

export interface DayTime {
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
}

/** A Schedule document as the list, lookup and update routes return it */
export interface StudentSchedule {
  _id?: string;
  weekly_days?: number;
  weekly_days_list?: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  day_times?: Partial<DayTime>[];
  type?: string;
  effectiveFrom?: string;
}

export interface CourseRef {
  _id?: string;
  id?: string;
  title?: string;
  level?: string;
  courseId?: string;
}

/** One row of GET /api/teacher-portal/students */
export interface TeacherStudent {
  _id: string;
  studentId?: string;
  fullName?: string;
  phone?: string;
  avatar?: string | null;
  gender?: string;
  status?: string;
  classStartingDate?: string;
  /** Populated ({ _id, title, level }) for directly assigned students; absent for enrolment-only rows */
  course?: CourseRef | string | null;
  schedule?: StudentSchedule | null;
  classStats?: { total?: number; done?: number; remaining?: number };
}

export interface StudentsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StudentsReply {
  success?: boolean;
  message?: string;
  students?: TeacherStudent[];
  pagination?: StudentsPagination;
}

export interface LookupStudent {
  _id: string;
  studentId?: string;
  fullName?: string;
  phone?: string;
  gender?: string;
  status?: string;
  course?: CourseRef | null;
  admissionDate?: string;
  avatar?: string | null;
}

/** POST /api/teacher-portal/students/lookup */
export interface LookupReply {
  success?: boolean;
  message?: string;
  student?: LookupStudent;
  schedule?: StudentSchedule | null;
  isAdmitted?: boolean;
  isSuspended?: boolean;
  isInactive?: boolean;
  isAlreadyAssigned?: boolean;
}

/** One assignment period, from GET /api/teacher-portal/student-history */
export interface HistoryEvent {
  student: {
    _id: string;
    fullName?: string;
    studentId?: string;
    phone?: string;
    course?: CourseRef | null;
    avatar?: string | null;
  };
  assignedAt?: string;
  unassignedAt?: string | null;
  note?: string;
  isActive?: boolean;
}

export interface HistoryReply {
  success?: boolean;
  message?: string;
  history?: HistoryEvent[];
}

/** The student the teacher is about to unassign, and what the WhatsApp statement needs afterwards */
export interface UnassignTarget {
  _id: string;
  fullName: string;
  studentId: string;
  phone?: string;
  course?: string;
}

export interface UnassignStatement {
  student: Omit<UnassignTarget, "_id">;
  note: string;
  teacherName: string;
  date: string;
}

/* ───────────────────────── Requests ───────────────────────── */

type SendResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * A mutating call that answers the way the web page reads it: the server's own `message` when the reply
 * is not `success: true` (whatever the status code), a fixed text when the server cannot be reached.
 */
export async function sendJson<T extends { success?: boolean; message?: string }>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body: unknown,
  fallback: string,
  networkMessage = "Network error. Please try again."
): Promise<SendResult<T>> {
  try {
    const reply = await apiRaw<T>(path, { method, body });
    if (reply.data?.success) return { ok: true, data: reply.data };
    return { ok: false, message: reply.data?.message || fallback };
  } catch {
    return { ok: false, message: networkMessage };
  }
}

/* ───────────────────────── Small helpers ───────────────────────── */

/** The latest non-null value: lets a sheet keep showing its subject while it slides closed */
export function useLast<T>(value: T | null): T | null {
  const last = useRef<T | null>(value);
  if (value !== null) last.current = value;
  return value ?? last.current;
}

export const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const DURATION_OPTIONS = [
  { label: "15 mins", value: 15 },
  { label: "30 mins", value: 30 },
  { label: "45 mins (Standard)", value: 45 },
  { label: "60 mins (1 hr)", value: 60 },
  { label: "90 mins (1.5 hrs)", value: 90 },
  { label: "120 mins (2 hrs)", value: 120 },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const normalizeDay = (day: unknown) => String(day ?? "").toLowerCase().trim();

/** "monday" -> "Monday" */
export function capitalize(text?: string | null): string {
  const value = String(text ?? "");
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

/** "wednesday" -> "Wed" */
export const dayShort = (day?: string | null) => capitalize(String(day ?? "").slice(0, 3));

/** Start time + minutes -> end time, both 24-hour "HH:MM" (wraps past midnight) */
export function calcEndTimeStr(start: string, durationMins = 45): string {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const total = (h || 0) * 60 + (m || 0) + Number(durationMins || 45);
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function statusTone(status?: string | null): Tone {
  switch (status) {
    case "inactive":
      return "neutral";
    case "completed":
      return "primary";
    case "suspended":
    case "discontinue":
    case "discontinued":
      return "danger";
    case "at-risk":
    case "pause":
    case "paused":
      return "warning";
    default:
      return "success";
  }
}

export function courseTitle(course: TeacherStudent["course"]): string {
  if (!course) return "";
  if (typeof course === "string") return course;
  return course.title || "";
}

function courseIdOf(course: TeacherStudent["course"]): string {
  if (!course) return "";
  if (typeof course === "string") return course;
  return course._id || course.id || "";
}

/** A stored avatar may be a full URL or a site path */
export function photoUrl(avatar?: string | null): string | null {
  if (!avatar || !avatar.trim()) return null;
  return /^(https?:|data:)/i.test(avatar) ? avatar : absoluteUrl(avatar);
}

/** "Nov 5, 2026, 2:30 PM" (academy time) */
export function formatHistoryDate(value?: string | null): string {
  if (!value) return "—";
  return `${formatDate(value, "medium")}, ${formatClock(value)}`;
}

/** Today in the academy, as the unassign statement writes it: "November 5, 2026" */
export function todayLongDate(): string {
  const now = academyClock();
  return `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
}

/** The per-day start times to show as pills: day_times when saved, else every weekly day at the default time */
export function scheduleDayTimes(schedule: StudentSchedule): { day?: string; startTime?: string }[] {
  if (schedule.day_times && schedule.day_times.length > 0) return schedule.day_times;
  return (schedule.weekly_days_list ?? []).map((day) => ({ day, startTime: schedule.startTime }));
}

/** The official statement the teacher sends the student on WhatsApp after unassigning them */
export function buildUnassignMessage(data: UnassignStatement): string {
  return `Assalamu Alaikum ${data.student.fullName},

We would like to inform you that your enrollment under *${data.teacherName}* at *Fajr Academy* has been concluded as of *${data.date}*.

📋 *Student Details:*
• Student ID: ${data.student.studentId}
${data.student.course ? `• Course: ${data.student.course}\n` : ""}• Status: Unassigned
${data.note ? `• Reason: ${data.note}\n` : ""}
Please contact the academy for further enrollment details or if you have any questions.

JazakAllahu Khairan 🌙
*Fajr Academy Team*`;
}

/* ───────────────────────── Schedule form (the body of PUT /students/[id]) ───────────────────────── */

export interface ScheduleForm {
  fullName: string;
  phone: string;
  course: string;
  gender: string;
  classStartingDate: string;
  weeklyDaysCount: string;
  weeklyDays: string[];
  startTime: string;
  endTime: string;
  duration: number;
  dayTimes: DayTime[];
  classType: string;
  effectiveFrom: string;
}

export const EMPTY_SCHEDULE_FORM: ScheduleForm = {
  fullName: "",
  phone: "",
  course: "",
  gender: "",
  classStartingDate: "",
  weeklyDaysCount: "",
  weeklyDays: [],
  startTime: "",
  endTime: "",
  duration: 45,
  dayTimes: [],
  classType: "live",
  effectiveFrom: "",
};

function isoDateKey(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

/** Fills the form from the student's saved details and schedule; every selected day gets its own time row */
export function buildEditForm(student: TeacherStudent): ScheduleForm {
  const sch = student.schedule;
  const days = (sch?.weekly_days_list ?? []).map(normalizeDay);
  const duration = Number(sch?.duration) || 45;
  const startTime = sch?.startTime || "";
  const endTime = sch?.endTime || calcEndTimeStr(startTime, duration);
  const saved = sch?.day_times ?? [];

  const dayTimes = days.map((day) => {
    const found = saved.find((dt) => normalizeDay(dt.day) === day);
    const dayStart = found?.startTime || startTime;
    const dayDuration = Number(found?.duration) || duration;
    return { day, startTime: dayStart, endTime: found?.endTime || calcEndTimeStr(dayStart, dayDuration), duration: dayDuration };
  });

  return {
    fullName: student.fullName || "",
    phone: student.phone || "",
    course: courseIdOf(student.course),
    gender: student.gender || "male",
    classStartingDate: isoDateKey(student.classStartingDate),
    weeklyDaysCount: sch?.weekly_days?.toString() || (days.length > 0 ? String(days.length) : ""),
    weeklyDays: days,
    startTime,
    endTime,
    duration,
    dayTimes,
    classType: sch?.type || "live",
    effectiveFrom: isoDateKey(sch?.effectiveFrom),
  };
}

/** A new default start time moves every selected day to it (each day keeps its own duration) */
export function withDefaultStart(form: ScheduleForm, newStart: string): ScheduleForm {
  const duration = form.duration || 45;
  return {
    ...form,
    startTime: newStart,
    endTime: calcEndTimeStr(newStart, duration),
    dayTimes: form.weeklyDays.map((day) => {
      const existing = form.dayTimes.find((dt) => normalizeDay(dt.day) === day);
      const dayDuration = existing?.duration || duration;
      return { day, startTime: newStart, duration: dayDuration, endTime: newStart ? calcEndTimeStr(newStart, dayDuration) : "" };
    }),
  };
}

/** A new default duration applies to every selected day */
export function withDefaultDuration(form: ScheduleForm, newDuration: number): ScheduleForm {
  const start = form.startTime || "";
  return {
    ...form,
    duration: newDuration,
    endTime: calcEndTimeStr(start, newDuration),
    dayTimes: form.dayTimes.map((dt) => ({ ...dt, duration: newDuration, endTime: calcEndTimeStr(dt.startTime || start, newDuration) })),
  };
}

/** Selecting a day adds it with the default time; the weekly-days count follows the number of selected days */
export function withDayToggled(form: ScheduleForm, day: string): ScheduleForm {
  const target = normalizeDay(day);
  const selected = form.weeklyDays.includes(target);
  const weeklyDays = selected ? form.weeklyDays.filter((d) => d !== target) : [...form.weeklyDays, target];
  const dayTimes = selected
    ? form.dayTimes.filter((dt) => dt.day !== target)
    : [
        ...form.dayTimes,
        {
          day: target,
          startTime: form.startTime || "",
          duration: form.duration || 45,
          endTime: form.endTime || calcEndTimeStr(form.startTime || "", form.duration || 45),
        },
      ];
  return { ...form, weeklyDays, weeklyDaysCount: weeklyDays.length > 0 ? String(weeklyDays.length) : "", dayTimes };
}

export function withDayTime(form: ScheduleForm, day: string, change: { startTime?: string; duration?: number }): ScheduleForm {
  const target = normalizeDay(day);
  return {
    ...form,
    dayTimes: form.dayTimes.map((dt) => {
      if (normalizeDay(dt.day) !== target) return dt;
      const startTime = change.startTime ?? dt.startTime;
      const duration = change.duration ?? (dt.duration || form.duration || 45);
      return { ...dt, startTime, duration, endTime: calcEndTimeStr(startTime, duration) };
    }),
  };
}

export function withDefaultAppliedToAll(form: ScheduleForm): ScheduleForm {
  if (!form.startTime) return form;
  const endTime = calcEndTimeStr(form.startTime, form.duration);
  return { ...form, dayTimes: form.weeklyDays.map((day) => ({ day: normalizeDay(day), startTime: form.startTime, duration: form.duration, endTime })) };
}

export function withDayCopiedToAll(form: ScheduleForm, sourceDay: string): ScheduleForm {
  const source = form.dayTimes.find((dt) => normalizeDay(dt.day) === normalizeDay(sourceDay));
  if (!source) return form;
  return {
    ...form,
    dayTimes: form.weeklyDays.map((day) => ({ day: normalizeDay(day), startTime: source.startTime, duration: source.duration, endTime: source.endTime })),
  };
}
