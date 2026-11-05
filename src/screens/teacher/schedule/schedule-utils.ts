import { academyDayIndex } from "@/lib/format";
import { SLOT_DAYS, type SlotDay } from "@/lib/teacher-slot-shared";

/** The student of a weekly class, as GET /api/teacher-portal/schedule populates it */
export interface ScheduleStudent {
  _id?: string;
  fullName?: string;
  email?: string;
}

export interface ScheduleCourse {
  _id?: string;
  title?: string;
}

export interface DayTime {
  day?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

/** One weekly Schedule document of the teacher */
export interface ScheduleItem {
  _id: string;
  dayOfWeek?: string;
  weekly_days_list?: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  day_times?: DayTime[];
  type?: "live" | "recorded" | "hybrid";
  course?: ScheduleCourse | null;
  student?: ScheduleStudent | null;
  isActive?: boolean;
}

export interface ScheduleReply {
  success?: boolean;
  schedules?: ScheduleItem[];
  message?: string;
}

export type SlotStatus = "ongoing" | "upcoming" | "completed" | "free";

/** One row of a day's timeline: a class, or the free time between two classes */
export interface TimeSlot {
  isFree: boolean;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  item?: ScheduleItem;
  status?: SlotStatus;
}

/** The timeline looks for free time between 8:00 AM and 8:00 PM */
const TIMELINE_START = 8 * 60;
const TIMELINE_END = 20 * 60;

/** Converts time strings like "09:00", "9:30 AM", "14:15", "2:30 PM" to minutes from midnight */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");

  const parts = str.replace(/(AM|PM)/g, "").trim().split(":");
  let hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Formats minutes from midnight into a 12-hour AM/PM string */
export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m < 10 ? `0${m}` : m} ${period}`;
}

/** Pretty print a raw time string */
export function formatTime(timeStr?: string): string {
  if (!timeStr) return "TBD";
  return minutesToDisplay(parseTimeToMinutes(timeStr));
}

/** Today's weekday in the academy (Bangladesh time), Monday first */
export function todaySlotDay(now: Date): SlotDay {
  return SLOT_DAYS[(academyDayIndex(now) + 6) % 7];
}

/** The classes of one weekday, each with the start, end and length that apply on that day */
export function schedulesForDay(schedules: ScheduleItem[], dayKey: string): ScheduleItem[] {
  return schedules
    .filter((s) => {
      const singleDayMatch = !!s.dayOfWeek && s.dayOfWeek.toLowerCase() === dayKey;
      const listDayMatch = Array.isArray(s.weekly_days_list) && s.weekly_days_list.some((d) => String(d).toLowerCase() === dayKey);
      const dayTimesMatch = Array.isArray(s.day_times) && s.day_times.some((dt) => dt.day?.toLowerCase() === dayKey);
      return singleDayMatch || listDayMatch || dayTimesMatch;
    })
    .map((s) => {
      // A day can have its own time; otherwise the schedule's general time applies
      const dt = Array.isArray(s.day_times) ? s.day_times.find((d) => d.day?.toLowerCase() === dayKey) : undefined;

      const startTime = dt?.startTime || s.startTime || "";
      const duration = Number(dt?.duration) || Number(s.duration) || 45;
      const endTime = dt?.endTime || s.endTime || (startTime ? minutesToDisplay(parseTimeToMinutes(startTime) + duration) : "");

      return { ...s, startTime, endTime, duration };
    });
}

/** A day's classes in time order with the free gaps between them. `currentMinutes` only matters for today. */
export function buildTimelineForDay(schedules: ScheduleItem[], dayKey: string, todayKey: string, currentMinutes: number): TimeSlot[] {
  const sorted = [...schedulesForDay(schedules, dayKey)].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  if (sorted.length === 0) return [];

  const slots: TimeSlot[] = [];
  const isToday = dayKey === todayKey;
  let lastEndMinutes = TIMELINE_START;

  for (const item of sorted) {
    const startMins = parseTimeToMinutes(item.startTime);
    const endMins = parseTimeToMinutes(item.endTime) || startMins + 60;

    // A gap of more than 15 minutes before this class counts as free time
    if (startMins > lastEndMinutes + 15) {
      slots.push({
        isFree: true,
        startTime: minutesToDisplay(lastEndMinutes),
        endTime: minutesToDisplay(startMins),
        startMinutes: lastEndMinutes,
        endMinutes: startMins,
        status: "free",
      });
    }

    // Only today's classes can be live or over; every other day is simply scheduled
    let status: SlotStatus = "upcoming";
    if (isToday) {
      if (currentMinutes >= startMins && currentMinutes < endMins) status = "ongoing";
      else if (currentMinutes >= endMins) status = "completed";
    }

    slots.push({
      isFree: false,
      startTime: item.startTime ? formatTime(item.startTime) : minutesToDisplay(startMins),
      endTime: item.endTime ? formatTime(item.endTime) : minutesToDisplay(endMins),
      startMinutes: startMins,
      endMinutes: endMins,
      item,
      status,
    });

    lastEndMinutes = Math.max(lastEndMinutes, endMins);
  }

  // Free time after the last class, when at least half an hour is left before 8:00 PM
  if (lastEndMinutes < TIMELINE_END - 30) {
    slots.push({
      isFree: true,
      startTime: minutesToDisplay(lastEndMinutes),
      endTime: minutesToDisplay(TIMELINE_END),
      startMinutes: lastEndMinutes,
      endMinutes: TIMELINE_END,
      status: "free",
    });
  }

  return slots;
}
