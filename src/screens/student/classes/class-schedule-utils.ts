// Pure helpers for the Active Courses tab: when each class next happens, what is live, and what to show for a course.
// A weekly class has a weekday and a time but no date, so "next" is worked out here from the clock.
// Ported from the website's class-schedule-utils.ts. The one difference: the website reads "now" on the browser's own
// clock; the app reads it on the academy's clock (Bangladesh, UTC+6), the clock the class times are written in, so
// "Starts in 25 min" is right on a phone set to another time zone too.
import { ACADEMY_UTC_OFFSET_MINUTES, academyClock, academyDayIndex, academyMinutesNow } from "@/lib/format";
import { SLOT_DAYS, durationLabel, minsToDisplay, parseTimeToMins, type SlotDay } from "@/lib/teacher-slot-shared";
import { conductedAt, type HistorySession } from "@/screens/student/classes/class-history-utils";

/** One class of the weekly routine, as the classes endpoint sends it */
export interface WeeklyClass {
  id: string;
  courseId?: string | null;
  courseTitle: string;
  teacherName?: string;
  day: SlotDay;
  startMins: number;
  endMins: number;
  /** ISO date; set only while the schedule has not started yet */
  startsOn?: string | null;
}

/** A live, paused or just-scheduled class session, as the classes endpoint sends it */
export interface ActiveSession {
  _id: string;
  status?: "scheduled" | "in-progress" | "paused" | string;
  course?: { _id?: string; title?: string } | string | null;
  teacher?: { fullName?: string } | null;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  meetLink?: string | null;
}

export interface CourseRef {
  _id?: string | null;
  title?: string | null;
}

export interface ClassItem {
  key: string;
  state: "live" | "paused" | "scheduled";
  courseId: string | null;
  courseTitle: string;
  teacherName: string;
  day: SlotDay;
  startMins: number;
  endMins: number;
  /** The next time it starts (for a live class: now) */
  startsAt: Date;
  endsAt: Date;
  meetLink: string | null;
  /** The class session behind it, when the teacher has made one (it can carry the meeting link) */
  session: ActiveSession | null;
  /** When the weekly schedule has not started yet, the day it does */
  startsOn: Date | null;
}

const DEFAULT_MINS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACADEMY_OFFSET_MS = ACADEMY_UTC_OFFSET_MINUTES * 60_000;

const lower = (value?: string | null) => (value ?? "").trim().toLowerCase();

function refOf(course: ActiveSession["course"]): CourseRef {
  if (!course) return {};
  return typeof course === "string" ? { title: course } : { _id: course._id ? String(course._id) : null, title: course.title };
}

/** The same course: equal ids when both have one, otherwise the same title ignoring case. */
export function sameCourse(a: CourseRef, b: CourseRef): boolean {
  if (a._id && b._id && String(a._id) === String(b._id)) return true;
  const titleA = lower(a.title);
  return !!titleA && titleA === lower(b.title);
}

/** The real instant of a day and minute on the academy's clock. Like the Date constructor, a day or minute past its range rolls over. */
const academyAt = (year: number, month: number, day: number, mins = 0) => new Date(Date.UTC(year, month, day, 0, mins) - ACADEMY_OFFSET_MS);

const startOfDay = (d: Date) => {
  const clock = academyClock(d);
  return academyAt(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate());
};
const minutesOfDay = (d: Date) => academyMinutesNow(d);
/** The weekday of a date at the academy, Monday first (0 = Monday) */
const weekdayIndex = (d: Date) => (academyDayIndex(d) + 6) % 7;
/** Calendar days from `from` to `to` (0 = the same day) */
const dayGap = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

const weekdayName = (day: SlotDay) => day.charAt(0).toUpperCase() + day.slice(1);
export const dayName = weekdayName;
export const dayShort = (day: SlotDay) => weekdayName(day).slice(0, 3);

/**
 * The next time a weekly class starts. A class that is on today and not over yet counts as today, even if it has
 * begun; one that is over moves to next week. `notBefore` holds it back until a schedule that starts later has begun.
 */
