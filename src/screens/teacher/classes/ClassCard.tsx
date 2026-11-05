import React from "react";
import { Pressable, Text, View } from "react-native";

import { copyText, openExternal } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import { Avatar, Badge, Icon, IconButton, IconChip, Row, T } from "@/ui";

import { LiveTimer } from "@/screens/teacher/classes/LiveTimer";
import { ActionButton, AttendanceBadge } from "@/screens/teacher/classes/parts";
import { CLASS_TYPE_LABELS, STATUS_LABELS, avatarUri, capitalize, classStudent, classTypeTone, formatDT, levelTone, statusTone, time12, type ClassAction, type ClassSession } from "@/screens/teacher/classes/types";

interface ClassCardProps {
  cls: ClassSession;
  /** True while an action on this class is in flight */
  busy: boolean;
  onAction: (action: Exclude<ClassAction, "end">) => void;
  onEndRequest: () => void;
  onDelete: () => void;
  onChangeType: () => void;
  onEditLink: () => void;
}

/** One class session: who, what, when, the live timer, and every action its status allows */
export function ClassCard({ cls, busy, onAction, onEndRequest, onDelete, onChangeType, onEditLink }: ClassCardProps) {
  const { c } = useTheme();
  const tone = toneColors(c, statusTone(cls.status));
  const typeTone = toneColors(c, classTypeTone(cls.classType));
  const student = classStudent(cls);
  const live = (cls.status === "in-progress" || cls.status === "paused") && !!cls.startedAt;
  // The meeting link can be opened or set before and during a class; its edit pencil only before the class starts
  const linkActions = cls.status === "scheduled" || cls.status === "in-progress";
  const canChangeType = cls.status === "scheduled";

  return (
    <View style={{ flexDirection: "row", backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: `${tone.solid}66`, overflow: "hidden" }}>
      <View style={{ width: 4, backgroundColor: tone.solid }} />
      <View style={{ flex: 1, padding: 14, gap: 10 }}>
        {/* Student + time / timer */}
        <Row gap={10} align="center">
          <Avatar uri={avatarUri(student?.avatar)} name={student?.fullName} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="bodyStrong" numberOfLines={1}>
              {student?.fullName || "—"}
            </T>
            <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
              {student?.studentId || "No ID"}
            </T>
          </View>
          {live && cls.startedAt ? (
            <LiveTimer startedAt={cls.startedAt} duration={cls.duration ?? 45} />
          ) : (
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Row gap={5} style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 9, paddingVertical: 6 }}>
                <Icon name="clock" size={13} color={cls.status === "completed" ? c.success : c.primary} />
                <T variant="smallStrong">{time12(cls.startTime)}</T>
                <T variant="small" color="faint">
                  →
                </T>
                <T variant="smallStrong">{time12(cls.endTime)}</T>
              </Row>
              {cls.status === "completed" ? (
                <T variant="caption" color="success">
                  ✓ {cls.actualDuration ?? cls.duration ?? 45} min
                </T>
              ) : null}
            </View>
          )}
        </Row>

        {/* Course */}
        <Row gap={10} align="flex-start">
          <IconChip icon="book-open" tone={statusTone(cls.status)} size={30} />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <T variant="bodyStrong" numberOfLines={2}>
              {cls.course?.title || "—"}
            </T>
            <Row gap={6} wrap>
              {cls.classId ? (
                <Pressable onPress={() => void copyText(cls.classId, "Class ID copied")} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Class ID ${cls.classId}. Tap to copy`}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.sm, backgroundColor: c.primarySoft }}>
                    <Text style={{ color: c.primaryText, fontSize: 10.5, fontWeight: "700", fontFamily: "monospace" }}>{cls.classId}</Text>
                    <Icon name="copy" size={10} color={c.primaryText} />
                  </View>
                </Pressable>
              ) : null}
              {/* The class type can be changed until the class starts */}
              <Pressable disabled={!canChangeType} onPress={onChangeType} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Class type: ${CLASS_TYPE_LABELS[cls.classType || "regular"] || "Regular Class"}${canChangeType ? ". Tap to change" : ""}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, backgroundColor: typeTone.bg }}>
                  <Text style={{ color: typeTone.fg, fontSize: 10.5, fontWeight: "700" }}>{CLASS_TYPE_LABELS[cls.classType || "regular"] || "Regular Class"}</Text>
                  {canChangeType ? <Icon name="chevron-down" size={11} color={typeTone.fg} /> : null}
                </View>
              </Pressable>
              {cls.course?.level ? <Badge label={cls.course.level} tone={levelTone(cls.course.level)} /> : null}
              <Badge label={STATUS_LABELS[cls.status] ?? cls.status} tone={statusTone(cls.status)} />
              <T variant="caption" color="faint">
                {capitalize(cls.dayOfWeek?.slice(0, 3))}
              </T>
            </Row>
            <View>
              {cls.createdAt ? (
                <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
                  Created: {formatDT(cls.createdAt)}
                </T>
              ) : null}
              {cls.updatedAt && cls.updatedAt !== cls.createdAt ? (
                <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
                  Updated: {formatDT(cls.updatedAt)}
                </T>
              ) : null}
            </View>
          </View>
        </Row>

        {/* Topic and meeting link */}
        {cls.topic ? (
          <Row gap={6} align="flex-start" style={{ backgroundColor: c.primarySoft, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Icon name="zap" size={13} color={c.primaryText} style={{ marginTop: 2 }} />
            <T variant="smallStrong" color="primary" style={{ flex: 1 }}>
              Topic: {cls.topic}
            </T>
          </Row>
        ) : null}
        {cls.meetLink ? (
          <Row gap={6} style={{ backgroundColor: c.successSoft, borderRadius: radius.sm, paddingLeft: 10, paddingRight: 2 }}>
            <Icon name="video" size={13} color={c.successText} />
            <Pressable onPress={() => void openExternal(cls.meetLink)} style={{ flex: 1, paddingVertical: 8 }} accessibilityRole="link" accessibilityLabel="Open the meeting link">
              <T variant="small" color="success" numberOfLines={1}>
                {cls.meetLink}
              </T>
            </Pressable>
            <IconButton icon="copy" size={34} color={c.successText} accessibilityLabel="Copy meeting link" onPress={() => void copyText(cls.meetLink ?? "", "Meeting link copied")} />
          </Row>
        ) : null}
        {cls.notes ? (
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
            <T variant="small" color="muted" style={{ fontStyle: "italic" }}>
              {cls.notes}
            </T>
          </View>
        ) : null}

        {/* Actions */}
        <Row gap={8} wrap style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
          {linkActions && cls.meetLink ? (
            <>
              <ActionButton title="Join Meet" icon="video" bg={c.success} onPress={() => void openExternal(cls.meetLink)} />
              {cls.status === "scheduled" ? <IconButton icon="edit-2" size={40} color={c.textMuted} background={c.surfaceAlt} accessibilityLabel="Edit meeting link" onPress={onEditLink} /> : null}
            </>
          ) : null}
          {/* A class without a link gets an amber prompt: the link is required */}
          {linkActions && !cls.meetLink ? <ActionButton title="+ Add Link" icon="video" bg={c.warning} onPress={onEditLink} /> : null}

          {cls.status === "scheduled" ? <ActionButton title="Start" icon="play-circle" bg={c.primary} loading={busy} onPress={() => onAction("start")} /> : null}

          {cls.status === "in-progress" ? (
            <>
              <ActionButton title="Reschedule" icon="refresh-cw" bg={c.surfaceAlt} fg={c.text} loading={busy} onPress={() => onAction("reset")} />
              <ActionButton title="Pause" icon="pause-circle" bg={c.warning} loading={busy} onPress={() => onAction("pause")} />
              <ActionButton title="End Class" icon="stop-circle" bg={c.danger} loading={busy} onPress={onEndRequest} />
            </>
          ) : null}

          {cls.status === "paused" ? (
            <>
              <ActionButton title="Reschedule" icon="refresh-cw" bg={c.surfaceAlt} fg={c.text} loading={busy} onPress={() => onAction("reset")} />
              <ActionButton title="Resume" icon="play-circle" bg={c.primary} loading={busy} onPress={() => onAction("resume")} />
              <ActionButton title="End Class" icon="stop-circle" bg={c.danger} loading={busy} onPress={onEndRequest} />
            </>
          ) : null}

          {cls.status === "completed" ? (
            <>
              <Badge label="Done" tone="success" icon="check-circle" style={{ alignSelf: "center" }} />
              <View style={{ alignSelf: "center" }}>
                <AttendanceBadge status={cls.studentAttendance} />
              </View>
            </>
          ) : (
            // A finished class can no longer be deleted
            <IconButton icon="trash-2" size={40} color={c.dangerText} background={c.dangerSoft} accessibilityLabel="Delete class" disabled={busy} onPress={onDelete} style={{ marginLeft: "auto" }} />
          )}
        </Row>
      </View>
    </View>
  );
}
