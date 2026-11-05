import React, { useState } from "react";
import { Text, View } from "react-native";

import { useNav } from "@/navigation/nav";
import type { RouteName } from "@/navigation/routes";
import { useTheme } from "@/theme/ThemeContext";
import type { GradientName } from "@/theme/palette";
import { Button, Card, ErrorState, GradientCard, Icon, IconChip, Row, SectionHeader, Sheet, SkeletonTiles, T, TileGrid, type IconName } from "@/ui";

/** The numbers GET /api/teacher-portal/dashboard?month=current|previous returns in `stats` */
export interface DashboardStats {
  totalClassCount?: number;
  scheduleMonthlyTotal?: number;
  totalStudents?: number;
  statusScheduled?: number;
  statusInProgress?: number;
  statusCompleted?: number;
  statusCancelled?: number;
  studentPresent?: number;
  studentAbsent?: number;
  currentMonthPresent?: number;
  currentMonthAbsent?: number;
  todayTotalClassSchedule?: number;
  todayInProgress?: number;
  todayClassDone?: number;
}

interface KpiCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: IconName;
  gradient: GradientName;
  route: RouteName;
  /** How the number is worked out (the website shows this on hover) */
  info: string;
  trendUp?: boolean;
  /** 0-100: draws a progress bar inside the tile */
  progressPct?: number;
}

function KpiTile({ card, onPress }: { card: KpiCard; onPress: () => void }) {
  return (
    <GradientCard gradient={card.gradient} padding={14} onPress={onPress} style={{ minHeight: 112, justifyContent: "space-between", gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <Text numberOfLines={2} style={{ flex: 1, color: "rgba(255,255,255,0.88)", fontSize: 11.5, fontWeight: "700" }}>
          {card.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {card.trendUp ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
              <Icon name="trending-up" size={10} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "800" }}>UP</Text>
            </View>
          ) : null}
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Icon name={card.icon} size={15} color="#ffffff" />
          </View>
        </View>
      </View>

      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 23, fontWeight: "800", letterSpacing: -0.3 }}>
          {card.value}
        </Text>
        <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "500" }}>
          {card.subtitle}
        </Text>
      </View>

      {typeof card.progressPct === "number" ? (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10.5, fontWeight: "600" }}>Progress</Text>
            <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "800" }}>{card.progressPct}%</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: card.progressPct }} style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
            <View style={{ width: `${card.progressPct}%`, height: "100%", borderRadius: 3, backgroundColor: "#ffffff" }} />
          </View>
        </View>
      ) : null}
    </GradientCard>
  );
}

interface KpiSectionProps {
  stats: DashboardStats | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** Today's classes done and expected, already reconciled with the weekly schedule */
  todayDone: number;
  todayTotal: number;
}

/** The seven number tiles of the dashboard. Each opens the page it summarises; "Calculation Logic" explains each number. */
export function KpiSection({ stats, loading, error, onRetry, todayDone, todayTotal }: KpiSectionProps) {
  const { c } = useTheme();
  const nav = useNav();
  const [infoOpen, setInfoOpen] = useState(false);

  if (loading) return <SkeletonTiles count={6} />;

  if (!stats) {
    return (
      <Card padding={0}>
        <ErrorState compact title="Could not load your numbers" message={error || "Please try again."} onRetry={onRetry} />
      </Card>
    );
  }

  const progressPct = todayTotal > 0 ? Math.min(100, Math.round((todayDone / todayTotal) * 100)) : 0;
  const monthlyTotal = stats.scheduleMonthlyTotal ?? 0;
  const monthlyDone = stats.statusCompleted ?? 0;

  const cards: KpiCard[] = [
    {
      title: "Total Students",
      value: stats.totalStudents ?? 0,
      subtitle: "Assigned students",
      icon: "users",
      gradient: "emerald",
      route: "TeacherStudents",
      info: "Calculated from distinct students enrolled in your assigned courses or schedule rosters.",
    },
    {
      title: "Monthly Total Classes",
      value: monthlyTotal,
      subtitle: "This month total",
      icon: "book-open",
      gradient: "blue",
      route: "TeacherClasses",
      info: "Theoretical total class sessions expected based on students' active schedules in the selected month.",
    },
    {
      title: "Monthly Class Done",
      value: monthlyDone,
      subtitle: "Done this month",
      icon: "check-circle",
      gradient: "emerald",
      route: "TeacherClasses",
      info: "Total class sessions successfully completed in the selected month.",
    },
    {
      title: "Monthly Remaining",
      value: Math.max(0, monthlyTotal - monthlyDone),
      subtitle: "Left this month",
      icon: "clock",
      gradient: "amber",
      route: "TeacherClasses",
      info: "Expected remaining class sessions for the selected month (Expected Total - Completed).",
    },
    {
      title: "Scheduled",
      value: stats.statusScheduled ?? 0,
      subtitle: "Waiting to start",
      icon: "calendar",
      gradient: "sky",
      route: "TeacherClasses",
      info: "Total count of upcoming class sessions with status set to 'scheduled'.",
    },
    {
      title: "In Progress",
      value: stats.statusInProgress ?? 0,
      subtitle: "Currently running",
      icon: "clock",
      gradient: "amber",
      route: "TeacherClasses",
      trendUp: true,
      info: "Number of live class sessions that are currently running/active right now.",
    },
    {
      title: "Today Progress",
      value: `${todayDone}/${todayTotal}`,
      subtitle: "Done today",
      icon: "zap",
      gradient: "violet",
      route: "TeacherSchedule",
      progressPct,
      info: `Formula: (${todayDone} completed / ${todayTotal} total scheduled today) × 100% = ${progressPct}%.`,
    },
  ];

  const pairs = cards.slice(0, 6);
  const todayCard = cards[6];

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title="Overview" action={<Button title="Calculation Logic" icon="info" variant="ghost" size="sm" onPress={() => setInfoOpen(true)} />} />

      <TileGrid>
        {pairs.map((card) => (
          <KpiTile key={card.title} card={card} onPress={() => nav.go(card.route)} />
        ))}
      </TileGrid>
      <KpiTile card={todayCard} onPress={() => nav.go(todayCard.route)} />

      <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title="Calculation Logic" subtitle="How each number on your dashboard is worked out">
        {cards.map((card) => (
          <Row key={card.title} gap={12} align="flex-start">
            <IconChip icon={card.icon} tone="primary" size={34} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">
                {card.title}
                <T variant="bodyStrong" color="muted">{`  ·  ${card.value}`}</T>
              </T>
              <T variant="small" color="muted" style={{ lineHeight: 18 }}>
                {card.info}
              </T>
            </View>
          </Row>
        ))}
        <Row gap={6}>
          <Icon name="info" size={13} color={c.textFaint} />
          <T variant="caption" color="faint" style={{ flex: 1 }}>
            Tap a tile on the dashboard to open the page behind the number.
          </T>
        </Row>
      </Sheet>
    </View>
  );
}