export function nextOccurrence(day: SlotDay, startMins: number, endMins: number, now: Date, notBefore?: Date | null): { startsAt: Date; endsAt: Date } {
  const today = weekdayIndex(now);
  let ahead = (SLOT_DAYS.indexOf(day) - today + 7) % 7;
  if (ahead === 0 && minutesOfDay(now) >= endMins) ahead = 7;
  const clock = academyClock(now);
  const at = (days: number, mins: number) => academyAt(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate() + days, mins);
  let startsAt = at(ahead, startMins);
  if (notBefore) {
    const earliest = startOfDay(notBefore).getTime();
    while (startsAt.getTime() < earliest) {
      ahead += 7;
      startsAt = at(ahead, startMins);
    }
  }
  return { startsAt, endsAt: at(ahead, endMins) };
}

function sessionTimes(session: ActiveSession): { day: SlotDay; startMins: number; endMins: number } | null {
  const day = lower(session.dayOfWeek) as SlotDay;
  const startMins = parseTimeToMins(session.startTime);
  if (!SLOT_DAYS.includes(day) || startMins === null) return null;
  let endMins = parseTimeToMins(session.endTime);
  if (endMins === null || endMins <= startMins) endMins = startMins + (Number(session.duration) || DEFAULT_MINS);
  return { day, startMins, endMins };
}

const linkOf = (session: ActiveSession | null) => (session?.meetLink && session.meetLink.trim() ? session.meetLink.trim() : null);

/**
 * Everything the student can do next, in order: live and paused classes first, then each weekly class at its next
 * occurrence. A class session the teacher made for one of those weekly classes is joined to it (it carries the link);
 * a session that matches none (a make-up class) stands on its own.
 */
export function buildClassPlan(input: { weekly: WeeklyClass[]; sessions: ActiveSession[]; now: Date }): ClassItem[] {
  const { weekly, sessions, now } = input;
  const live: ClassItem[] = [];
  const upcoming: ClassItem[] = [];

  const slotKey = (course: CourseRef, day: SlotDay, startMins: number) => `${course._id || lower(course.title)}|${day}|${startMins}`;

  for (const session of sessions) {
    if (session.status !== "in-progress" && session.status !== "paused") continue;
    const course = refOf(session.course);
    const times = sessionTimes(session) ?? { day: SLOT_DAYS[weekdayIndex(now)], startMins: minutesOfDay(now), endMins: minutesOfDay(now) + DEFAULT_MINS };
    live.push({
      key: `live:${session._id}`,
      state: session.status === "paused" ? "paused" : "live",
      courseId: course._id ?? null,
      courseTitle: course.title || "Live class",
      teacherName: session.teacher?.fullName || "",
      ...times,
      startsAt: now,
      endsAt: new Date(now.getTime() + (times.endMins - times.startMins) * 60000),
      meetLink: linkOf(session),
      session,
      startsOn: null,
    });
  }
  const liveSlots = new Set(live.map((l) => slotKey({ _id: l.courseId, title: l.courseTitle }, l.day, l.startMins)));

  for (const slot of weekly) {
    const startsOn = slot.startsOn ? new Date(slot.startsOn) : null;
    const { startsAt, endsAt } = nextOccurrence(slot.day, slot.startMins, slot.endMins, now, startsOn);
    const course: CourseRef = { _id: slot.courseId, title: slot.courseTitle };
    // The class that is on right now is already shown as live
    if (liveSlots.has(slotKey(course, slot.day, slot.startMins)) && dayGap(now, startsAt) === 0) continue;
    upcoming.push({
      key: `weekly:${slot.id}`,
      state: "scheduled",
      courseId: slot.courseId ?? null,
      courseTitle: slot.courseTitle || "Class",
      teacherName: slot.teacherName || "",
      day: slot.day,
      startMins: slot.startMins,
      endMins: slot.endMins,
      startsAt,
      endsAt,
      meetLink: null,
      session: null,
      startsOn,
    });
  }

  for (const session of sessions) {
    if (session.status !== "scheduled") continue;
    const times = sessionTimes(session);
    if (!times) continue;
    const course = refOf(session.course);
    const match = upcoming.find((u) => !u.session && u.day === times.day && u.startMins === times.startMins && sameCourse({ _id: u.courseId, title: u.courseTitle }, course));
    if (match) {
      match.session = session;
      match.meetLink = linkOf(session);
      if (!match.teacherName) match.teacherName = session.teacher?.fullName || "";
      continue;
    }
    const { startsAt, endsAt } = nextOccurrence(times.day, times.startMins, times.endMins, now);
    upcoming.push({
      key: `session:${session._id}`,
      state: "scheduled",
      courseId: course._id ?? null,
      courseTitle: course.title || "Class",
      teacherName: session.teacher?.fullName || "",
      ...times,
      startsAt,
      endsAt,
      meetLink: linkOf(session),
      session,
      startsOn: null,
    });
  }

  upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.courseTitle.localeCompare(b.courseTitle));
  live.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
  return [...live, ...upcoming];
}

