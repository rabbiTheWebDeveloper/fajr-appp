import { DAY_NAMES, MONTH_NAMES, academyClock } from "@/lib/format";

/** One weekly schedule of the teacher, as GET /api/teacher-portal/schedule returns it in `schedules` */
export interface TeacherSchedule {
  _id?: string;
  course?: { _id?: string; title?: string } | null;
  student?: { _id?: string; fullName?: string; email?: string } | null;
  dayOfWeek?: string;
  weekly_days_list?: string[];
  /** Per-day times; a day listed here overrides the schedule's own start / end / duration */
  day_times?: { day?: string; startTime?: string; endTime?: string; duration?: number }[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  type?: string;
  meetLink?: string;
}

/** A schedule that falls on today, with today's own times filled in */
export interface TodayClass extends TeacherSchedule {
  startTime: string;
  endTime: string;
  duration: number;
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** "Today" and "now" as the academy's clock (Bangladesh time) reads them, whatever the phone's own time zone is */
export function academyToday(now: Date): { key: string; name: string; minutes: number; seconds: number; dateLine: string } {
  const clock = academyClock(now);
  const day = clock.getUTCDay();
  return {
    key: DAY_KEYS[day],
    name: DAY_NAMES[day],
    minutes: clock.getUTCHours() * 60 + clock.getUTCMinutes(),
    seconds: clock.getUTCSeconds(),
    // "Thursday, November 5, 2026"
    dateLine: `${DAY_NAMES[day]}, ${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()}`,
  };
}

/** "10:30 AM", "02:15 PM" or "14:00" -> minutes from midnight (0 when there is no time) */
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  const parts = str.replace(/(AM|PM)/g, "").trim().split(":");
  let hours = parseInt(parts[0] || "0", 10) || 0;
  const minutes = parseInt(parts[1] || "0", 10) || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** "14:00" -> "2:00 PM"; an empty time reads "TBD" */
export function formatClassTime(timeStr?: string | null): string {
  if (!timeStr) return "TBD";
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${m < 10 ? `0${m}` : m} ${h >= 12 ? "PM" : "AM"}`;
}

/** The schedules that fall on the given day ("monday"…), each with that day's times, earliest first */
export function todayClasses(schedules: TeacherSchedule[], todayKey: string): TodayClass[] {
  return schedules
    .filter((s) => {
      const singleDayMatch = !!s.dayOfWeek && s.dayOfWeek.toLowerCase() === todayKey;
      const listDayMatch = Array.isArray(s.weekly_days_list) && s.weekly_days_list.some((d) => String(d).toLowerCase() === todayKey);
      const dayTimesMatch = Array.isArray(s.day_times) && s.day_times.some((dt) => dt.day?.toLowerCase() === todayKey);
      return singleDayMatch || listDayMatch || dayTimesMatch;
    })
    .map((s) => {
      const dt = Array.isArray(s.day_times) ? s.day_times.find((d) => d.day?.toLowerCase() === todayKey) : undefined;
      return {
        ...s,
        startTime: dt?.startTime || s.startTime || "",
        endTime: dt?.endTime || s.endTime || "",
        duration: Number(dt?.duration) || Number(s.duration) || 45,
      };
    })
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

/** When a class of today starts and ends, in minutes from midnight (an unknown end counts as one hour) */
export function classWindow(item: TodayClass): { start: number; end: number } {
  const start = parseTimeToMinutes(item.startTime);
  return { start, end: parseTimeToMinutes(item.endTime) || start + 60 };
}
