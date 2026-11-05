import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { successFeedback, tapFeedback } from "@/lib/device";
import { formatTime12 } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Badge, Banner, Button, Chip, Divider, Icon, IconButton, Input, Row, Select, Sheet, T, TimeField, type Option } from "@/ui";

import {
  DURATION_OPTIONS,
  EMPTY_SCHEDULE_FORM,
  WEEK_DAYS,
  buildEditForm,
  calcEndTimeStr,
  capitalize,
  sendJson,
  useLast,
  withDayCopiedToAll,
  withDayTime,
  withDayToggled,
  withDefaultAppliedToAll,
  withDefaultDuration,
  withDefaultStart,
  type ScheduleForm,
  type TeacherStudent,
} from "@/screens/teacher/students/shared";

/** The duration choices, plus the saved value when it is not one of the standard ones (so it still shows) */
function durationOptions(current: number, short: boolean): Option<number>[] {
  const options = DURATION_OPTIONS.map((opt) => ({ value: opt.value, label: short ? `${opt.value}m` : opt.label }));
  if (current && !options.some((opt) => opt.value === current)) {
    options.push({ value: current, label: short ? `${current}m` : `${current} mins` });
    options.sort((a, b) => a.value - b.value);
  }
  return options;
}

interface EditScheduleSheetProps {
  /** The student being edited; null keeps the sheet closed */
  student: TeacherStudent | null;
  /** The teacher's own ID (e.g. "TCH-0012"), shown under the title */
  teacherId?: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "Edit Student Details": the weekly class schedule of one assigned student.
 * A default start time and duration, the class days, and a time and duration for each day.
 */
export function EditScheduleSheet({ student, teacherId, onClose, onSaved }: EditScheduleSheetProps) {
  const { c } = useTheme();
  const [form, setForm] = useState<ScheduleForm>(EMPTY_SCHEDULE_FORM);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [countError, setCountError] = useState("");
  const shown = useLast(student);

  useEffect(() => {
    if (!student) return;
    setForm(buildEditForm(student));
    setApiError("");
    setCountError("");
  }, [student]);

  const defaultDurations = useMemo(() => durationOptions(form.duration, false), [form.duration]);
  const dayCount = form.weeklyDays.length;
  const severalDays = dayCount > 1;

  const submit = async () => {
    if (!student) return;
    setApiError("");
    // The web input is a number field limited to 1–7
    const count = form.weeklyDaysCount.trim();
    if (count && (Number(count) < 1 || Number(count) > 7)) {
      setCountError("Weekly days must be between 1 and 7.");
      return;
    }
    setSaving(true);
    const result = await sendJson("PUT", `/api/teacher-portal/students/${student._id}`, { ...form, duration: Number(form.duration) || 45 }, "Failed to update student.");
    setSaving(false);
    if (!result.ok) {
      setApiError(result.message);
      return;
    }
    successFeedback();
    onSaved();
  };

  return (
    <Sheet
      visible={!!student}
      onClose={onClose}
      full
      title="Edit Student Details"
      subtitle={`Assigned to Teacher ID: ${teacherId || "Loading..."}`}
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          <Button title={saving ? "Saving..." : "Save Changes"} icon="edit-2" block style={{ flex: 1 }} loading={saving} onPress={() => void submit()} />
        </Row>
      }
    >
      {shown ? (
        <Row gap={10}>
          <Icon name="user" size={15} color={c.textFaint} />
          <T variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
            {shown.fullName}
            <T variant="small" color="muted">
              {shown.studentId ? `  ·  ${shown.studentId}` : ""}
            </T>
          </T>
        </Row>
      ) : null}

      {apiError ? <Banner tone="danger" message={apiError} /> : null}

      <Row justify="space-between">
        <Row gap={8} style={{ flex: 1 }}>
          <Icon name="calendar" size={16} color={c.primary} />
          <T variant="title">
            Class Schedule{" "}
            <T variant="small" color="faint">
              (optional)
            </T>
          </T>
        </Row>
        {dayCount > 0 ? <Badge tone="primary" label={`${dayCount} ${dayCount === 1 ? "day" : "days"} selected`} /> : null}
      </Row>

      <Row gap={10} align="flex-start">
        <Input
          label="Weekly Days"
          value={form.weeklyDaysCount}
          onChangeText={(text) => {
            setCountError("");
            setForm((p) => ({ ...p, weeklyDaysCount: text.replace(/\D/g, "").slice(0, 2) }));
          }}
          keyboardType="number-pad"
          placeholder="e.g. 3"
          error={countError}
          containerStyle={{ flex: 1 }}
        />
        <Select<number> label="Class Duration" value={form.duration} options={defaultDurations} onChange={(value) => setForm((p) => withDefaultDuration(p, value))} containerStyle={{ flex: 1.4 }} />
      </Row>

      <View style={{ gap: 6 }}>
        <TimeField label="Default Start Time" value={form.startTime} onChange={(time) => setForm((p) => withDefaultStart(p, time))} placeholder="Choose a time" />
        {form.startTime ? (
          <Button title="Clear start time" variant="ghost" size="sm" icon="x" style={{ alignSelf: "flex-end" }} onPress={() => setForm((p) => withDefaultStart(p, ""))} />
        ) : null}
      </View>

      {form.startTime ? (
        <View style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, gap: 8 }}>
          <Row gap={6} wrap>
            <Icon name="clock" size={14} color={c.primary} />
            <T variant="small" color="muted">
              Default Session:
            </T>
            <T variant="smallStrong">{formatTime12(form.startTime)}</T>
            <T variant="small" color="faint">
              →
            </T>
            <T variant="smallStrong">{formatTime12(form.endTime || calcEndTimeStr(form.startTime, form.duration))}</T>
            <T variant="small" color="muted">
              ({form.duration} mins)
            </T>
          </Row>
          {severalDays ? (
            <Row justify="space-between" gap={10}>
              <T variant="caption" color="faint" style={{ flex: 1 }}>
                Apply this time & duration to all selected days
              </T>
              <Button
                title="Apply to All"
                icon="zap"
                variant="outline"
                size="sm"
                style={{ height: 40 }}
                onPress={() => {
                  tapFeedback();
                  setForm(withDefaultAppliedToAll);
                }}
              />
            </Row>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <T variant="smallStrong" color="muted">
          Select Class Days
        </T>
        <Row wrap gap={8}>
          {WEEK_DAYS.map((day) => {
            const selected = form.weeklyDays.includes(day);
            return <Chip key={day} label={capitalize(day)} selected={selected} icon={selected ? "check" : undefined} style={{ height: 40 }} onPress={() => setForm((p) => withDayToggled(p, day))} />;
          })}
        </Row>
      </View>

      {dayCount > 0 ? (
        <>
          <Divider />
          <View style={{ gap: 2 }}>
            <Row gap={6}>
              <Icon name="star" size={14} color={c.warning} />
              <T variant="smallStrong">Day-wise Class Time & Duration</T>
            </Row>
            <T variant="caption" color="faint">
              Adjust specific times per day if needed
              {severalDays ? ". The copy button uses that day's time for all selected days." : ""}
            </T>
          </View>

          {form.weeklyDays.map((day) => {
            const dayTime = form.dayTimes.find((dt) => dt.day.toLowerCase() === day.toLowerCase()) ?? {
              day,
              startTime: form.startTime || "",
              duration: form.duration || 45,
              endTime: form.endTime || calcEndTimeStr(form.startTime, form.duration),
            };
            const duration = dayTime.duration || form.duration || 45;
            return (
              <View key={day} style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, gap: 8 }}>
                <Row justify="space-between" gap={8}>
                  <T variant="bodyStrong" style={{ flexShrink: 1 }}>
                    {capitalize(day)}
                  </T>
                  <Row gap={4}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
                      <T variant="mono" color="primary" style={{ fontSize: 11.5 }}>
                        {dayTime.startTime ? formatTime12(dayTime.startTime) : "--:--"} → {dayTime.startTime ? formatTime12(dayTime.endTime || calcEndTimeStr(dayTime.startTime, duration)) : "--:--"}
                      </T>
                    </View>
                    {dayTime.startTime ? (
                      <IconButton icon="x" size={36} accessibilityLabel={`Clear the ${day} start time`} onPress={() => setForm((p) => withDayTime(p, day, { startTime: "" }))} />
                    ) : null}
                  </Row>
                </Row>
                <Row gap={8}>
                  <TimeField value={dayTime.startTime} onChange={(time) => setForm((p) => withDayTime(p, day, { startTime: time }))} placeholder="Start time" containerStyle={{ flex: 1 }} />
                  <Select<number>
                    value={duration}
                    options={durationOptions(duration, true)}
                    onChange={(value) => setForm((p) => withDayTime(p, day, { duration: value }))}
                    title={`${capitalize(day)} duration`}
                    containerStyle={{ width: 92 }}
                  />
                  {severalDays ? (
                    <IconButton
                      icon="copy"
                      size={40}
                      background={c.surface}
                      accessibilityLabel="Copy this day's time to all selected days"
                      onPress={() => {
                        tapFeedback();
                        setForm((p) => withDayCopiedToAll(p, day));
                      }}
                    />
                  ) : null}
                </Row>
              </View>
            );
          })}
        </>
      ) : null}
    </Sheet>
  );
}
