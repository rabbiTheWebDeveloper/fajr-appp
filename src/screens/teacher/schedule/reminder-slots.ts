import { api } from "@/api/client";
import { DAY_NAMES, minutesToTime24, timeToMinutes } from "@/lib/format";
import { SLOT_DAYS, parseTimeToMins } from "@/lib/teacher-slot-shared";
import type { ReminderSlot } from "@/notifications/reminders";
import { schedulesForDay, type ScheduleReply } from "@/screens/teacher/schedule/schedule-utils";

/**
 * The teacher's weekly class routine as on-phone reminder slots: one per class per weekday.
 * Throws when the routine cannot be loaded, so the settings screen can say so.
 */
export async function loadTeacherReminderSlots(): Promise<ReminderSlot[]> {
  const reply = await api.get<ScheduleReply>("/api/teacher-portal/schedule");
  if (!reply.success || !Array.isArray(reply.schedules)) {
    throw new Error(reply.message || "Could not load your class routine.");
  }

  const slots: ReminderSlot[] = [];
  for (const dayKey of SLOT_DAYS) {
    const dayOfWeek = DAY_NAMES.findIndex((name) => name.toLowerCase() === dayKey);
    for (const item of schedulesForDay(reply.schedules, dayKey)) {
      // A class with no usable start time cannot have a reminder
      const startMins = timeToMinutes(item.startTime) ?? parseTimeToMins(item.startTime);
      if (startMins === null || startMins >= 1440) continue;

      const studentName = item.student?.fullName?.trim();
      const courseTitle = item.course?.title?.trim();
      slots.push({
        dayOfWeek,
        time: minutesToTime24(startMins),
        title: `Class with ${studentName || "your student"}`,
        detail: courseTitle || undefined,
        url: "/teacher/class",
      });
    }
  }
  return slots;
}