/** "Today", "Tomorrow", the weekday ("Wednesday"), or "Next Monday" for the same weekday a week on. */
export function dayHeading(startsAt: Date, now: Date): string {
  const gap = dayGap(now, startsAt);
  if (gap <= 0) return "Today";
  if (gap === 1) return "Tomorrow";
  const name = weekdayName(SLOT_DAYS[weekdayIndex(startsAt)]);
  return gap >= 7 ? `Next ${name}` : name;
}

export interface Countdown {
  text: string;
  /** "now": its time has begun; "soon": within the hour; "later" otherwise */
  tone: "now" | "soon" | "later";
}

/** How far off a class is, in the words a student wants: "Starts in 25 min", "Starts in 2h 10m", "Class time now". */
export function countdownText(startsAt: Date, endsAt: Date, now: Date): Countdown {
  if (now.getTime() >= startsAt.getTime() && now.getTime() < endsAt.getTime()) return { text: "Class time now", tone: "now" };
  const mins = Math.max(1, Math.ceil((startsAt.getTime() - now.getTime()) / 60000));
  if (mins < 60) return { text: `Starts in ${mins} min`, tone: "soon" };
  const gap = dayGap(now, startsAt);
  if (gap === 0) return { text: `Starts in ${durationLabel(mins)}`, tone: "later" };
  return { text: gap === 1 ? "Tomorrow" : `In ${gap} days`, tone: "later" };
}

export const timeRange = (item: Pick<ClassItem, "startMins" | "endMins">) => `${minsToDisplay(item.startMins)} – ${minsToDisplay(item.endMins)}`;

/** "Mon 2:00 PM": one weekly class, short. */
export const slotShort = (slot: Pick<WeeklyClass, "day" | "startMins">) => `${dayShort(slot.day)} ${minsToDisplay(slot.startMins)}`;

export interface CourseFacts {
  /** The weekly times of the course, Monday first, each once */
  times: string[];
  next: ClassItem | null;
  live: ClassItem | null;
  completed: number;
  lastClass: Date | null;
}

/** What a course card needs besides the course itself. */
export function courseFacts(course: CourseRef, plan: ClassItem[], weekly: WeeklyClass[], history: HistorySession[]): CourseFacts {
  const mine = weekly.filter((w) => sameCourse(course, { _id: w.courseId, title: w.courseTitle }));
  const seen = new Set<string>();
  const times = [...mine]
    .sort((a, b) => SLOT_DAYS.indexOf(a.day) - SLOT_DAYS.indexOf(b.day) || a.startMins - b.startMins)
    .map(slotShort)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)));

  const ofCourse = plan.filter((p) => sameCourse(course, { _id: p.courseId, title: p.courseTitle }));
  const done = history.filter((h) => sameCourse(course, { _id: h.course?._id, title: h.course?.title }));
  let lastClass: Date | null = null;
  for (const h of done) {
    const when = conductedAt(h);
    if (when && (!lastClass || when > lastClass)) lastClass = when;
  }
  return {
    times,
    next: ofCourse.find((p) => p.state === "scheduled") ?? null,
    live: ofCourse.find((p) => p.state === "live" || p.state === "paused") ?? null,
    completed: done.length,
    lastClass,
  };
}
