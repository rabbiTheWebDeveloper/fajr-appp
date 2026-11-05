import React, { useMemo, useState } from "react";
import { View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { useFetch, useNow } from "@/lib/hooks";
import { useNav } from "@/navigation/nav";
import { AnnouncementsCard, type Announcement } from "@/screens/teacher/dashboard/AnnouncementsCard";
import { GemsCard, type GemsReply } from "@/screens/teacher/dashboard/GemsCard";
import { KpiSection, type DashboardStats } from "@/screens/teacher/dashboard/KpiSection";
import { LiveClassCountdown } from "@/screens/teacher/dashboard/LiveClassCountdown";
import { ProfileCompletionCard } from "@/screens/teacher/dashboard/ProfileCompletionCard";
import { QuickLinks } from "@/screens/teacher/dashboard/QuickLinks";
import { academyToday, classWindow, todayClasses, type TeacherSchedule } from "@/screens/teacher/dashboard/schedule-utils";
import { TeacherOnboarding } from "@/screens/teacher/dashboard/TeacherOnboarding";
import { NextSessionBanner, TodayScheduleCard } from "@/screens/teacher/dashboard/TodaySchedule";
import { useOnboarding } from "@/screens/teacher/shell/onboarding";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { Screen, Segmented, T } from "@/ui";

type MonthFilter = "current" | "previous";

const MONTH_OPTIONS: { value: MonthFilter; label: string }[] = [
  { value: "current", label: "Current Month" },
  { value: "previous", label: "Previous Month" },
];

/** The teacher's home: the Get Started checklist, the live class alert, this month's numbers, gems, today's classes and profile completion */
export default function TeacherDashboardScreen() {
  const nav = useNav();
  const { profile, profileLoading, refreshProfile, refreshGems } = useTeacher();
  const onboarding = useOnboarding();

  const [monthFilter, setMonthFilter] = useState<MonthFilter>("current");
  // Which month the numbers on screen belong to, so one month's figures are never shown under the other's name
  const [statsMonth, setStatsMonth] = useState<MonthFilter | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Each block loads on its own and shows as soon as its data arrives
  const stats = useFetch<{ success?: boolean; stats?: DashboardStats }>("/api/teacher-portal/dashboard", { month: monthFilter }, { onData: () => setStatsMonth(monthFilter) });
  const schedule = useFetch<{ success?: boolean; schedules?: TeacherSchedule[] }>("/api/teacher-portal/schedule");
  const announcements = useFetch<{ success?: boolean; announcements?: Announcement[] }>("/api/teacher-portal/announcements");
  const gems = useFetch<GemsReply>("/api/teacher-portal/gems");

  // Re-read the clock twice a minute so Live Now / Upcoming / Completed stay true while the screen is open
  const now = useNow(30_000);
  const today = academyToday(now);

  const schedules = schedule.data?.success ? schedule.data.schedules : undefined;
  const classes = useMemo(() => todayClasses(schedules ?? [], today.key), [schedules, today.key]);

  const statsFresh = stats.data?.success && statsMonth === monthFilter ? (stats.data.stats ?? null) : null;
  const statsFailed = !!stats.error || (!!stats.data && !stats.data.success);

  // Today's totals: the server's count of today's sessions when it has one, otherwise the weekly schedule
  const todayTotal = (statsFresh?.todayTotalClassSchedule ?? 0) > 0 ? (statsFresh?.todayTotalClassSchedule ?? 0) : classes.length;
  const completedFromSchedule = classes.filter((item) => today.minutes >= classWindow(item).end).length;
  const todayDone = (statsFresh?.todayClassDone ?? 0) > 0 ? (statsFresh?.todayClassDone ?? 0) : completedFromSchedule;

  const refresh = async () => {
    setRefreshing(true);
    onboarding.reload();
    await Promise.all([stats.reload(), schedule.reload(), announcements.reload(), gems.reload(), refreshProfile(), refreshGems()]);
    setRefreshing(false);
  };

  const welcome = (
    <View>
      <T variant="h1" accessibilityRole="header">
        Welcome back, Instructor! 👋
      </T>
      <T variant="small" color="muted" style={{ marginTop: 2 }}>
        {today.dateLine}
      </T>
    </View>
  );

  // Until the steps that block the dashboard are done, show only the checklist. The data above keeps
  // loading underneath, so everything is ready the moment the dashboard unlocks.
  if (onboarding.gate !== "open") {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {welcome}
        <TeacherOnboarding onboarding={onboarding} />
      </Screen>
    );
  }

  const scheduleLoading = schedule.loading && !schedules;
  const openClasses = () => nav.go("TeacherClasses");
  const openSchedule = () => nav.go("TeacherSchedule");

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {welcome}

      {/* First-week checklist for new teachers; becomes the "all set" panel when finished */}
      <TeacherOnboarding onboarding={onboarding} />

      <LiveClassCountdown schedules={classes} onOpenClasses={openClasses} />

      <View style={{ gap: 8 }}>
        <T variant="smallStrong" color="muted">
          Stats for:
        </T>
        <Segmented
          value={monthFilter}
          options={MONTH_OPTIONS}
          onChange={(next) => {
            tapFeedback();
            setMonthFilter(next);
          }}
        />
      </View>

      <KpiSection stats={statsFresh} loading={stats.loading || (!statsFresh && !statsFailed)} error={stats.error} onRetry={stats.retry} todayDone={todayDone} todayTotal={todayTotal} />

      <GemsCard gems={gems.data?.success ? gems.data : null} loading={gems.loading} error={gems.error} onRetry={gems.retry} onLeaderboard={() => nav.go("TeacherLeaderboard")} />

      {/* Without the schedule there is no telling whether today has a class, so the banner waits for it */}
      {schedules || scheduleLoading ? <NextSessionBanner classes={classes} currentMinutes={today.minutes} todayName={today.name} loading={scheduleLoading} onOpenClasses={openClasses} /> : null}

      <TodayScheduleCard
        classes={classes}
        currentMinutes={today.minutes}
        todayName={today.name}
        loading={scheduleLoading}
        error={schedules ? "" : schedule.error}
        onRetry={schedule.retry}
        onOpenSchedule={openSchedule}
        onOpenClasses={openClasses}
      />

      <ProfileCompletionCard profile={profile} loading={profileLoading} onRetry={() => void refreshProfile()} />

      <AnnouncementsCard
        announcements={announcements.data?.success ? (announcements.data.announcements ?? []) : null}
        loading={announcements.loading}
        error={announcements.error}
        onRetry={announcements.retry}
        onOpenNoticeBoard={() => nav.go("TeacherAnnouncements")}
      />

      <QuickLinks />
    </Screen>
  );
}
