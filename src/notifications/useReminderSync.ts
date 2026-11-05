import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useAppForeground } from "@/lib/hooks";
import { useNav } from "@/navigation/nav";
import { onReminderTapped, remindersEnabled, syncReminders, type ReminderSlot } from "@/notifications/reminders";

// A reminder that launched the app is opened once per app run, not again on every sign-in
let launchReminderHandled = false;

/**
 * Keeps the on-phone class reminders in step with the weekly routine and opens the right screen when one is tapped.
 * Used once per portal, by the screen that hosts the bottom tabs.
 *
 * - When the portal opens, and each time the app returns to the front, the reminders are re-made from the
 *   current routine (only if the person has switched them on).
 * - Tapping a reminder opens the screen it points at, also when the tap is what started the app.
 */
export function useReminderSync(loadSlots: () => Promise<ReminderSlot[]>): void {
  const nav = useNav();
  const navRef = useRef(nav);
  navRef.current = nav;
  const loader = useRef(loadSlots);
  loader.current = loadSlots;
  const syncing = useRef(false);

  const sync = async () => {
    if (syncing.current || Platform.OS === "web") return;
    syncing.current = true;
    try {
      if (await remindersEnabled()) await syncReminders(await loader.current());
    } catch {
      // Offline or the routine could not be read: the reminders already set stay as they are
    } finally {
      syncing.current = false;
    }
  };

  useEffect(() => {
    void sync();
    const unsubscribe = onReminderTapped((url) => navRef.current.openPath(url));

    if (Platform.OS !== "web" && !launchReminderHandled) {
      launchReminderHandled = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const url = (response?.notification.request.content.data as { url?: unknown } | undefined)?.url;
          if (typeof url === "string" && url) navRef.current.openPath(url);
        })
        .catch(() => {});
    }
    return unsubscribe;
    // Runs once per portal session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAppForeground(() => void sync());
}
