import React from "react";
import { View } from "react-native";

import { RemindersCard } from "@/notifications/RemindersCard";
import { loadStudentReminderSlots } from "@/screens/student/settings/reminder-slots";
import { useTheme } from "@/theme/ThemeContext";
import { Card, Icon, IconChip, Row, T } from "@/ui";

// What a student is told about, and where it shows up in the app
const WHAT_YOU_GET: { text: string; where: string }[] = [
  { text: "A reminder 15 minutes before each of your classes", where: "On this phone, even when the app is closed" },
  { text: "A ping the moment your teacher starts the class", where: "In the bell at the top of the app: tap it to open your classes and join" },
  { text: "Notices from the academy", where: "In the bell at the top of the app" },
];

/**
 * "Notifications": the app's version of the website's push-notification card. The website's browser push
 * switch is replaced by the on-phone class reminders; the rest arrives in the app's bell inbox.
 */
export function NotificationsTab() {
  const { c } = useTheme();
  return (
    <>
      <Card style={{ gap: 12 }}>
        <Row gap={12} align="flex-start">
          <IconChip icon="bell" size={42} />
          <View style={{ flex: 1 }}>
            <T variant="title">Notifications</T>
            <T variant="small" color="muted">
              Get alerts on this device.
            </T>
          </View>
        </Row>
        <View style={{ gap: 10 }}>
          {WHAT_YOU_GET.map((line) => (
            <Row key={line.text} gap={8} align="flex-start">
              <Icon name="check-circle" size={16} color={c.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <T variant="body">{line.text}</T>
                <T variant="caption" color="faint">
                  {line.where}
                </T>
              </View>
            </Row>
          ))}
        </View>
      </Card>

      <RemindersCard loadSlots={loadStudentReminderSlots} />
    </>
  );
}
