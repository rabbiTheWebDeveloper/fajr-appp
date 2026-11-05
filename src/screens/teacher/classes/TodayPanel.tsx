import React from "react";
import { View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Avatar, Badge, Icon, Row, T } from "@/ui";

import { ActionButton, ClassTypeBadge } from "@/screens/teacher/classes/parts";
import { CREATE_WINDOW_MINUTES, avatarUri, normalizeTime, time12, type ClassSession, type Student, type TodayScheduleItem } from "@/screens/teacher/classes/types";

interface TodayPanelProps {
  items: TodayScheduleItem[];
  todayDayKey: string;
  /** Minutes since midnight in Bangladesh, refreshed by the screen */
  nowMinutes: number;
  actingId: string | null;
  onStart: (cls: ClassSession) => void;
  onShowInProgress: () => void;
  onCreate: (student: Student) => void;
}

/**
 * Every student whose weekly schedule has a class today, with where that class stands:
 * not created yet (and whether the 30-minute create window is open), scheduled, running or done.
 */
export function TodayPanel({ items, todayDayKey, nowMinutes, actingId, onStart, onShowInProgress, onCreate }: TodayPanelProps) {
  const { c } = useTheme();

  return (
    <View style={{ backgroundColor: c.primarySoft, borderRadius: radius.lg, borderWidth: 1, borderColor: `${c.primary}44`, padding: 14, gap: 10 }}>
      <Row gap={8} align="flex-start">
        <Icon name="clock" size={15} color={c.primaryText} style={{ marginTop: 1 }} />
        <T variant="label" color="primary" style={{ flex: 1 }}>
          {items.length} Student{items.length > 1 ? "s" : ""} Scheduled for Today ({todayDayKey})
        </T>
      </Row>
      <T variant="small" color="primary">
        <T variant="smallStrong" color="primary">
          Rule:
        </T>{" "}
        The{" "}
        <T variant="smallStrong" color="primary">
          + Create
        </T>{" "}
        button enables{" "}
        <T variant="smallStrong" color="primary">
          30 minutes before
        </T>{" "}
        scheduled start time.
      </T>
      <Badge label="⏰ 30m Create Window" tone="primary" />

      <View style={{ gap: 8 }}>
        {items.map(({ student, todayClass, status, slot }) => {
          const effectiveStart = slot.startTime || student.schedule?.startTime;
          const effectiveDuration = slot.duration || student.schedule?.duration || 45;
          const normStart = normalizeTime(effectiveStart);

          let within = false;
          let label = "";
          if (normStart) {
            const [sh, sm] = normStart.split(":").map(Number);
            const diff = sh * 60 + sm - nowMinutes;
            within = diff <= CREATE_WINDOW_MINUTES;
            if (diff > CREATE_WINDOW_MINUTES) label = diff >= 60 ? `in ${Math.floor(diff / 60)}h ${diff % 60}m` : `in ${diff}m`;
            else if (diff > 0) label = `in ${diff}m (Ready)`;
            else label = "Class Time";
          }
          // A student whose start time cannot be read is never locked (the server still checks)
          const locked = !!normStart && !within;
          const ready = status === "uncreated" && !!normStart && within;

          return (
            <View key={student._id} style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: ready ? 1.5 : 1, borderColor: ready ? c.success : c.border, padding: 10, gap: 6 }}>
              <Row gap={10} align="center">
                <Avatar uri={avatarUri(student.avatar)} name={student.fullName} size={34} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <T variant="smallStrong" numberOfLines={1}>
                    {student.fullName}
                  </T>
                  <T variant="caption" color="primary" style={{ fontFamily: "monospace" }}>
                    {todayClass?.classId ? `${todayClass.classId} · ` : ""}
                    {time12(effectiveStart)} ({effectiveDuration}m)
                  </T>
                  {todayClass?.classType || (status === "uncreated" && label) ? (
                    <Row gap={6} wrap>
                      {todayClass?.classType ? <ClassTypeBadge type={todayClass.classType} /> : null}
                      {status === "uncreated" && label ? <Badge label={label} tone={within ? "success" : "neutral"} /> : null}
                    </Row>
                  ) : null}
                </View>

                {status === "completed" ? <Badge label="Completed" tone="success" icon="check-circle" style={{ alignSelf: "center" }} /> : null}
                {status === "in-progress" || status === "paused" ? <ActionButton title="In Progress" icon="clock" bg={c.warning} onPress={onShowInProgress} /> : null}
                {status === "scheduled" && todayClass ? <ActionButton title="Start" icon="play" bg={c.primary} loading={actingId === todayClass._id} onPress={() => onStart(todayClass)} /> : null}
                {status === "uncreated" ? (
                  locked ? (
                    <Badge label="Opens 30m Before" tone="neutral" icon="clock" style={{ alignSelf: "center" }} />
                  ) : (
                    <ActionButton title="+ Create" bg={c.primary} onPress={() => onCreate(student)} />
                  )
                ) : null}
              </Row>
              {status === "uncreated" && locked ? (
                <T variant="caption" color="faint">
                  Class can only be created starting 30 minutes before scheduled start ({time12(effectiveStart)})
                </T>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
