import React, { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";

import { errorMessage } from "@/api/client";
import { successFeedback } from "@/lib/device";
import {
  REMINDER_MINUTES_BEFORE,
  disableReminders,
  enableReminders,
  getReminderPermission,
  reminderCount,
  remindersEnabled,
  sendTestReminder,
  syncReminders,
  type ReminderPermission,
  type ReminderSlot,
} from "@/notifications/reminders";
import { Banner, Button, Card, IconChip, Row, Skeleton, T, Toggle, toast } from "@/ui";

interface RemindersCardProps {
  /** Loads the person's weekly class routine as reminder slots (from the schedule API) */
  loadSlots: () => Promise<ReminderSlot[]>;
}

/**
 * The "Class reminders" card for the Notifications tab of the settings screens: the app's counterpart of the
 * website's push-notification card. One switch turns on a reminder 15 minutes before every class in the weekly routine.
 */
export function RemindersCard({ loadSlots }: RemindersCardProps) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>("undetermined");
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const readState = useCallback(async () => {
    const [on, perm, n] = await Promise.all([remindersEnabled(), getReminderPermission(), reminderCount()]);
    setEnabled(on && perm === "granted");
    setPermission(perm);
    setCount(n);
    setReady(true);
  }, []);

  useEffect(() => {
    void readState();
  }, [readState]);

  const turnOn = async () => {
    setBusy(true);
    setError("");
    try {
      const slots = await loadSlots();
      const result = await enableReminders(slots);
      setPermission(result.permission);
      if (result.permission !== "granted") {
        setEnabled(false);
        setError("Notifications are turned off for Fajr Academy on this phone. Allow them in the phone's settings, then switch this on again.");
        return;
      }
      setEnabled(true);
      setCount(result.count);
      successFeedback();
      toast.success(result.count > 0 ? `Reminders set for ${result.count} weekly class${result.count === 1 ? "" : "es"}` : "Reminders are on. They will be set as soon as you have a class routine.");
    } catch (e) {
      setError(errorMessage(e, "Could not set the reminders. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError("");
    await disableReminders();
    setEnabled(false);
    setCount(0);
    setBusy(false);
    toast.info("Class reminders are off");
  };

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const n = await syncReminders(await loadSlots());
      setCount(n);
      toast.success(n > 0 ? `Reminders updated for ${n} weekly class${n === 1 ? "" : "es"}` : "No classes in your routine yet");
    } catch (e) {
      setError(errorMessage(e, "Could not update the reminders. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    const sent = await sendTestReminder();
    if (!sent) toast.error("Notifications are not allowed for Fajr Academy on this phone.");
  };

  if (!ready) {
    return (
      <Card>
        <Skeleton width="50%" height={16} />
        <Skeleton width="90%" height={12} style={{ marginTop: 10 }} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12} align="flex-start">
        <IconChip icon="bell" tone={enabled ? "success" : "primary"} />
        <View style={{ flex: 1 }}>
          <Toggle
            label="Class reminders on this phone"
            description={`A notification ${REMINDER_MINUTES_BEFORE} minutes before each class in your weekly routine, even when the app is closed.`}
            value={enabled}
            disabled={busy}
            onChange={(next) => void (next ? turnOn() : turnOff())}
          />
        </View>
      </Row>

      {error ? (
        <Banner tone="danger" message={error}>
          {permission === "denied" ? <Button title="Open phone settings" icon="settings" size="sm" variant="outline" onPress={() => void Linking.openSettings()} /> : null}
        </Banner>
      ) : null}

      {enabled ? (
        <>
          <Banner tone="success" message={count > 0 ? `${count} weekly reminder${count === 1 ? " is" : "s are"} set. They refresh each time you open the app.` : "Reminders are on. You have no classes in your routine yet."} />
          <Row>
            <Button title="Update now" icon="refresh-cw" variant="secondary" size="sm" loading={busy} onPress={() => void refresh()} />
            <Button title="Send a test" icon="send" variant="secondary" size="sm" onPress={() => void test()} />
          </Row>
        </>
      ) : null}

      <T variant="caption" color="faint">
        Notices from the academy and live-class alerts appear in the bell at the top of the app whenever it is open.
      </T>
    </Card>
  );
}
