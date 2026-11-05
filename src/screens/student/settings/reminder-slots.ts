import { api } from "@/api/client";
import { academyDateKey, academyDayIndex, academyMinutesNow, minutesToTime24, shiftDateKey } from "@/lib/format";
import { weeklySlotsOf, type ScheduleTimes, type SlotDay } from "@/lib/teacher-slot-shared";
import type { ReminderSlot } from "@/notifications/reminders";

/** The student's weekly Schedule document, as GET /api/student-portal/schedule returns it (course and teacher populated) */
interface StudentScheduleDoc extends ScheduleTimes {
  _id?: string;
  course?: { _id?: string; title?: string } | string | null;
  teacher?: { _id?: string; fullName?: string; email?: string } | string | null;
  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

interface ScheduleReply {
  success?: boolean;
  message?: string;
  /** null when the student has no weekly schedule yet */
  schedule?: StudentScheduleDoc | null;
}

/** Schedule documents name their days in words; reminders count from Sunday = 0 */
const DAY_INDEX: Record<SlotDay, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/** The academy date ("YYYY-MM-DD") of the next class on this weekday at this time, counting today if it has not started yet */
function nextClassDate(dayOfWeek: number, startMins: number, now: Date): string {
  let daysAhead = (dayOfWeek - academyDayIndex(now) + 7) % 7;
  if (daysAhead === 0 && startMins <= academyMinutesNow(now)) daysAhead = 7;
  return shiftDateKey(academyDateKey(now), daysAhead);
}

function dateKeyOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : academyDateKey(date);
}

/**
 * The student's weekly routine as on-phone reminder slots: one per class per weekday.
 * A schedule that is switched off or has ended gives no reminders, and a class is left out while its
 * next date falls outside the schedule's effective dates (it comes back in when the app next syncs).
 */
export async function loadStudentReminderSlots(): Promise<ReminderSlot[]> {
  const reply = await api.get<ScheduleReply>("/api/student-portal/schedule");
  const schedule = reply.schedule;
  if (!schedule || schedule.isActive === false) return [];

  const now = new Date();
  // Same rule as the website's weekly routine: a schedule whose end has passed is over
  if (schedule.effectiveTo && new Date(schedule.effectiveTo).getTime() < now.getTime()) return [];
  const startsOn = dateKeyOf(schedule.effectiveFrom);
  const endsOn = dateKeyOf(schedule.effectiveTo);

  const teacherName = schedule.teacher && typeof schedule.teacher === "object" ? (schedule.teacher.fullName ?? "").trim() : "";
  const courseTitle = schedule.course && typeof schedule.course === "object" ? (schedule.course.title ?? "").trim() : "";
  const title = teacherName ? `Class with ${teacherName}` : courseTitle || "Class";
  // The course name is the extra line, unless it is already the title
  const detail = teacherName && courseTitle ? courseTitle : undefined;

  const slots: ReminderSlot[] = [];
  for (const slot of weeklySlotsOf(schedule)) {
    const dayOfWeek = DAY_INDEX[slot.day];
    const classDate = nextClassDate(dayOfWeek, slot.startMins, now);
    if (startsOn && classDate < startsOn) continue;
    if (endsOn && classDate > endsOn) continue;
    slots.push({ dayOfWeek, time: minutesToTime24(slot.startMins), title, detail, url: "/student/classes" });
  }
  return slots;
}
