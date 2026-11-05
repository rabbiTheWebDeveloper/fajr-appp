import React, { useCallback, useEffect, useMemo } from "react";
import * as Network from "expo-network";

import { useAppForeground, useFetch, useNow } from "@/lib/hooks";
import type { DashboardStats } from "@/lib/student-dashboard-shared";
import DailyDuaCard from "@/screens/student/dashboard/DailyDuaCard";
import DashboardHero from "@/screens/student/dashboard/DashboardHero";
import { DashboardError, DashboardSkeleton } from "@/screens/student/dashboard/DashboardStates";
import FeeCard, { feeNeedsAttention } from "@/screens/student/dashboard/FeeCard";
import KpiTiles from "@/screens/student/dashboard/KpiTiles";
import LiveClassCountdown from "@/screens/student/dashboard/LiveClassCountdown";
import { InspirationCard, PracticeBanner, ShortcutGrid } from "@/screens/student/dashboard/MoreSections";
import PrayerTimesCompact from "@/screens/student/dashboard/PrayerTimesCompact";
import RecentClasses from "@/screens/student/dashboard/RecentClasses";
import TodayClasses from "@/screens/student/dashboard/TodayClasses";
import WeekStrip from "@/screens/student/dashboard/WeekStrip";
import { useStudent } from "@/screens/student/StudentContext";
import { Banner, Screen } from "@/ui";

/** GET /api/student-portal/dashboard (a failure comes back as a 500 with `success: false` and a message) */
interface DashboardReply {
  success?: boolean;
  stats?: DashboardStats;
  message?: string;
}

/** How often the dashboard quietly refreshes itself while it is on screen (a class going live shows up without a reload) */
const REFRESH_MS = 60_000;
/** How often the page's clock moves: what each class of today is doing is worked out again on every tick */
const TICK_MS = 30_000;

export default function StudentDashboardScreen() {
  const { student, studentLoading, refreshStudent } = useStudent();
  const { data, loading, refreshing, error, refresh, reload, retry } = useFetch<DashboardReply>("/api/student-portal/dashboard", undefined, { pollMs: REFRESH_MS });
  const now = useNow(TICK_MS);

  // Like the website: refresh when the app comes back to the front and when the connection returns
  useAppForeground(() => void reload());
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshStudent()]);
  }, [refresh, refreshStudent]);

  const stats = data?.success && data.stats ? data.stats : null;

  // The countdown banner follows the classes still to come (or running) today, read in academy time
  const countdownClasses = useMemo(() => (stats?.todayClasses ?? []).filter((item) => item.state !== "done"), [stats]);

  const feeAlert = stats !== null && feeNeedsAttention(stats.fee);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {stats && countdownClasses.length > 0 ? <LiveClassCountdown classes={countdownClasses} studentName={student?.fullName} /> : null}

      <DashboardHero student={student} loading={studentLoading} now={now} streak={stats ? stats.streakCount : 0} />

      {loading && !stats ? <DashboardSkeleton /> : null}
      {!loading && !stats ? <DashboardError onRetry={retry} /> : null}

      {stats ? (
        <>
          {/* A pull-to-refresh that failed keeps the last numbers on screen and says so */}
          {error ? <Banner tone="warning" title="Could not refresh" message={`${error} Showing what was loaded last.`} /> : null}

          <KpiTiles stats={stats} />

          {feeAlert ? <FeeCard fee={stats.fee} /> : null}

          <TodayClasses classes={stats.todayClasses} nextClass={stats.nextClass} now={now} />
          <WeekStrip days={stats.week} />
          <RecentClasses classes={stats.recentClasses} />
          <PracticeBanner />

          {!feeAlert ? <FeeCard fee={stats.fee} /> : null}
          <PrayerTimesCompact />
          <DailyDuaCard dayIndex={stats.dayIndex} />
          <InspirationCard inspiration={stats.dailyInspiration} />

          <ShortcutGrid />
        </>
      ) : null}
    </Screen>
  );
}
