import React from "react";
import { Pressable, Text, View } from "react-native";

import { absoluteUrl } from "@/api/client";
import { formatTime12, titleCase } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius, type Tone } from "@/theme/palette";
import { Avatar, Badge, Icon, Row, T } from "@/ui";
import { sessionDateLabel, sessionMinutes, type Attendance, type Session } from "@/screens/teacher/monthly/utils";

/** Student photos are stored as full URLs; a site-relative one is made absolute */
export function avatarUri(avatar?: string | null): string | null {
  return avatar ? absoluteUrl(avatar) : null;
}

export function AttBadge({ status }: { status: string }) {
  if (status === "present") return <Badge label="Present" tone="success" icon="check-circle" />;
  if (status === "absent") return <Badge label="Absent" tone="danger" icon="x-circle" />;
  return <Badge label="Not Marked" tone="neutral" icon="minus-circle" />;
}

const STATUS_LOOK: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "primary" },
  "in-progress": { label: "In Progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const look = STATUS_LOOK[status];
  return <Badge label={look?.label ?? titleCase(status)} tone={look?.tone ?? "neutral"} />;
}

export function LevelBadge({ level }: { level: string }) {
  const tone: Tone = level === "beginner" ? "primary" : level === "intermediate" ? "violet" : level === "advanced" ? "danger" : "neutral";
  return <Badge label={titleCase(level)} tone={tone} />;
}

const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "not-marked", label: "Unmark" },
];

/** The three quick-update buttons; the one matching the saved attendance is filled */
export function AttendanceButtons({ current, busy, onPick }: { current: string; busy: boolean; onPick: (next: Attendance) => void }) {
  const { c } = useTheme();
  return (
    <Row gap={8}>
      {ATTENDANCE_OPTIONS.map((option) => {
        const active = current === option.value;
        const bg = !active ? c.surfaceAlt : option.value === "present" ? c.success : option.value === "absent" ? c.danger : c.textMuted;
        const fg = !active ? c.textMuted : option.value === "not-marked" ? c.surface : "#ffffff";
        return (
          <Pressable
            key={option.value}
            disabled={busy}
            onPress={() => onPick(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`Mark as ${option.value}`}
            accessibilityState={{ selected: active, disabled: busy }}
            style={{ flex: 1, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: bg, borderWidth: active ? 0 : 1, borderColor: c.border, opacity: busy ? 0.5 : 1 }}
          >
            <Text numberOfLines={1} style={{ color: fg, fontSize: 12.5, fontWeight: "700" }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

interface SessionDetailsProps {
  session: Session;
  /** Row number in the whole filtered list (shown as "#12") */
  index?: number;
  busy: boolean;
  onAttendance: (next: Attendance) => void;
}

/** Everything the report knows about one class, with the attendance quick update */
export function SessionDetails({ session: s, index, busy, onAttendance }: SessionDetailsProps) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Row gap={12} align="flex-start">
        <Avatar uri={avatarUri(s.student?.avatar)} name={s.student?.fullName} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={2}>
            {s.student?.fullName || "—"}
          </T>
          <T variant="mono" color="faint" style={{ fontSize: 11 }}>
            {s.student?.studentId || "—"}
          </T>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <T variant="smallStrong">{sessionDateLabel(s)}</T>
          <T variant="caption" color="faint" style={{ textTransform: "capitalize" }}>
            {s.dayOfWeek || ""}
          </T>
        </View>
      </Row>

      <View style={{ gap: 6 }}>
        <T variant="small" color="muted" numberOfLines={2}>
          {s.course?.title || "—"}
        </T>
        {s.classId || s.course?.level ? (
          <Row gap={6} wrap>
            {s.classId ? <Badge label={s.classId} tone="primary" /> : null}
            {s.course?.level ? <LevelBadge level={s.course.level} /> : null}
          </Row>
        ) : null}
      </View>

      <Row justify="space-between" style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 }}>
        <Row gap={6} style={{ flex: 1 }}>
          <Icon name="clock" size={14} color={c.primary} />
          <T variant="smallStrong" color="muted" numberOfLines={1} style={{ flex: 1 }}>
            {formatTime12(s.startTime)} – {formatTime12(s.endTime)}
          </T>
        </Row>
        <T variant="smallStrong">{sessionMinutes(s)} min</T>
      </Row>

      <Row justify="space-between">
        <StatusBadge status={s.status} />
        {typeof index === "number" ? (
          <T variant="caption" color="faint">
            #{index}
          </T>
        ) : null}
      </Row>

      <View style={{ gap: 6 }}>
        <T variant="label" color="faint">
          Attendance (Quick Update)
        </T>
        <AttendanceButtons current={s.studentAttendance} busy={busy} onPick={onAttendance} />
      </View>

      {s.notes ? (
        <View style={{ gap: 2 }}>
          <T variant="label" color="faint">
            Notes
          </T>
          <T variant="small" color="muted" style={{ fontStyle: "italic" }}>
            {s.notes}
          </T>
        </View>
      ) : null}
    </View>
  );
}
