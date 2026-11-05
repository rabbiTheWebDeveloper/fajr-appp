import React from "react";
import { View } from "react-native";

import { minutesToTime12 } from "@/lib/format";
import { Badge, Banner, Button, Field, Input, Row, Segmented, Select, Sheet, T, TimeField } from "@/ui";

import { CLASS_TYPES, CREATE_WINDOW_MINUTES, DAYS, DURATION_PRESETS, MAX_DURATION, MIN_DURATION, capitalize, clampDuration, type ClassForm, type ClassType, type Course, type Student } from "@/screens/teacher/classes/types";

interface NewClassSheetProps {
  visible: boolean;
  onClose: () => void;
  form: ClassForm;
  onChange: (patch: Partial<ClassForm>) => void;
  students: Student[];
  courses: Course[];
  /** Day, time and duration were filled in from the chosen student's weekly schedule */
  studentHasSchedule: boolean;
  onStudentChange: (studentId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  /** Validation or server message shown above the buttons */
  error: string;
  todayDayKey: string;
  nowMinutes: number;
}

function AutoLabel({ text, auto }: { text: string; auto: boolean }) {
  return (
    <Row gap={6} justify="space-between">
      <T variant="smallStrong" color="muted">
        {text}
        <T variant="smallStrong" color="danger">
          {" *"}
        </T>
      </T>
      {auto ? <Badge label="Auto" tone="primary" /> : null}
    </Row>
  );
}

/** "Schedule New Class": the same fields and rules as the website's dialog */
export function NewClassSheet({ visible, onClose, form, onChange, students, courses, studentHasSchedule, onStudentChange, onSubmit, submitting, error, todayDayKey, nowMinutes }: NewClassSheetProps) {
  // The server refuses a class for today that starts more than 30 minutes from now: say so before the teacher submits
  const startMatch = /^(\d{2}):(\d{2})$/.exec(form.startTime);
  const startMins = startMatch ? Number(startMatch[1]) * 60 + Number(startMatch[2]) : null;
  const tooEarly = form.dayOfWeek === todayDayKey && startMins !== null && startMins - nowMinutes > CREATE_WINDOW_MINUTES;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Schedule New Class"
      full
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          <Button title={submitting ? "Scheduling…" : "Schedule Class"} icon="plus" block style={{ flex: 1 }} loading={submitting} onPress={onSubmit} />
        </Row>
      }
    >
      <Select
        label="Student"
        required
        icon="users"
        value={form.studentId || null}
        onChange={onStudentChange}
        placeholder="— Choose Student —"
        title="Choose Student"
        searchable
        options={students.map((s) => ({ value: s._id, label: `${s.fullName} · ${s.studentId}` }))}
        hint={students.length === 0 ? "No students assigned to you yet." : undefined}
      />

      <Select
        label="Course"
        required
        icon="book-open"
        value={form.courseId || null}
        onChange={(courseId) => onChange({ courseId })}
        placeholder={courses.length === 0 ? "No courses available" : "— Choose Course —"}
        title="Choose Course"
        disabled={courses.length === 0}
        options={courses.map((course) => ({ value: course._id, label: `${course.title}${course.courseId ? ` (${course.courseId})` : ""}` }))}
      />

      {studentHasSchedule ? <Banner tone="primary" message="Day, time & duration auto-filled from student's schedule. You can still edit them." /> : null}

      <Row gap={12} align="flex-start">
        <View style={{ flex: 1, gap: 6 }}>
          <AutoLabel text="Day" auto={studentHasSchedule} />
          <Select value={form.dayOfWeek} onChange={(dayOfWeek) => onChange({ dayOfWeek })} title="Day" icon="calendar" searchable={false} options={DAYS.map((d) => ({ value: d, label: capitalize(d) }))} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <AutoLabel text="Start Time" auto={studentHasSchedule} />
          <TimeField value={form.startTime} onChange={(startTime) => onChange({ startTime })} minuteStep={1} placeholder="Start time" />
        </View>
      </Row>

      {tooEarly && startMins !== null ? (
        <Banner
          tone="warning"
          message={`Class can only be created starting 30 minutes before scheduled start time (opens at ${minutesToTime12(startMins - CREATE_WINDOW_MINUTES)}, in ${startMins - nowMinutes - CREATE_WINDOW_MINUTES} minutes).`}
        />
      ) : null}

      <View style={{ gap: 6 }}>
        <AutoLabel text="Duration (minutes)" auto={studentHasSchedule} />
        <Row gap={10} align="flex-start">
          <Input
            containerStyle={{ flex: 1 }}
            icon="clock"
            keyboardType="number-pad"
            maxLength={3}
            placeholder="45"
            value={form.duration}
            onChangeText={(text) => onChange({ duration: text.replace(/\D/g, "") })}
            // Typing is left alone and the value is pulled back into 15–180 when the field is left
            onBlur={() => onChange({ duration: String(clampDuration(form.duration)) })}
          />
          <Select
            containerStyle={{ flex: 1 }}
            value={DURATION_PRESETS.includes(Number(form.duration)) ? form.duration : null}
            onChange={(duration) => onChange({ duration })}
            title="Duration"
            placeholder="Presets"
            searchable={false}
            options={DURATION_PRESETS.map((d) => ({ value: String(d), label: `${d} min` }))}
          />
        </Row>
        <T variant="caption" color="faint">
          Between {MIN_DURATION} and {MAX_DURATION} minutes. Double-booking is prevented automatically.
        </T>
      </View>

      <Field label="Class Type" required hint="(default: regular)">
        <Segmented<ClassType> value={form.classType || "regular"} onChange={(classType) => onChange({ classType })} options={CLASS_TYPES} />
      </Field>

      <Input
        label="Class Topic"
        required
        icon="zap"
        value={form.topic}
        onChangeText={(topic) => onChange({ topic })}
        placeholder="Type class topic (e.g., Surah Al-Fatiha, Tajweed basics…)"
        hint="Required. Please type the topic for this class session."
      />

      <Input
        label="Meeting Link"
        required
        icon="video"
        value={form.meetLink}
        onChangeText={(meetLink) => onChange({ meetLink })}
        placeholder="https://meet.google.com/xxx-xxxx-xxx"
        hint="Required. Paste your Google Meet, Zoom, or video call link here."
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Input label="Notes" multiline value={form.notes} onChangeText={(notes) => onChange({ notes })} placeholder="Optional notes for this session…" />

      {error ? <Banner tone="danger" message={error} /> : null}
    </Sheet>
  );
}
