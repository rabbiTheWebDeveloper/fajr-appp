import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { ACADEMY_UTC_OFFSET_MINUTES, formatTime12, timeToMinutes } from "@/lib/format";

/**
 * Class reminders on this phone.
 *
 * The website sends "class starts in 15 minutes" through browser push. A phone app would need Google's
 * push service (a Firebase project) for that, so the app does the same job by itself: it reads the weekly
 * class routine and asks Android to show a notification before each class, every week, even when the
 * app is closed. The reminders are re-made each time the app opens, so routine changes are picked up.
 */

/** One weekly class slot, in academy (Bangladesh) time */
export interface ReminderSlot {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** 24-hour "HH:MM" (or "h:mm AM") start time */
  time: string;
  /** Notification title, e.g. "Class with Ustadh Karim" */
  title: string;
  /** Extra line, e.g. the course name. The start time is added automatically. */
  detail?: string;
  /** Website path to open when the notification is tapped, e.g. "/student/classes" */
  url?: string;
}

export type ReminderPermission = "granted" | "denied" | "undetermined";

const ENABLED_KEY = "fajr.reminders.enabled";
const COUNT_KEY = "fajr.reminders.count";
const CHANNEL_ID = "class-reminders";
export const REMINDER_MINUTES_BEFORE = 15;
/** Android caps pending alarms per app at 500; a weekly routine is far below this */
const MAX_REMINDERS = 60;

const supported = Platform.OS !== "web";

if (supported) {
  // Show reminders even while the app is open
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Class reminders",
    description: "A reminder shortly before each of your classes",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: "#DFB76C",
  });
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!supported) return "denied";
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return "granted";
    return current.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "denied";
  }
}

/** Whether the person turned class reminders on (on this phone, for whoever is signed in) */
export async function remindersEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === "1";
}

/** How many weekly reminders are currently set */
export async function reminderCount(): Promise<number> {
  return Number((await AsyncStorage.getItem(COUNT_KEY)) ?? 0) || 0;
}

/**
 * Sets the weekly reminders from the class routine, replacing the old ones.
 * Returns how many were set. Does nothing (returns 0) unless reminders are on and allowed.
 */
export async function syncReminders(slots: ReminderSlot[]): Promise<number> {
  if (!supported) return 0;
  if (!(await remindersEnabled()) || (await getReminderPermission()) !== "granted") return 0;

  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  // The phone fires weekly alarms in its own time zone; class times are academy time
  const phoneOffset = -new Date().getTimezoneOffset();
  const shift = phoneOffset - ACADEMY_UTC_OFFSET_MINUTES;
  const seen = new Set<string>();
  let count = 0;

  for (const slot of slots) {
    if (count >= MAX_REMINDERS) break;
    const start = timeToMinutes(slot.time);
    if (start === null || !(slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6)) continue;
    const key = `${slot.dayOfWeek}-${start}-${slot.title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const weekMinutes = (((slot.dayOfWeek * 1440 + start - REMINDER_MINUTES_BEFORE + shift) % 10080) + 10080) % 10080;
    const weekday = Math.floor(weekMinutes / 1440) + 1; // 1 = Sunday
    const hour = Math.floor((weekMinutes % 1440) / 60);
    const minute = weekMinutes % 60;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: slot.title,
          body: `Starts at ${formatTime12(slot.time)} (Bangladesh time), in ${REMINDER_MINUTES_BEFORE} minutes.${slot.detail ? ` ${slot.detail}` : ""}`,
          data: { url: slot.url ?? "" },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: CHANNEL_ID },
      });
      count += 1;
    } catch {
      // Skip a slot the phone refuses; the rest still get their reminder
    }
  }

  await AsyncStorage.setItem(COUNT_KEY, String(count));
  return count;
}

/**
 * Turns class reminders on: asks Android for permission if needed, then sets them.
 * Resolves with the permission state and how many reminders were set.
 */
export async function enableReminders(slots: ReminderSlot[]): Promise<{ permission: ReminderPermission; count: number }> {
  if (!supported) return { permission: "denied", count: 0 };
  let permission = await getReminderPermission();
  if (permission !== "granted") {
    try {
      const asked = await Notifications.requestPermissionsAsync();
      permission = asked.granted ? "granted" : asked.canAskAgain ? "undetermined" : "denied";
    } catch {
      permission = "denied";
    }
  }
  if (permission !== "granted") return { permission, count: 0 };
  await AsyncStorage.setItem(ENABLED_KEY, "1");
  const count = await syncReminders(slots);
  return { permission, count };
}

/** Turns class reminders off and removes the ones already set */
export async function disableReminders(): Promise<void> {
  await AsyncStorage.multiRemove([ENABLED_KEY, COUNT_KEY]);
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing was set
  }
}

/**
 * Removes the reminders that are set, keeping the on/off choice. Called at sign-out, so nobody receives
 * the previous person's class reminders; they are re-made for whoever signs in next.
 */
export async function clearScheduledReminders(): Promise<void> {
  await AsyncStorage.removeItem(COUNT_KEY).catch(() => {});
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing was set
  }
}

/** Shows one notification straight away, so the person can see that reminders work on their phone */
export async function sendTestReminder(): Promise<boolean> {
  if (!supported || (await getReminderPermission()) !== "granted") return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: "Fajr Academy", body: "Class reminders are working on this phone.", sound: true },
    trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
  });
  return true;
}

/** Calls the handler with the website path of a reminder the person tapped. Returns the unsubscribe function. */
export function onReminderTapped(handler: (url: string) => void): () => void {
  if (!supported) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = (response.notification.request.content.data as { url?: unknown } | undefined)?.url;
    if (typeof url === "string" && url) handler(url);
  });
  return () => subscription.remove();
}
