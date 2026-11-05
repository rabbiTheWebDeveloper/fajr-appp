// Shared by the server (the student dashboard query) and the browser (the dashboard page): no database imports here.
// Everything the dashboard shows is worked out from real class, payment and student records. Nothing is made up when a
// record is missing: a number that cannot be known is `null` and the page says so.
import { parseTimeToMins, type SlotDay } from "@/lib/teacher-slot-shared";

/** The academy runs on Bangladesh time (UTC+6, no daylight saving): the offset the dashboard has always used for "today". */
export const ACADEMY_UTC_OFFSET_MINS = 360;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const DEFAULT_CLASS_MINS = 45;
/** A class that says "in progress" for longer than this was forgotten by the teacher, not live */
const LIVE_MAX_HOURS = 6;
/** A payment the student has sent but the academy has not confirmed yet counts as "under review" for this long */
const REVIEW_WINDOW_DAYS = 14;

const WEEKDAYS: SlotDay[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const pad = (n: number) => String(n).padStart(2, "0");

/* ───────────────────────── time ───────────────────────── */

export interface AcademyClock {
  /** "2026-11-03" in academy time */
  dateKey: string;
  /** "2026-11" */
  monthKey: string;
  day: SlotDay;
  /** Minutes since midnight, academy time */
  minutes: number;
  /** 1 to 366 */
  dayOfYear: number;
}

/** The wall clock at the academy (Bangladesh) for an instant. */
export function academyClock(at: number | Date = Date.now()): AcademyClock {
  const ms = typeof at === "number" ? at : at.getTime();
  const t = new Date(ms + ACADEMY_UTC_OFFSET_MINS * MINUTE_MS);
  const year = t.getUTCFullYear();
  const month = t.getUTCMonth();
  return {
    dateKey: `${year}-${pad(month + 1)}-${pad(t.getUTCDate())}`,
    monthKey: `${year}-${pad(month + 1)}`,
    day: WEEKDAYS[t.getUTCDay()],
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
    dayOfYear: Math.floor((Date.UTC(year, month, t.getUTCDate()) - Date.UTC(year, 0, 1)) / DAY_MS) + 1,
  };
}

type Dateish = Date | string | number | null | undefined;

function toDate(value: Dateish): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The academy-time calendar day of a date, or null when it is not a date. */
export function dateKeyOf(value: Dateish): string | null {
  const date = toDate(value);
  return date ? academyClock(date).dateKey : null;
}

function dateKeyParts(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split("-").map(Number);
  return [y, m, d];
}

/** "2026-11-03" plus 2 days -> "2026-11-05" */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKeyParts(dateKey);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOfDateKey(dateKey: string): SlotDay {
  const [y, m, d] = dateKeyParts(dateKey);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthNameOf = (monthKey: string) => MONTH_NAMES[Number(monthKey.split("-")[1]) - 1] ?? monthKey;

/** "Good morning" by the hour of the person's own clock. */
export function greetingFor(hour: number): { text: string; emoji: string } {
  if (hour < 5) return { text: "Good Night", emoji: "🌙" };
  if (hour < 12) return { text: "Good Morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour < 20) return { text: "Good Evening", emoji: "🌇" };
  return { text: "Good Night", emoji: "🌙" };
}

/** 45 -> "45 min", 80 -> "1 h 20 min", 120 -> "2 h" */
export function humanizeMins(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/* ───────────────────────── records ───────────────────────── */

export type Attendance = "present" | "absent" | "not-marked";
export const attendanceOf = (value: unknown): Attendance => (value === "present" ? "present" : value === "absent" ? "absent" : "not-marked");

interface CourseLike {
  _id?: unknown;
  title?: string | null;
}
type CourseField = CourseLike | string | null | undefined;

const courseTitleOf = (c: CourseField): string => (typeof c === "string" ? c : c?.title ?? "") || "";
const courseIdOf = (c: CourseField): string => (c && typeof c === "object" && c._id ? String(c._id) : "");

/** The same course: equal ids when both have one, otherwise the same title ignoring case. */
export function sameCourse(a: CourseField, b: CourseField): boolean {
  const idA = courseIdOf(a);
  const idB = courseIdOf(b);
  if (idA && idB) return idA === idB;
  const titleA = courseTitleOf(a).trim().toLowerCase();
  const titleB = courseTitleOf(b).trim().toLowerCase();
  return !!titleA && titleA === titleB;
}

/** A class session as the portal queries return it (completed ones are the history). */
export interface ClassRecord {
  _id?: unknown;
  classId?: string;
  status?: string;
  classType?: string | null;
  studentAttendance?: string | null;
  startedAt?: Dateish;
  endedAt?: Dateish;
  createdAt?: Dateish;
  topic?: string | null;
  notes?: string | null;
  actualDuration?: number | null;
  duration?: number | null;
  course?: CourseField;
  teacher?: { fullName?: string | null } | null;
}

/** A live, paused or scheduled session (see getStudentClasses `activeSessions`). */
export interface ActiveSessionRow {
  _id?: unknown;
  status?: string;
  classType?: string | null;
  course?: CourseField;
  teacher?: { fullName?: string | null } | null;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  duration?: number | null;
  startedAt?: Dateish;
  meetLink?: string | null;
}

/** One class of the weekly routine (see getStudentClasses `weeklySchedule`). */
export interface WeeklyClassRow {
  id: string;
  courseId?: string | null;
  courseTitle: string;
  teacherName?: string;
  day: SlotDay;
  startMins: number;
  endMins: number;
  /** ISO date; set only while the schedule has not started yet */
  startsOn?: string | null;
  meetLink?: string | null;
}

/** The day a class was held: when it started, else ended, else was created. */
export function recordDate(r: Pick<ClassRecord, "startedAt" | "endedAt" | "createdAt">): Date | null {
  return toDate(r.startedAt) ?? toDate(r.endedAt) ?? toDate(r.createdAt);
}

const recordMinutes = (r: ClassRecord) => r.actualDuration || r.duration || DEFAULT_CLASS_MINS;
const completed = (history: ClassRecord[]) => history.filter((r) => r.status === undefined || r.status === "completed");
const newestFirst = (a: ClassRecord, b: ClassRecord) => (recordDate(b)?.getTime() ?? -Infinity) - (recordDate(a)?.getTime() ?? -Infinity);

/* ───────────────────────── numbers ───────────────────────── */

/**
 * Classes in a row the student was marked present, newest first. An absence ends the streak.
 * A class the teacher did not mark is skipped: it proves nothing either way. No classes, no streak: 0.
 */
export function computeStreak(history: ClassRecord[]): number {
  let streak = 0;
  for (const record of [...completed(history)].sort(newestFirst)) {
    const attendance = attendanceOf(record.studentAttendance);
    if (attendance === "present") streak++;
    else if (attendance === "absent") break;
  }
  return streak;
}

export interface MonthAttendance {
  present: number;
  absent: number;
  /** Every class held that month, marked or not */
  held: number;
  /** Of the classes that were marked; null when none was marked yet (there is nothing to take a percentage of) */
  percentage: number | null;
}

export function monthAttendance(history: ClassRecord[], monthKey: string): MonthAttendance {
  let present = 0;
  let absent = 0;
  let held = 0;
  for (const record of completed(history)) {
    const date = recordDate(record);
    if (!date || academyClock(date).monthKey !== monthKey) continue;
    held++;
    const attendance = attendanceOf(record.studentAttendance);
    if (attendance === "present") present++;
    else if (attendance === "absent") absent++;
  }
  const marked = present + absent;
  return { present, absent, held, percentage: marked > 0 ? Math.round((present / marked) * 100) : null };
}

export const learningMinutesOf = (history: ClassRecord[]) => completed(history).reduce((sum, r) => sum + recordMinutes(r), 0);

/* ───────────────────────── today ───────────────────────── */

export type TodayState = "live" | "paused" | "done" | "pending";

export interface TodayClass {
  key: string;
  courseTitle: string;
  teacherName: string;
  startMins: number;
  endMins: number;
  state: TodayState;
  /** Set for a class that is done */
  attendance: Attendance | null;
  meetLink: string | null;
  /** "makeup" or "retake" for a class outside the usual routine */
  classType: string | null;
}

const isLiveStatus = (status?: string) => status === "in-progress" || status === "paused";
const extraType = (type?: string | null) => (type === "makeup" || type === "retake" ? type : null);

function startedInTime(session: ActiveSessionRow, nowMs: number): boolean {
  const startedAt = toDate(session.startedAt);
  return !startedAt || nowMs - startedAt.getTime() <= LIVE_MAX_HOURS * 60 * MINUTE_MS;
}

/** A weekly class is in force on a date unless its schedule has not started by then. */
const slotInForce = (slot: WeeklyClassRow, dateKey: string) => !slot.startsOn || (dateKeyOf(slot.startsOn) ?? "") <= dateKey;

export function buildTodayClasses(input: { weekly: WeeklyClassRow[]; history: ClassRecord[]; active: ActiveSessionRow[]; clock: AcademyClock; nowMs?: number }): TodayClass[] {
  const { weekly, history, active, clock } = input;
  const nowMs = input.nowMs ?? Date.now();
  const slots = weekly.filter((w) => w.day === clock.day && slotInForce(w, clock.dateKey)).sort((a, b) => a.startMins - b.startMins);
  const heldToday = completed(history)
    .filter((r) => dateKeyOf(recordDate(r)) === clock.dateKey)
    .sort((a, b) => -newestFirst(a, b));
  const usedHeld = new Set<ClassRecord>();
  const usedActive = new Set<ActiveSessionRow>();
  const out: TodayClass[] = [];

  for (const slot of slots) {
    const ref = { _id: slot.courseId, title: slot.courseTitle };
    const base = { key: slot.id, courseTitle: slot.courseTitle, teacherName: slot.teacherName ?? "", startMins: slot.startMins, endMins: slot.endMins, classType: null };

    const live = active.find((s) => !usedActive.has(s) && isLiveStatus(s.status) && startedInTime(s, nowMs) && sameCourse(s.course, ref));
    if (live) {
      usedActive.add(live);
      out.push({ ...base, state: live.status === "paused" ? "paused" : "live", attendance: null, meetLink: live.meetLink ?? slot.meetLink ?? null });
      continue;
    }
    const record = heldToday.find((r) => !usedHeld.has(r) && sameCourse(r.course, ref));
    if (record) {
      usedHeld.add(record);
      out.push({ ...base, state: "done", attendance: attendanceOf(record.studentAttendance), meetLink: null });
      continue;
    }
    // A class the teacher has already set up for today carries the meeting link
    const scheduled = active.find((s) => !usedActive.has(s) && s.status === "scheduled" && s.dayOfWeek === clock.day && sameCourse(s.course, ref));
    if (scheduled) usedActive.add(scheduled);
    out.push({ ...base, state: "pending", attendance: null, meetLink: scheduled?.meetLink ?? slot.meetLink ?? null });
  }

  // Classes outside the weekly routine: one that is live right now, a make-up or retake set up for today
  for (const session of active) {
    if (usedActive.has(session)) continue;
    const live = isLiveStatus(session.status) && startedInTime(session, nowMs);
    const scheduledToday = session.status === "scheduled" && session.dayOfWeek === clock.day;
    if (!live && !scheduledToday) continue;
    const startMins = parseTimeToMins(session.startTime) ?? clock.minutes;
    const endMins = parseTimeToMins(session.endTime) ?? startMins + (Number(session.duration) || DEFAULT_CLASS_MINS);
    out.push({
      key: `session:${String(session._id ?? out.length)}`,
      courseTitle: courseTitleOf(session.course) || "Class",
      teacherName: session.teacher?.fullName ?? "",
      startMins,
      endMins: endMins > startMins ? endMins : startMins + DEFAULT_CLASS_MINS,
      state: live ? (session.status === "paused" ? "paused" : "live") : "pending",
      attendance: null,
      meetLink: session.meetLink ?? null,
      classType: extraType(session.classType),
    });
  }
  // Classes held today that no weekly slot explains
  for (const record of heldToday) {
    if (usedHeld.has(record)) continue;
    const startMins = academyClock(recordDate(record) as Date).minutes;
    out.push({
      key: `held:${String(record._id ?? record.classId ?? out.length)}`,
      courseTitle: courseTitleOf(record.course) || "Class",
      teacherName: record.teacher?.fullName ?? "",
      startMins,
      endMins: startMins + recordMinutes(record),
      state: "done",
      attendance: attendanceOf(record.studentAttendance),
      meetLink: null,
      classType: extraType(record.classType),
    });
  }
  return out.sort((a, b) => a.startMins - b.startMins);
}

export type ClassPhase = "live" | "paused" | "done" | "starting" | "upcoming" | "ended";

/** What a class of today is doing at `nowMins` (academy time). A class with no record that is past its time simply "ended". */
export function classPhase(c: Pick<TodayClass, "state" | "startMins" | "endMins">, nowMins: number): ClassPhase {
  if (c.state !== "pending") return c.state;
  if (nowMins >= c.endMins) return "ended";
  if (nowMins >= c.startMins) return "starting";
  return "upcoming";
}

export interface NextClass {
  daysAhead: number;
  day: SlotDay;
  startMins: number;
  endMins: number;
  courseTitle: string;
  teacherName: string;
}

/** The first class of the weekly routine on a day after today (for when nothing is left today). */
export function nextClassAfterToday(weekly: WeeklyClassRow[], clock: AcademyClock): NextClass | null {
  for (let ahead = 1; ahead <= 7; ahead++) {
    const dateKey = shiftDateKey(clock.dateKey, ahead);
    const day = weekdayOfDateKey(dateKey);
    const first = weekly.filter((w) => w.day === day && slotInForce(w, dateKey)).sort((a, b) => a.startMins - b.startMins)[0];
    if (first) return { daysAhead: ahead, day, startMins: first.startMins, endMins: first.endMins, courseTitle: first.courseTitle, teacherName: first.teacherName ?? "" };
  }
  return null;
}

/* ───────────────────────── the week around today ───────────────────────── */

export type WeekDayState = "attended" | "absent" | "held" | "missed" | "upcoming" | "rest";

export interface WeekDay {
  dateKey: string;
  day: SlotDay;
  label: string;
  dayOfMonth: number;
  isToday: boolean;
  planned: number;
  held: number;
  present: number;
  absent: number;
  state: WeekDayState;
}

const DAY_LABELS: Record<SlotDay, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

/** Three days back, today and three days ahead: what was attended, what was missed and what is coming. */
export function buildWeek(input: { weekly: WeeklyClassRow[]; history: ClassRecord[]; clock: AcademyClock; past?: number; ahead?: number }): WeekDay[] {
  const { weekly, history, clock } = input;
  const past = input.past ?? 3;
  const ahead = input.ahead ?? 3;
  const byDate = new Map<string, ClassRecord[]>();
  for (const record of completed(history)) {
    const key = dateKeyOf(recordDate(record));
    if (key) byDate.set(key, [...(byDate.get(key) ?? []), record]);
  }
  const days: WeekDay[] = [];
  for (let offset = -past; offset <= ahead; offset++) {
    const dateKey = shiftDateKey(clock.dateKey, offset);
    const day = weekdayOfDateKey(dateKey);
    const planned = weekly.filter((w) => w.day === day && slotInForce(w, dateKey)).length;
    const records = byDate.get(dateKey) ?? [];
    const present = records.filter((r) => attendanceOf(r.studentAttendance) === "present").length;
    const absent = records.filter((r) => attendanceOf(r.studentAttendance) === "absent").length;
    let state: WeekDayState;
    if (records.length > 0) state = absent > 0 ? "absent" : present > 0 ? "attended" : "held";
    else if (planned > 0) state = dateKey < clock.dateKey ? "missed" : "upcoming";
    else state = "rest";
    days.push({ dateKey, day, label: DAY_LABELS[day], dayOfMonth: Number(dateKey.slice(8)), isToday: dateKey === clock.dateKey, planned, held: records.length, present, absent, state });
  }
  return days;
}

/* ───────────────────────── recent classes ───────────────────────── */

export interface RecentClass {
  id: string;
  courseTitle: string;
  teacherName: string;
  /** What the teacher wrote; null when they wrote nothing */
  topic: string | null;
  notes: string | null;
  attendance: Attendance;
  /** ISO time the class was held */
  at: string;
  minutes: number;
}

const clean = (text?: string | null) => (typeof text === "string" && text.trim() ? text.trim() : null);

export function recentClassesOf(history: ClassRecord[], limit = 3): RecentClass[] {
  return [...completed(history)]
    .filter((r) => recordDate(r))
    .sort(newestFirst)
    .slice(0, limit)
    .map((r) => ({
      id: String(r._id ?? r.classId ?? ""),
      courseTitle: courseTitleOf(r.course) || "Class",
      teacherName: r.teacher?.fullName ?? "",
      topic: clean(r.topic),
      notes: clean(r.notes),
      attendance: attendanceOf(r.studentAttendance),
      at: (recordDate(r) as Date).toISOString(),
      minutes: recordMinutes(r),
    }));
}

/* ───────────────────────── fees ───────────────────────── */

export interface PaymentRow {
  amount?: number;
  status?: string;
  type?: string;
  month?: string;
  paidAt?: Dateish;
  createdAt?: Dateish;
}

export interface FeeSummary {
  monthlyFee: number;
  /** The balance the Payments page shows as "current balance due" */
  monthlyDue: number;
  /** The newest payment the student sent that the academy has not confirmed yet */
  underReview: { amount: number; month: string } | null;
  lastPaid: { amount: number; month: string; at: string } | null;
}

const paymentDate = (p: PaymentRow) => toDate(p.paidAt) ?? toDate(p.createdAt);

export function feeSummary(input: { monthlyFee?: number | null; monthlyDue?: number | null; payments: PaymentRow[]; nowMs?: number }): FeeSummary {
  const nowMs = input.nowMs ?? Date.now();
  const real = input.payments.filter((p) => p.type !== "refund");
  const newest = (a: PaymentRow, b: PaymentRow) => (paymentDate(b)?.getTime() ?? 0) - (paymentDate(a)?.getTime() ?? 0);
  const review = real
    .filter((p) => p.status === "pending" && (paymentDate(p)?.getTime() ?? 0) >= nowMs - REVIEW_WINDOW_DAYS * DAY_MS)
    .sort(newest)[0];
  const paid = real.filter((p) => p.status === "completed").sort(newest)[0];
  return {
    monthlyFee: Number(input.monthlyFee) || 0,
    monthlyDue: Math.max(0, Number(input.monthlyDue) || 0),
    underReview: review ? { amount: Number(review.amount) || 0, month: review.month || "" } : null,
    lastPaid: paid && paymentDate(paid) ? { amount: Number(paid.amount) || 0, month: paid.month || "", at: (paymentDate(paid) as Date).toISOString() } : null,
  };
}

/* ───────────────────────── the whole dashboard ───────────────────────── */

export const DAILY_INSPIRATIONS = [
  { arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", english: "The best among you are those who learn the Quran and teach it.", source: "Sahih al-Bukhari 5027" },
  { arabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ", english: "Seeking knowledge is an obligation upon every Muslim.", source: "Sunan Ibn Majah 224" },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", english: "Indeed, with hardship comes ease.", source: "Surah Ash-Sharh 94:6" },
  { arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", english: "And say: 'My Lord, increase me in knowledge.'", source: "Surah Taha 20:114" },
  { arabic: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ", english: "Whoever takes a path upon which he seeks knowledge, Allah makes the path to Paradise easy for him.", source: "Sahih Muslim 2699" },
];

export interface DashboardStats {
  enrolledCourses: number;
  /** Classes in the weekly routine */
  weeklyClasses: number;
  /** Average over the courses; null when there are no courses */
  avgProgress: number | null;
  completedClasses: number;
  learningMinutes: number;
  streakCount: number;
  monthlyAttendance: MonthAttendance & { monthLabel: string };
  fee: FeeSummary;
  todayClasses: TodayClass[];
  nextClass: NextClass | null;
  week: WeekDay[];
  recentClasses: RecentClass[];
  dailyInspiration: { arabic: string; english: string; source: string };
  /** Changes every day; picks the du'a of the day */
  dayIndex: number;
}

export function buildDashboardStats(input: {
  classes: { progress?: number | null }[];
  history: ClassRecord[];
  activeSessions: ActiveSessionRow[];
  weeklySchedule: WeeklyClassRow[];
  student?: { monthlyFee?: number | null; monthlyDue?: number | null } | null;
  payments: PaymentRow[];
  nowMs?: number;
}): DashboardStats {
  const nowMs = input.nowMs ?? Date.now();
  const clock = academyClock(nowMs);
  const { classes, history, weeklySchedule } = input;
  const todayClasses = buildTodayClasses({ weekly: weeklySchedule, history, active: input.activeSessions, clock, nowMs });
  const progressSum = classes.reduce((sum, c) => sum + (Number(c.progress) || 0), 0);
  return {
    enrolledCourses: classes.length,
    weeklyClasses: weeklySchedule.length,
    avgProgress: classes.length > 0 ? Math.round(progressSum / classes.length) : null,
    completedClasses: completed(history).length,
    learningMinutes: learningMinutesOf(history),
    streakCount: computeStreak(history),
    monthlyAttendance: { ...monthAttendance(history, clock.monthKey), monthLabel: monthNameOf(clock.monthKey) },
    fee: feeSummary({ monthlyFee: input.student?.monthlyFee, monthlyDue: input.student?.monthlyDue, payments: input.payments, nowMs }),
    todayClasses,
    nextClass: nextClassAfterToday(weeklySchedule, clock),
    week: buildWeek({ weekly: weeklySchedule, history, clock }),
    recentClasses: recentClassesOf(history, 3),
    dailyInspiration: DAILY_INSPIRATIONS[clock.dayOfYear % DAILY_INSPIRATIONS.length],
    dayIndex: clock.dayOfYear,
  };
}
