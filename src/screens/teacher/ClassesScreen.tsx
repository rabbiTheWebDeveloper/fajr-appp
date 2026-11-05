import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { api, errorMessage } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { academyDateKey, academyMinutesNow, academyMonthKey } from "@/lib/format";
import { useAppForeground, useFetch, useNow } from "@/lib/hooks";
import { useNav } from "@/navigation/nav";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { useTheme } from "@/theme/ThemeContext";
import { Banner, Button, Card, Chip, EmptyState, ErrorState, Icon, Pagination, Row, Screen, Segmented, SkeletonList, T, confirmAsync, toast } from "@/ui";

import { AttendanceClassRow, AttendanceStudentRow, AttendanceSummary, type AttendanceTab } from "@/screens/teacher/classes/AttendanceView";
import { ClassCard } from "@/screens/teacher/classes/ClassCard";
import { ClassTypeSheet, MeetLinkSheet } from "@/screens/teacher/classes/ClassSheets";
import { EndClassSheet } from "@/screens/teacher/classes/EndClassSheet";
import { KpiStrip } from "@/screens/teacher/classes/KpiStrip";
import { NewClassSheet } from "@/screens/teacher/classes/NewClassSheet";
import { MonthFilter, toastAfterSheet } from "@/screens/teacher/classes/parts";
import { StudentRow, StudentsToolbar } from "@/screens/teacher/classes/StudentsView";
import { TodayPanel } from "@/screens/teacher/classes/TodayPanel";
import {
  BLANK_FORM,
  LIMIT,
  bdClientTime,
  bdDayKey,
  bdTodayFormatted,
  buildStudentAttendance,
  capitalize,
  clampDuration,
  classStudent,
  classStudentId,
  normalizeMeetLink,
  normalizeTime,
  studentCourseId,
  time12,
  todayScheduleFor,
  type Attendance,
  type ClassAction,
  type ClassActionReply,
  type ClassForm,
  type ClassListReply,
  type ClassSession,
  type ClassType,
  type CoursesReply,
  type StatsReply,
  type Student,
  type StudentAttendanceRow,
  type StudentsReply,
  type Tab,
  type TodayScheduleItem,
  type TodaySessionStatus,
  type ViewMode,
} from "@/screens/teacher/classes/types";
import { useKeyedFetch } from "@/screens/teacher/classes/useKeyedFetch";

const CLASS_API = "/api/teacher-portal/class";
const NO_CLASSES: ClassSession[] = [];
const NO_STUDENTS: Student[] = [];

/** The page is one scrolling list; what its rows are depends on the view on show */
type RowItem =
  | { kind: "class"; key: string; cls: ClassSession }
  | { kind: "student"; key: string; student: Student; index: number }
  | { kind: "attClass"; key: string; cls: ClassSession; index: number }
  | { kind: "attStudent"; key: string; row: StudentAttendanceRow };

