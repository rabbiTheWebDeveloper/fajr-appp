import React from "react";
import { Pressable, View } from "react-native";

import { copyText } from "@/lib/device";
import { formatDate, formatTime12 } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type Tone } from "@/theme/palette";
import { Avatar, Badge, Button, Card, Divider, Icon, Row, T, type IconName } from "@/ui";

import { courseTitle, dayShort, photoUrl, statusTone, type StudentSchedule, type TeacherStudent } from "@/screens/teacher/students/shared";

function InfoLine({ icon, text, color, capitalize }: { icon: IconName; text: string; color?: "muted" | "primary"; capitalize?: boolean }) {
  const { c } = useTheme();
  return (
    <Row gap={10}>
      <Icon name={icon} size={15} color={color === "primary" ? c.primary : c.textFaint} />
      <T variant="small" color={color ?? "muted"} weight={color === "primary" ? "600" : undefined} numberOfLines={1} style={[{ flex: 1 }, capitalize ? { textTransform: "capitalize" } : null]}>
        {text}
      </T>
    </Row>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: radius.md, backgroundColor: t.bg }}>
      <T variant="label" color={t.fg} style={{ fontSize: 9.5 }}>
        {label}
      </T>
      <T variant="bodyStrong" color={t.fg} weight="800">
        {value}
      </T>
    </View>
  );
}

/** The class days as pills: one per day when each day has its own time, else one combined pill */
function SchedulePills({ schedule }: { schedule: StudentSchedule }) {
  const days = schedule.weekly_days_list ?? [];
  const dayTimes = schedule.day_times ?? [];
  return (
    <Row wrap gap={6}>
      {dayTimes.length > 0 ? (
        dayTimes.map((dt, index) => <Badge key={`${dt.day ?? ""}-${index}`} tone="warning" icon="clock" label={`${dayShort(dt.day)}: ${formatTime12(dt.startTime)}`} />)
      ) : (
        <Badge tone="warning" icon="clock" label={`${days.map(dayShort).join(", ")}${schedule.startTime ? ` @ ${formatTime12(schedule.startTime)}` : ""}`} />
      )}
      {schedule.type ? <Badge tone="primary" label={schedule.type.toUpperCase()} /> : null}
      {schedule.duration ? <Badge tone="neutral" label={`${schedule.duration}m`} /> : null}
    </Row>
  );
}

interface StudentCardProps {
  student: TeacherStudent;
  onEdit: () => void;
  onUnassign: () => void;
}

/** One assigned student: who they are, their class days and this month's session counts */
export function StudentCard({ student, onEdit, onUnassign }: StudentCardProps) {
  const { c } = useTheme();
  const schedule = student.schedule;
  const hasSchedule = !!schedule && (schedule.weekly_days_list?.length ?? 0) > 0;
  const course = courseTitle(student.course);
  const stats = student.classStats;

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <Row gap={12} align="flex-start" style={{ padding: 14, backgroundColor: c.surfaceAlt, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Avatar uri={photoUrl(student.avatar)} name={student.fullName || "S"} size={46} />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <T variant="title" numberOfLines={1}>
            {student.fullName}
          </T>
          <Row wrap gap={6}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
              <T variant="mono" color="muted" style={{ fontSize: 11.5 }} selectable>
                {student.studentId || "No ID"}
              </T>
            </View>
            <Badge tone={statusTone(student.status)} label={(student.status || "active").toUpperCase()} />
          </Row>
        </View>
      </Row>

      <View style={{ padding: 14, gap: 9 }}>
        {student.phone ? (
          <Pressable onPress={() => void copyText(student.phone ?? "", "Phone number copied")} accessibilityRole="button" accessibilityLabel={`Copy phone number ${student.phone}`} hitSlop={6}>
            <Row gap={10}>
              <Icon name="phone" size={15} color={c.textFaint} />
              <T variant="small" color="muted" style={{ flex: 1 }}>
                {student.phone}
              </T>
              <Icon name="copy" size={14} color={c.textFaint} />
            </Row>
          </Pressable>
        ) : (
          <InfoLine icon="phone" text="No phone number" />
        )}
        <InfoLine icon="user" text={student.gender || "Not specified"} capitalize />
        {course ? <InfoLine icon="book-open" text={course} color="primary" /> : null}
        {student.classStartingDate ? <InfoLine icon="calendar" text={`Started: ${formatDate(student.classStartingDate, "medium")}`} /> : null}

        <Divider />
        {hasSchedule && schedule ? (
          <SchedulePills schedule={schedule} />
        ) : (
          // The web shows nothing here; on a phone the edit button is easy to miss, so say what is missing
          <Row gap={8}>
            <Icon name="calendar" size={14} color={c.textFaint} />
            <T variant="small" color="faint" style={{ flex: 1, fontStyle: "italic" }}>
              No schedule set yet
            </T>
          </Row>
        )}

        <Divider />
        <Row justify="space-between">
          <T variant="label" color="faint">
            This Month's Sessions
          </T>
          {schedule?.weekly_days_list ? (
            <T variant="caption" color="primary" weight="700">
              ({schedule.weekly_days_list.length}/wk)
            </T>
          ) : null}
        </Row>
        <Row gap={8}>
          <MiniStat label="Total" value={stats?.total ?? 0} tone="neutral" />
          <MiniStat label="Done" value={stats?.done ?? 0} tone="success" />
          <MiniStat label="Left" value={stats?.remaining ?? 0} tone="warning" />
        </Row>

        <Row gap={10} style={{ marginTop: 4 }}>
          <Button title={hasSchedule ? "Edit Schedule" : "Set Schedule"} icon="edit-2" variant="outline" block style={{ flex: 1, height: 40 }} onPress={onEdit} accessibilityLabel="Edit student" />
          <Button title="Unassign" icon="user-minus" variant="dangerSoft" block style={{ flex: 1, height: 40 }} onPress={onUnassign} accessibilityLabel="Unassign student" />
        </Row>
      </View>
    </Card>
  );
}
