import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { humanizeMins, type Attendance, type RecentClass } from "@/lib/student-dashboard-shared";
import { useNav } from "@/navigation/nav";
import { CardHeader, onGradient } from "@/screens/student/dashboard/parts";
import { academyMonthDay } from "@/screens/student/dashboard/utils";
import { useTheme } from "@/theme/ThemeContext";
import { gradients, type GradientName, type Tone } from "@/theme/palette";
import { Badge, Card, EmptyState, Icon, Row, T, type IconName } from "@/ui";

const ATTENDANCE: Record<Attendance, { label: string; tone: Tone; icon: IconName }> = {
  present: { label: "Present", tone: "success", icon: "check-circle" },
  absent: { label: "Absent", tone: "danger", icon: "x-circle" },
  "not-marked": { label: "Not marked", tone: "neutral", icon: "circle" },
};

// A different colour for each day of the month, so the date chips are easy to tell apart at a glance
const DATE_CHIPS: GradientName[] = ["blue", "violet", "emerald", "amber", "rose", "sky"];

/** What the teacher wrote about the class: three lines, like the website, and the whole note on tap (a phone's lines are short). */
function TeacherNotes({ notes }: { notes: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityLabel={`Teacher's notes: ${notes}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, backgroundColor: c.violetSoft, padding: 12 }}>
      <Icon name="message-square" size={15} color={c.violetText} style={{ marginTop: 2 }} />
      <T variant="body" numberOfLines={open ? undefined : 3} style={{ flex: 1, fontStyle: "italic", lineHeight: 21 }}>
        {notes}
      </T>
    </Pressable>
  );
}

/** The last few classes with what was taught and what the teacher said. Only what the teacher really wrote is shown. */
export default function RecentClasses({ classes }: { classes: RecentClass[] }) {
  const { c } = useTheme();
  const nav = useNav();
  return (
    <Card padding={14} style={{ gap: 14 }}>
      <CardHeader icon="bookmark" gradient="amber" title="Recent classes" subtitle="Lesson and teacher's notes" linkLabel="All classes" onLink={() => nav.go("StudentClasses")} />

      {classes.length === 0 ? (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
          <EmptyState compact tone="neutral" icon="bookmark" title="No completed classes yet" message="Each class you finish will show up here with your teacher's notes." />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {classes.map((item) => {
            // The day the class was held, on the academy's calendar
            const date = academyMonthDay(item.at);
            const attendance = ATTENDANCE[item.attendance];
            const chip = gradients[DATE_CHIPS[(date?.day ?? 0) % DATE_CHIPS.length]];
            return (
              <View key={item.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12, gap: 10 }}>
                <Row gap={12} align="flex-start">
                  <LinearGradient colors={[chip[0], chip[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                    <T color={onGradient.text} weight="700" style={{ fontSize: 10, lineHeight: 12, textTransform: "uppercase" }}>
                      {date?.month ?? ""}
                    </T>
                    <T color={onGradient.text} weight="900" style={{ fontSize: 18, lineHeight: 22 }}>
                      {date?.day ?? "—"}
                    </T>
                  </LinearGradient>

                  <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    <T variant="bodyStrong" weight="700">
                      {item.topic ?? item.courseTitle}
                    </T>
                    <Badge tone={attendance.tone} icon={attendance.icon} label={attendance.label} />
                    <T variant="small" color="muted">
                      {item.topic ? `${item.courseTitle} · ` : ""}
                      {item.teacherName ? `${item.teacherName} · ` : ""}
                      {humanizeMins(item.minutes)}
                    </T>
                  </View>
                </Row>

                {item.notes ? <TeacherNotes notes={item.notes} /> : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