/** Teacher "My Classes": today's classes, starting / pausing / ending them, scheduling new ones, students and attendance */
export default function TeacherClassesScreen() {
  const { c } = useTheme();
  const nav = useNav();
  const { refreshGems } = useTeacher();

  // "Today", the weekday and the clock are Bangladesh time whatever the phone's zone; re-read twice a minute
  const now = useNow(30_000);
  const todayIso = academyDateKey(now);
  const todayDayKey = bdDayKey(now);
  const nowMinutes = academyMinutesNow(now);

  /* ── What is on show ── */
  const [viewMode, setViewMode] = useState<ViewMode>("classes");
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduledFilter, setScheduledFilter] = useState<"today" | "all">("today");
  const [filterMonth, setFilterMonth] = useState(() => academyMonthKey());
  const [pages, setPages] = useState<Record<Tab, number>>({ scheduled: 1, "in-progress": 1, completed: 1 });
  const [search, setSearch] = useState("");
  const [attTab, setAttTab] = useState<AttendanceTab>("classes");

  /* ── Sheets and in-flight actions ── */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClassForm>(BLANK_FORM);
  const [studentHasSchedule, setStudentHasSchedule] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<ClassSession | null>(null);
  const [endError, setEndError] = useState("");
  const [linkTarget, setLinkTarget] = useState<ClassSession | null>(null);
  const [typeTarget, setTypeTarget] = useState<ClassSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Server data ── */
  // Today's scheduled classes are a small set: asked for by weekday, all at once. Everything else is paged.
  const todayOnly = tab === "scheduled" && scheduledFilter === "today";
  const page = pages[tab];
  const list = useKeyedFetch<ClassListReply>(CLASS_API, todayOnly ? { status: tab, month: filterMonth, dayOfWeek: todayDayKey, all: true } : { status: tab, month: filterMonth, page, limit: LIMIT });
  const stats = useFetch<StatsReply>(`${CLASS_API}/stats`, { month: filterMonth });
  const studentsQ = useFetch<StudentsReply>("/api/teacher-portal/students", { all: true });
  const coursesQ = useFetch<CoursesReply>("/api/teacher-portal/courses");
  // Re-read every minute so a class created elsewhere shows up in the today panel
  const today = useFetch<ClassListReply>(CLASS_API, { all: true, date: todayIso }, { pollMs: 60_000 });
  const attendance = useKeyedFetch<ClassListReply>(CLASS_API, { status: "completed", month: filterMonth, all: true }, { enabled: viewMode === "attendance" });

  const kpiStats = stats.data?.success ? (stats.data.stats ?? null) : null;
  const students = useMemo(() => (studentsQ.data?.success ? studentsQ.data.allStudents || studentsQ.data.students || NO_STUDENTS : NO_STUDENTS), [studentsQ.data]);
  const courses = coursesQ.data?.success ? (coursesQ.data.courses ?? []) : [];
  const todayClasses = today.data?.success ? (today.data.classes ?? NO_CLASSES) : NO_CLASSES;

  const listReady = !list.pending && !list.error;
  const classes = listReady && list.data?.success ? (list.data.classes ?? NO_CLASSES) : NO_CLASSES;
  const total = listReady ? (list.data?.pagination?.total ?? classes.length) : 0;
  const totalPages = listReady ? (list.data?.pagination?.totalPages ?? 1) : 1;

  const attendanceReady = !attendance.pending && !attendance.error;
  const completed = attendanceReady && attendance.data?.success ? (attendance.data.classes ?? NO_CLASSES) : NO_CLASSES;
  const studentAttendance = useMemo(() => buildStudentAttendance(completed), [completed]);
  const totalPresent = completed.filter((cl) => cl.studentAttendance === "present").length;
  const totalAbsent = completed.filter((cl) => cl.studentAttendance === "absent").length;
  const attendancePct = completed.length > 0 ? Math.round((totalPresent / completed.length) * 100) : 0;

  // Tab counts come from the month figures; until those arrive only the open tab knows its own total
  const countFor = (key: Tab, fromStats: number | undefined) => fromStats ?? (tab === key ? total : 0);
  const scheduledCount = countFor("scheduled", kpiStats?.scheduled);
  const inProgressCount = countFor("in-progress", kpiStats?.inProgress);
  const completedCount = countFor("completed", kpiStats?.completed);

  /* ── Today's schedule panel: students with a class today × the classes created today ── */
  const todayItems = useMemo<TodayScheduleItem[]>(() => {
    const items: TodayScheduleItem[] = [];
    for (const student of students) {
      const slot = todayScheduleFor(student, todayDayKey);
      if (!slot) continue;
      const todayClass = todayClasses.find((cl) => classStudentId(cl) === String(student._id));
      items.push({ student, todayClass, status: (todayClass?.status as TodaySessionStatus | undefined) ?? "uncreated", slot });
    }
    return items;
  }, [students, todayClasses, todayDayKey]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter((s) => s.fullName?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || (s.phone || "").includes(search));
  }, [students, search]);

  /* ── Reloading ── */
  // Coming back to the app: the students' schedules and today's classes may have changed meanwhile
  useAppForeground(() => {
    void studentsQ.reload();
    void today.reload();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([studentsQ.reload(), coursesQ.reload(), stats.reload(), today.reload(), list.reload(), attendance.reload()]);
    setRefreshing(false);
  };

  const setPage = (key: Tab, next: number) => setPages((prev) => ({ ...prev, [key]: next }));
  const resetPages = () => setPages({ scheduled: 1, "in-progress": 1, completed: 1 });

  /** Show a tab; when it is already open its list is re-read instead */
  const openTab = (target: Tab) => {
    if (target === tab) void list.reload();
    else setTab(target);
  };

  const patchListClass = (classId: string, patch: (cls: ClassSession) => ClassSession) =>
    list.setData((prev) => (prev ? { ...prev, classes: (prev.classes ?? []).map((cl) => (cl._id === classId ? patch(cl) : cl)) } : prev));

  /* ── Create ── */
  const openBlankForm = () => {
    setForm({ ...BLANK_FORM, dayOfWeek: todayDayKey });
    setStudentHasSchedule(false);
    setFormError("");
    setShowForm(true);
  };

  /** Choosing a student fills course, day, time, duration and meeting link from their schedule */
  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s._id === studentId);
    if (!studentId || !student) {
      setForm((prev) => ({ ...prev, studentId }));
      setStudentHasSchedule(false);
      return;
    }

    const updates: Partial<ClassForm> = {};
    const courseId = studentCourseId(student);
    if (courseId) updates.courseId = courseId;

    const rawDay = student.schedule?.dayOfWeek || student.schedule?.weekly_days_list?.[0] || null;
    const dur = student.schedule?.duration || student.schedule?.classDuration || null;
    const day = rawDay ? String(rawDay).toLowerCase().trim() : null;
    const startTime = normalizeTime(student.schedule?.startTime);

    if (day) updates.dayOfWeek = day;
    if (startTime) updates.startTime = startTime;
    if (dur) updates.duration = String(dur);
    // The topic is never auto-filled: the teacher types it for each class
    const meetLink = student.meetLink || student.schedule?.meetLink;
    if (meetLink) updates.meetLink = meetLink;

    setStudentHasSchedule(!!(day && startTime));
    setForm((prev) => ({ ...prev, studentId, ...updates }));
  };

  /** "+ Create" on a student in the today panel: the form opens filled in for today's slot */
  const handleQuickCreate = (student: Student) => {
    const todaySch = todayScheduleFor(student, todayDayKey);
    const rawDay = todaySch ? todayDayKey : student.schedule?.dayOfWeek || student.schedule?.weekly_days_list?.[0] || null;
    const rawStart = todaySch?.startTime || student.schedule?.startTime || null;
    const dur = todaySch?.duration || student.schedule?.duration || student.schedule?.classDuration || null;

    setForm({
      ...BLANK_FORM,
      studentId: student._id,
      courseId: studentCourseId(student),
      dayOfWeek: rawDay ? String(rawDay).toLowerCase().trim() : todayDayKey,
      startTime: normalizeTime(rawStart) || "10:00",
      duration: dur ? String(dur) : "45",
      meetLink: student.meetLink || student.schedule?.meetLink || "",
    });
    setStudentHasSchedule(!!(rawDay && rawStart));
    setFormError("");
    setShowForm(true);
  };

  const handleCreate = async () => {
    const missing: string[] = [];
    if (!form.studentId) missing.push("Student");
    if (!form.courseId) missing.push("Course");
    if (!form.dayOfWeek) missing.push("Day");
    if (!form.startTime) missing.push("Start Time");
    if (!form.topic.trim()) missing.push("Topic");
    if (!form.meetLink.trim()) missing.push("Meeting Link");
    if (form.startTime && !/^\d{2}:\d{2}$/.test(form.startTime)) missing.push("Start Time (must be HH:MM)");

    let meetLink = form.meetLink.trim();
    if (meetLink) {
      const normalized = normalizeMeetLink(meetLink);
      if (normalized) meetLink = normalized;
      else missing.push("Valid Meeting Link URL");
    }

    if (missing.length > 0) {
      setFormError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const json = await api.post<ClassActionReply>(CLASS_API, { ...form, duration: String(clampDuration(form.duration)), meetLink });
      if (!json.success) {
        setFormError(json.message || "The class could not be scheduled.");
        return;
      }

      setShowForm(false);
      setViewMode("classes");
      setForm((prev) => ({ ...prev, studentId: "", courseId: "", duration: "45", notes: "", meetLink: "", topic: "", classType: "regular" }));
      toastAfterSheet("success", "Class scheduled successfully! 🎯");
      successFeedback();

      // Show the new class straight away; the quiet reloads below then bring the server's view
      const created = json.class;
      if (created) {
        const withCreated = (prev: ClassListReply | null) => (prev ? { ...prev, classes: [created, ...(prev.classes ?? []).filter((cl) => cl._id !== created._id)] } : prev);
        today.setData(withCreated);
        if (tab === "scheduled") list.setData(withCreated);
      }
      openTab("scheduled");
      void stats.reload();
      void today.reload();
      void refreshGems();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Start / pause / resume / reset / end ── */
  const handleAction = async (classId: string, action: ClassAction, attendanceMark?: Attendance, topic?: string) => {
    setActing(classId);
    if (action === "end") setEndError("");
    try {
      // clientTime is the Bangladesh wall clock ("HH:MM"): the server uses it for the early-start check
      const json = await api.patch<ClassActionReply>(CLASS_API, { classId, action, attendance: attendanceMark, topic, clientTime: bdClientTime() });
      if (!json.success) throw new Error(json.message || "The class could not be updated.");

      if (action === "start") {
        openTab("in-progress");
        const penalty = json.earlyStartPenalty?.applied ? json.earlyStartPenalty : null;
        toast.success(penalty ? `Class started! Good luck! 🎯\n${penalty.gems} 💎 gems (started ${penalty.earlyByMinutes} min early)` : "Class started! Good luck! 🎯");
      } else if (action === "end") {
        setEndTarget(null);
        openTab("completed");
        // Summed from the breakdown: the reply's own total counts a streak bonus twice
        const earned = json.gems?.breakdown?.reduce((sum, item) => sum + (Number(item.gems) || 0), 0);
        toastAfterSheet("success", typeof earned === "number" && earned !== 0 ? `Class ended & saved! ✅\n${earned > 0 ? `+${earned}` : earned} 💎 gems` : "Class ended & saved! ✅");
        successFeedback();
      } else if (action === "reset") {
        openTab("scheduled");
        toast.info("Class rescheduled.");
      } else {
        // Pause / resume: the card changes in place
        const updated = json.class;
        if (updated) patchListClass(classId, () => updated);
      }
      void stats.reload();
      void today.reload();
      if (action === "start" || action === "end" || action === "reset") void refreshGems();
    } catch (e) {
      // A failed "End & Save" stays on show in the end sheet, beside the button to try again
      if (action === "end") setEndError(errorMessage(e));
      else toast.error(errorMessage(e));
    } finally {
      setActing(null);
    }
  };

  const handleUpdateTopic = async (classId: string, topic: string): Promise<boolean> => {
    setEndError("");
    try {
      const json = await api.patch<ClassActionReply>(CLASS_API, { classId, action: "updateTopic", topic });
      if (!json.success) {
        setEndError(json.message || "Failed to update topic");
        return false;
      }
      toast.success("Class topic updated successfully");
      patchListClass(classId, (cl) => ({ ...cl, topic }));
      setEndTarget((prev) => (prev && prev._id === classId ? { ...prev, topic } : prev));
      void today.reload();
      return true;
    } catch (e) {
      setEndError(errorMessage(e, "Failed to update topic"));
      return false;
    }
  };

  const handleUpdateClassType = async (cls: ClassSession, classType: ClassType) => {
    setTypeTarget(null);
    if ((cls.classType || "regular") === classType) return;
    try {
      const json = await api.patch<ClassActionReply>(CLASS_API, { classId: cls._id, action: "updateClassType", classType });
      if (!json.success) {
        toast.error(json.message || "Failed to update class type");
        return;
      }
      toast.success(`Class type changed to ${classType}`);
      patchListClass(cls._id, (cl) => ({ ...cl, classType }));
      void today.reload();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update class type"));
    }
  };

  /** Resolves "" when the link was saved, else the message for the sheet */
  const handleUpdateMeetLink = async (cls: ClassSession, rawLink: string): Promise<string> => {
    if (!rawLink.trim()) return "Meeting link is required.";
    const meetLink = normalizeMeetLink(rawLink);
    if (!meetLink) return "Invalid meeting link URL.";
    try {
      const json = await api.patch<ClassActionReply>(CLASS_API, { classId: cls._id, action: "updateMeetLink", meetLink });
      if (!json.success) return json.message || "Failed to update meeting link";
      setLinkTarget(null);
      toastAfterSheet("success", "Meeting link updated successfully!");
      patchListClass(cls._id, (cl) => ({ ...cl, meetLink }));
      void today.reload();
      return "";
    } catch (e) {
      return errorMessage(e, "Failed to update meeting link");
    }
  };

  /* ── Delete ── */
  const handleDelete = async (cls: ClassSession) => {
    const confirmed = await confirmAsync({
      title: "Delete Class?",
      message: `${classStudent(cls)?.fullName || "—"} · ${cls.course?.title || "—"}\n${cls.classId ? `${cls.classId} · ` : ""}${capitalize(cls.dayOfWeek)} · ${time12(cls.startTime)} – ${time12(cls.endTime)}`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setActing(cls._id);
    try {
      const json = await api.delete<{ success: boolean; message?: string }>(CLASS_API, { id: cls._id });
      if (!json.success) {
        toast.error(json.message || "Delete failed");
        return;
      }
      // Back to the first page of this tab
      if (!todayOnly && page !== 1) setPage(tab, 1);
      else void list.reload();
      void stats.reload();
      void today.reload();
      void refreshGems();
    } catch (e) {
      toast.error(errorMessage(e, "Delete failed"));
    } finally {
      setActing(null);
    }
  };

  /* ── Rows and states of the list ── */
  let rows: RowItem[];
  let emptyState: React.ReactElement;

  if (viewMode === "classes") {
    rows = classes.map<RowItem>((cls) => ({ kind: "class", key: cls._id, cls }));
    if (list.pending) {
      emptyState = <SkeletonList count={3} lines={3} />;
    } else if (list.error) {
      emptyState = (
        <Card padding={0}>
          <ErrorState compact message={list.error} onRetry={list.retry} />
        </Card>
      );
    } else if (tab === "scheduled") {
      const offerAll = scheduledFilter === "today" && (kpiStats?.scheduled ?? 0) > 0;
      emptyState = (
        <Card padding={0}>
          <EmptyState
            icon="list"
            tone="neutral"
            title={scheduledFilter === "today" ? `No classes scheduled for today (${bdTodayFormatted(now)})` : "No scheduled classes found"}
            message={'Tap "New Class" to schedule a session, or switch to All Scheduled to view your upcoming classes.'}
            actionLabel={offerAll ? `View All Scheduled (${kpiStats?.scheduled})` : undefined}
            onAction={offerAll ? () => setScheduledFilter("all") : undefined}
          />
        </Card>
      );
    } else if (tab === "in-progress") {
      emptyState = (
        <Card padding={0}>
          <EmptyState icon="clock" tone="warning" title="No class currently in progress" message="Start a scheduled class from the Scheduled tab." />
        </Card>
      );
    } else {
      emptyState = (
        <Card padding={0}>
          <EmptyState icon="check-circle" tone="success" title="No completed classes yet" message="Ended classes will appear here with attendance history." />
        </Card>
      );
    }
  } else if (viewMode === "students") {
    const studentsFailed = !!studentsQ.error && !studentsQ.data;
    rows = studentsQ.loading || studentsFailed ? [] : filteredStudents.map<RowItem>((student, index) => ({ kind: "student", key: student._id, student, index }));
    if (studentsQ.loading) {
      emptyState = <SkeletonList count={4} lines={3} />;
    } else if (studentsFailed) {
      emptyState = (
        <Card padding={0}>
          <ErrorState compact message={studentsQ.error} onRetry={studentsQ.retry} />
        </Card>
      );
    } else {
      emptyState = (
        <Card padding={0}>
          <EmptyState icon="users" tone="neutral" title="No students found" message={search ? "No students match your search." : "You have no students assigned yet."} />
        </Card>
      );
    }
  } else {
    rows = attTab === "classes" ? completed.map<RowItem>((cls, index) => ({ kind: "attClass", key: cls._id, cls, index })) : studentAttendance.map<RowItem>((row) => ({ kind: "attStudent", key: row.key, row }));
    if (attendance.pending) {
      emptyState = <SkeletonList count={4} lines={3} />;
    } else if (attendance.error) {
      emptyState = (
        <Card padding={0}>
          <ErrorState compact message={attendance.error} onRetry={attendance.retry} />
        </Card>
      );
    } else if (attTab === "classes") {
      emptyState = (
        <Card padding={0}>
          <EmptyState icon="clipboard" tone="neutral" title="No completed sessions yet" message="Attendance will appear here once classes are ended." />
        </Card>
      );
    } else {
      emptyState = (
        <Card padding={0}>
          <EmptyState icon="users" tone="neutral" title="No student attendance data yet" message="End a class session to record attendance." />
        </Card>
      );
    }
  }

  const showPagination = viewMode === "classes" && !todayOnly && listReady && totalPages > 1;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);

  const monthFilter = (
    <MonthFilter
      value={filterMonth}
      onChange={(month) => {
        setFilterMonth(month);
        resetPages();
      }}
    />
  );

  const header = (
    <View style={{ gap: 14 }}>
      <Row gap={10} justify="space-between" align="center">
        <T variant="small" color="muted" style={{ flex: 1 }}>
          Manage your daily classes, schedule sessions, and track attendance.
        </T>
        <Button title="Monthly Report" icon="bar-chart-2" variant="outline" size="sm" onPress={() => nav.go("TeacherMonthlyReport")} />
      </Row>

      <KpiStrip stats={kpiStats} loading={stats.loading} error={stats.error} onRetry={stats.retry} />

      <Segmented<ViewMode>
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "classes", label: "Classes", icon: "calendar" },
          { value: "students", label: "Students", icon: "users", count: students.length > 0 ? students.length : undefined },
          { value: "attendance", label: "Attendance", icon: "clipboard" },
        ]}
      />

      {viewMode === "classes" ? (
        <>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "scheduled", label: "Scheduled", count: scheduledCount > 0 ? scheduledCount : undefined },
              { value: "in-progress", label: "In Progress", count: inProgressCount > 0 ? inProgressCount : undefined },
              { value: "completed", label: "Completed", count: completedCount > 0 ? completedCount : undefined },
            ]}
          />

          {monthFilter}

          {tab === "scheduled" ? (
            <Row gap={8} wrap>
              {(["today", "all"] as const).map((filter) => (
                <Chip
                  key={filter}
                  label={filter === "today" ? `Today (${todayDayKey})` : `All Scheduled (${scheduledCount})`}
                  selected={scheduledFilter === filter}
                  onPress={() => {
                    setScheduledFilter(filter);
                    setPage("scheduled", 1);
                  }}
                />
              ))}
            </Row>
          ) : null}

          {todayOnly && todayItems.length > 0 ? (
            <TodayPanel
              items={todayItems}
              todayDayKey={todayDayKey}
              nowMinutes={nowMinutes}
              actingId={acting}
              onStart={(cls) => void handleAction(cls._id, "start")}
              onShowInProgress={() => setTab("in-progress")}
              onCreate={handleQuickCreate}
            />
          ) : null}

          {tab === "in-progress" && total > 0 ? <Banner tone="warning" icon="clock" message="Live class in progress! Tap End Class when the session is over." /> : null}
        </>
      ) : null}

      {viewMode === "students" ? <StudentsToolbar shown={filteredStudents.length} total={students.length} loading={studentsQ.loading} search={search} onSearchChange={setSearch} /> : null}

      {viewMode === "attendance" ? (
        <>
          {monthFilter}
          {attendanceReady ? <AttendanceSummary totalDone={completed.length} totalPresent={totalPresent} totalAbsent={totalAbsent} attendancePct={attendancePct} tab={attTab} onTabChange={setAttTab} /> : null}
        </>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(item) => `${item.kind}-${item.key}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 104 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        ListFooterComponent={
          showPagination ? (
            <View style={{ gap: 10, paddingTop: 4 }}>
              <T variant="small" color="muted" center>
                Showing <T variant="smallStrong">{from}</T> to <T variant="smallStrong">{to}</T> of <T variant="smallStrong">{total}</T> {tab} classes
              </T>
              <Pagination page={page} totalPages={totalPages} onChange={(next) => setPage(tab, next)} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case "class":
              return (
                <ClassCard
                  cls={item.cls}
                  busy={acting === item.cls._id}
                  onAction={(action) => void handleAction(item.cls._id, action)}
                  onEndRequest={() => {
                    setEndError("");
                    setEndTarget(item.cls);
                  }}
                  onDelete={() => void handleDelete(item.cls)}
                  onChangeType={() => setTypeTarget(item.cls)}
                  onEditLink={() => setLinkTarget(item.cls)}
                />
              );
            case "student":
              return <StudentRow student={item.student} index={item.index} />;
            case "attClass":
              return <AttendanceClassRow cls={item.cls} index={item.index} />;
            default:
              return <AttendanceStudentRow row={item.row} />;
          }
        }}
      />

      {/* New Class: always within reach, above the tab bar */}
      <Pressable
        onPress={openBlankForm}
        accessibilityRole="button"
        accessibilityLabel="New Class"
        style={({ pressed }) => ({
          position: "absolute",
          right: 16,
          bottom: 16,
          height: 52,
          paddingHorizontal: 18,
          borderRadius: 26,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: c.primary,
          opacity: pressed ? 0.88 : 1,
          elevation: 6,
          shadowColor: c.shadow,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        })}
      >
        <Icon name="plus" size={20} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>New Class</Text>
      </Pressable>

      <NewClassSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        students={students}
        courses={courses}
        studentHasSchedule={studentHasSchedule}
        onStudentChange={handleStudentChange}
        onSubmit={() => void handleCreate()}
        submitting={submitting}
        error={formError}
        todayDayKey={todayDayKey}
        nowMinutes={nowMinutes}
      />

      <EndClassSheet
        cls={endTarget}
        acting={!!acting}
        error={endError}
        onClose={() => setEndTarget(null)}
        onConfirm={(attendanceMark, topic) => {
          if (endTarget) void handleAction(endTarget._id, "end", attendanceMark, topic);
        }}
        onUpdateTopic={handleUpdateTopic}
      />

      <MeetLinkSheet cls={linkTarget} onClose={() => setLinkTarget(null)} onSave={handleUpdateMeetLink} />
      <ClassTypeSheet cls={typeTarget} onClose={() => setTypeTarget(null)} onPick={(cls, classType) => void handleUpdateClassType(cls, classType)} />
    </Screen>
  );
}
