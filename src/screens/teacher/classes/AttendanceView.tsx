import React from "react";
import { View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Avatar, Badge, Card, Icon, IconChip, ProgressBar, Row, Segmented, T, TileGrid, type IconName } from "@/ui";

import { AttendanceBadge, ClassTypeBadge } from "@/screens/teacher/classes/parts";
import { avatarUri, capitalize, classStudent, levelTone, time12, type ClassSession, type StudentAttendanceRow } from "@/screens/teacher/classes/types";

export type AttendanceTab = "classes" | "students";

/** These tone names are also text colour names, so one value paints both the icon chip and the number */
type RateTone = "success" | "warning" | "danger";

/** Green from 75%, amber from 50%, red below */
function rateTone(pct: number): RateTone {
  return pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger";
}

function SummaryTile({ label, value, icon, tone }: { label: string; value: string | number; icon: IconName; tone: "primary" | RateTone }) {
  return (
    <Card padding={12}>
      <Row gap={10}>
        <IconChip icon={icon} tone={tone} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="h2" color={tone}>
            {value}
          </T>
          <T variant="caption" color="muted" numberOfLines={1}>
            {label}
          </T>
        </View>
      </Row>
    </Card>
  );
}

interface AttendanceSummaryProps {
  totalDone: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePct: number;
  tab: AttendanceTab;
  onTabChange: (tab: AttendanceTab) => void;
}

/** The four attendance figures, the Class-wise / Student-wise switch and the title of the list below */
export function AttendanceSummary({ totalDone, totalPresent, totalAbsent, attendancePct, tab, onTabChange }: AttendanceSummaryProps) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <TileGrid columns={2} gap={10}>
        <SummaryTile label="Total Sessions" value={totalDone} icon="check-circle" tone="primary" />
        <SummaryTile label="Present" value={totalPresent} icon="user-check" tone="success" />
        <SummaryTile label="Absent" value={totalAbsent} icon="user-x" tone="danger" />
        <SummaryTile label="Attendance Rate" value={`${attendancePct}%`} icon="trending-up" tone={rateTone(attendancePct)} />
      </TileGrid>

      <Segmented<AttendanceTab>
        value={tab}
        onChange={onTabChange}
        options={[
          { value: "classes", label: "Class-wise", icon: "clipboard" },
          { value: "students", label: "Student-wise", icon: "users" },
        ]}
      />

      {tab === "classes" ? (
        <Row justify="space-between" gap={8}>
          <Row gap={8} style={{ flex: 1 }}>
            <Icon name="clipboard" size={16} color={c.primary} />
            <T variant="title" numberOfLines={1} style={{ flex: 1 }}>
              All Completed Sessions
            </T>
          </Row>
          <Badge label={String(totalPresent)} tone="success" icon="user-check" style={{ alignSelf: "center" }} />
          <Badge label={String(totalAbsent)} tone="danger" icon="user-x" style={{ alignSelf: "center" }} />
        </Row>
      ) : (
        <View>
          <Row gap={8}>
            <Icon name="users" size={16} color={c.primary} />
            <T variant="title">Student Attendance Summary</T>
          </Row>
          <T variant="small" color="faint">
            Based on all completed sessions
          </T>
        </View>
      )}
    </View>
  );
}

/** One completed class with the attendance that was marked */
export function AttendanceClassRow({ cls, index }: { cls: ClassSession; index: number }) {
  const { c } = useTheme();
  const student = classStudent(cls);
  return (
    <Card padding={14} style={{ gap: 10 }}>
      <Row gap={12} align="flex-start">
        <Avatar uri={avatarUri(student?.avatar)} name={student?.fullName || "Student"} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={1}>
            {index + 1}. {student?.fullName || "Unknown Student"}
          </T>
          <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
            {student?.studentId || "—"}
          </T>
        </View>
        <AttendanceBadge status={cls.studentAttendance} />
      </Row>
      <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 10, gap: 5 }}>
        <T variant="smallStrong" numberOfLines={2}>
          {cls.course?.title || "No Course"}
        </T>
        <Row gap={6} wrap>
          {cls.classId ? <Badge label={cls.classId} tone="primary" /> : null}
          {cls.course?.level ? <Badge label={cls.course.level} tone={levelTone(cls.course.level)} /> : null}
          {cls.classType ? <ClassTypeBadge type={cls.classType} /> : null}
        </Row>
        <T variant="small" color="muted">
          {capitalize(cls.dayOfWeek)} · {time12(cls.startTime)}–{time12(cls.endTime)} · {cls.actualDuration ?? cls.duration ?? 45} min
        </T>
      </View>
    </Card>
  );
}

/** One student's attendance over the completed classes: totals and the present percentage */
export function AttendanceStudentRow({ row }: { row: StudentAttendanceRow }) {
  const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
  const tone = rateTone(pct);
  return (
    <Card padding={14} style={{ gap: 10 }}>
      <Row gap={12}>
        <Avatar uri={avatarUri(row.student?.avatar)} name={row.student?.fullName} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={1}>
            {row.student?.fullName || "—"}
          </T>
          <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
            {row.student?.studentId || "—"}
          </T>
        </View>
        <T variant="h2" color={tone}>
          {pct}%
        </T>
      </Row>
      <ProgressBar value={pct} tone={tone} />
      <Row gap={12} wrap>
        <T variant="small" color="muted">
          Total: <T variant="smallStrong">{row.total}</T>
        </T>
        <Badge label={String(row.present)} tone="success" icon="user-check" />
        <Badge label={String(row.absent)} tone="danger" icon="user-x" />
        {row.notMarked > 0 ? (
          <T variant="small" color="faint">
            {row.notMarked} not marked
          </T>
        ) : null}
      </Row>
    </Card>
  );
}
