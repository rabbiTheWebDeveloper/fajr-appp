import React, { useEffect, useMemo, useState } from "react";

import { openExternal } from "@/lib/device";
import { useAppForeground, useFetch } from "@/lib/hooks";
import { useRouteParams } from "@/navigation/nav";
import ActiveClasses, { type CourseCard } from "@/screens/student/classes/ActiveClasses";
import ClassHistory from "@/screens/student/classes/ClassHistory";
import type { HistorySession } from "@/screens/student/classes/class-history-utils";
import { dayName, timeRange, type ActiveSession, type ClassItem, type WeeklyClass } from "@/screens/student/classes/class-schedule-utils";
import { JoinSheet, LiveClassBanner, type Meeting } from "@/screens/student/classes/LiveClassroom";
import { ErrorState, Screen, Segmented, Skeleton, SkeletonList } from "@/ui";

type Tab = "active" | "history";

/** GET /api/student-portal/classes */
interface ClassesReply {
  success: boolean;
  message?: string;
  classes?: CourseCard[];
  history?: HistorySession[];
  activeSessions?: ActiveSession[];
  weeklySchedule?: WeeklyClass[];
  student?: { fullName?: string; studentId?: string } | null;
}

const isTab = (value: unknown): value is Tab => value === "active" || value === "history";

export default function StudentClassesScreen() {
  const params = useRouteParams<{ tab?: string }>();
  const { data, loading, refreshing, refresh, reload, retry } = useFetch<ClassesReply>("/api/student-portal/classes");

  const [activeTab, setActiveTab] = useState<Tab>(isTab(params.tab) ? params.tab : "active");
  // Set when a course card's "Class history" button opens the history tab already searching for that course
  const [historySearch, setHistorySearch] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  // The class the student has opened in the meeting app, and when
  const [joined, setJoined] = useState<{ meeting: Meeting; startedAt: number } | null>(null);

  // A shortcut or notification can open the screen on a tab: /student/classes?tab=history
  useEffect(() => {
    if (isTab(params.tab)) setActiveTab(params.tab);
  }, [params.tab]);

  // Back from the meeting app (or from anywhere): what is live may have changed
  useAppForeground(() => void reload());

  const classes = useMemo(() => data?.classes ?? [], [data]);
  const history = useMemo(() => data?.history ?? [], [data]);
  const activeSessions = useMemo(() => data?.activeSessions ?? [], [data]);
  const weekly = useMemo(() => data?.weeklySchedule ?? [], [data]);

  /** Opens the join screen for a class the student can enter */
  const joinClass = (item: ClassItem) => {
    setSelectedMeeting({
      id: item.session?._id ?? item.key,
      courseTitle: item.courseTitle,
      teacherName: item.teacherName,
      scheduleLabel: `${dayName(item.day)} · ${timeRange(item)}`,
      meetLink: item.meetLink,
    });
  };

  const viewCourseHistory = (courseTitle: string) => {
    setHistorySearch(courseTitle);
    setActiveTab("history");
  };

  /** Opens the class in the app that owns the link (Zoom, Google Meet, the browser) and starts the "in class" banner */
  const openClassroom = async (meeting: Meeting) => {
    if (!meeting.meetLink) return;
    const opened = await openExternal(meeting.meetLink);
    if (!opened) return;
    setJoined({ meeting, startedAt: Date.now() });
    setSelectedMeeting(null);
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={44} rounded={12} />
        <Skeleton height={170} rounded={16} />
        <SkeletonList count={3} lines={3} />
      </Screen>
    );
  }

  // A reply that says it failed is a failure too: its empty lists must not be shown as "no classes"
  if (!data || !data.success) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <ErrorState title="Could not load your classes" message="Please check your connection and try again." onRetry={retry} />
      </Screen>
    );
  }

  const top = (
    <>
      {joined ? <LiveClassBanner meeting={joined.meeting} startedAt={joined.startedAt} onReturn={() => void openExternal(joined.meeting.meetLink)} onEnd={() => setJoined(null)} /> : null}
      <Segmented<Tab>
        value={activeTab}
        onChange={(next) => {
          if (next === "history") setHistorySearch("");
          setActiveTab(next);
        }}
        options={[
          { value: "active", label: "Active Courses", count: classes.length },
          { value: "history", label: "Class History", count: history.length },
        ]}
      />
    </>
  );

  return (
    <>
      {activeTab === "active" ? (
        <Screen onRefresh={refresh} refreshing={refreshing}>
          {top}
          <ActiveClasses courses={classes} history={history} weekly={weekly} sessions={activeSessions} onJoin={joinClass} onViewHistory={viewCourseHistory} />
        </Screen>
      ) : (
        <Screen scroll={false} padded={false}>
          <ClassHistory history={history} student={data.student ?? null} initialSearch={historySearch} top={top} refreshing={refreshing} onRefresh={refresh} />
        </Screen>
      )}

      <JoinSheet meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onJoin={(meeting) => void openClassroom(meeting)} />
    </>
  );
}
