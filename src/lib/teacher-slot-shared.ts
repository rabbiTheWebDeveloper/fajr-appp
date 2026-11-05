// Shared by the server and the browser: no database imports here.

/** Monday first, the order a teacher reads a week in. */
export const SLOT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type SlotDay = (typeof SLOT_DAYS)[number];

export const DAY_LABELS: Record<SlotDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** The least a day's free time is counted over: 08:00 to 22:00, widened per teacher to reach their earliest and latest class. */
export const WORK_START = 8 * 60;
export const WORK_END = 22 * 60;
/** A gap shorter than this is not counted as a free slot. */
export const MIN_FREE_MINS = 30;
/** A standard class: how many of these fit in a free slot is shown as "classes it can hold". */
export const CLASS_MINS = 45;
/** A "scheduled" class session has a weekday and time but no date, so only recent ones are this week's classes. */
export const OPEN_SESSION_DAYS = 7;

export interface SlotRange {
  startMins: number;
  endMins: number;
}

export interface BookedSlot extends SlotRange {
  /** A weekly schedule, or a class session a teacher created */
  source: "schedule" | "session";
  studentName: string;
  studentCode: string;
  courseTitle: string;
}

export interface SlotDayData {
  day: SlotDay;
  windowStart: number;
  windowEnd: number;
  bookedCount: number;
  freeCount: number;
  bookedMinutes: number;
  freeMinutes: number;
  /** How many standard classes the free slots can still hold */
  fitCount: number;
  /** Classes on this day that have no usable time, so they cannot be placed */
  untimedCount: number;
  booked: BookedSlot[];
  free: SlotRange[];
}

export interface TeacherSlotsData {
  refreshedAt: string;
  windowStart: number;
  windowEnd: number;
  days: SlotDayData[];
  totals: { bookedCount: number; freeCount: number; bookedMinutes: number; freeMinutes: number; fitCount: number };
}

/** "14:30", "2:30 PM" or "9:05am" -> minutes from midnight, or null when it is not a time. */
export function parseTimeToMins(value: unknown): number | null {
  if (!value) return null;
  const text = String(value).trim().toUpperCase();
  const pm = text.includes("PM");
  const am = text.includes("AM");
  const [hourText, minuteText] = text.replace(/(AM|PM)/g, "").trim().split(":");
  let hour = parseInt(hourText || "0", 10);
  const minute = parseInt(minuteText || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (pm && hour < 12) hour += 12;
  if (am && hour === 12) hour = 0;
  const mins = hour * 60 + minute;
  return mins < 0 || mins > 1440 ? null : mins;
}

interface DayTime {
  day?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

/** The fields of a weekly Schedule document that say when it runs. */
export interface ScheduleTimes {
  dayOfWeek?: string;
  weekly_days_list?: string[];
  day_times?: DayTime[];
  startTime?: string;
  endTime?: string;
  duration?: number;
}

/** The hours a weekly schedule runs on one weekday, or null when it has no usable start time. */
export function scheduleTimes(schedule: ScheduleTimes, day: SlotDay): SlotRange | null {
  const dayTime = Array.isArray(schedule.day_times) ? schedule.day_times.find((d) => String(d?.day ?? "").toLowerCase() === day) : undefined;
  const duration = Number(dayTime?.duration) || Number(schedule.duration) || CLASS_MINS;
  const startMins = parseTimeToMins(dayTime?.startTime || schedule.startTime);
  if (startMins === null) return null;
  let endMins = parseTimeToMins(dayTime?.endTime || schedule.endTime);
  if (endMins === null || endMins <= startMins) endMins = startMins + duration;
  return { startMins, endMins };
}

/** Whether a weekly schedule has a class on this weekday, however the days are stored. */
export function runsOn(schedule: ScheduleTimes, day: SlotDay): boolean {
  return (
    String(schedule.dayOfWeek ?? "").toLowerCase() === day ||
    (Array.isArray(schedule.weekly_days_list) && schedule.weekly_days_list.some((d) => String(d).toLowerCase() === day)) ||
    (Array.isArray(schedule.day_times) && schedule.day_times.some((d) => String(d?.day ?? "").toLowerCase() === day))
  );
}

export interface WeeklySlot extends SlotRange {
  day: SlotDay;
}

/** Every weekly class of one schedule, Monday first. A day with no usable start time is left out. */
export function weeklySlotsOf(schedule: ScheduleTimes): WeeklySlot[] {
  const slots: WeeklySlot[] = [];
  for (const day of SLOT_DAYS) {
    if (!runsOn(schedule, day)) continue;
    const times = scheduleTimes(schedule, day);
    if (times) slots.push({ day, ...times });
  }
  return slots;
}

/** 14:30 -> "2:30 PM" */
export function minsToDisplay(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** 135 -> "2h 15m", 45 -> "45m", 120 -> "2h" */
export function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** The weekday of a date, Monday first (JavaScript counts Sunday as 0). */
export function slotDayOf(date: Date = new Date()): SlotDay {
  return SLOT_DAYS[(date.getDay() + 6) % 7];
}
