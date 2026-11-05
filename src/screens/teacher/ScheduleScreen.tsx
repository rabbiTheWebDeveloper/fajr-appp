import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MONTH_NAMES, academyClock, academyMinutesNow, titleCase } from "@/lib/format";
import { useAppForeground, useFetch, useNow } from "@/lib/hooks";
import { DAY_LABELS, SLOT_DAYS, type SlotDay } from "@/lib/teacher-slot-shared";
import { useNav } from "@/navigation/nav";
import AddTeachingSlotSheet from "@/screens/teacher/schedule/AddTeachingSlotSheet";
import { ActionButton } from "@/screens/teacher/schedule/parts";
import { DayTimeline, WeeklyRoutine } from "@/screens/teacher/schedule/ScheduleViews";
import { buildTimelineForDay, formatTime, parseTimeToMinutes, schedulesForDay, todaySlotDay, type ScheduleReply } from "@/screens/teacher/schedule/schedule-utils";
import TeachingSlotsHub, { type SlotsReply } from "@/screens/teacher/schedule/TeachingSlotsHub";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Card, Chip, ErrorState, GradientCard, Icon, Row, Screen, Skeleton, SkeletonList, SkeletonTiles, StatTile, T, TileGrid, toast, type ScrollViewRef } from "@/ui";

/** "today", the whole week, the teaching slots hub, or one weekday picked from the day row */
type ScheduleTab = "today" | "weekly" | "interested-slots" | SlotDay;

interface SlotSheetState {
  open: boolean;
  day: SlotDay;
  range?: { startMins: number; endMins: number };
}

const isSlotDay = (value: string): value is SlotDay => (SLOT_DAYS as readonly string[]).includes(value);

export default function TeacherScheduleScreen() {
  const { c } = useTheme();
  const nav = useNav();
  // Class status (live / completed) follows the clock; half a minute is fine-grained enough
  const now = useNow(30000);
  const [activeTab, setActiveTab] = useState<ScheduleTab>("today");
  const [slotSheet, setSlotSheet] = useState<SlotSheetState>({ open: false, day: "saturday" });

  // The hub button sits in the header, far above the hub itself: opening it scrolls down to the tabs
  const scrollRef = useRef<ScrollViewRef>(null);
  const tabsY = useRef(0);

  const hubOpen = activeTab === "interested-slots";
  const schedule = useFetch<ScheduleReply>("/api/teacher-portal/schedule");
  // The hub's data is only fetched once its tab is opened
  const slots = useFetch<SlotsReply>("/api/teacher-portal/slots/interested", undefined, { enabled: hubOpen });

  // A routine changed elsewhere (a student's schedule was edited) shows up on return to the app
  useAppForeground(() => {
    void schedule.reload();
  });

  const schedules = useMemo(() => (schedule.data?.success && Array.isArray(schedule.data.schedules) ? schedule.data.schedules : []), [schedule.data]);

  // "Today" and "now" are the academy's (Bangladesh time), whatever the phone's own time zone is
  const todayKey = todaySlotDay(now);
  const todayName = DAY_LABELS[todayKey];
  const currentMinutes = academyMinutesNow(now);
  const clock = academyClock(now);
  const todayDate = `${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()}`;

  const todayItems = useMemo(() => schedulesForDay(schedules, todayKey), [schedules, todayKey]);
  const todayFreeCount = useMemo(() => buildTimelineForDay(schedules, todayKey, todayKey, currentMinutes).filter((s) => s.isFree).length, [schedules, todayKey, currentMinutes]);

  // The class running right now, if any
  const currentOngoingSlot = useMemo(
    () =>
      todayItems.find((s) => {
        const start = parseTimeToMinutes(s.startTime);
        const end = parseTimeToMinutes(s.endTime) || start + 60;
        return currentMinutes >= start && currentMinutes < end;
      }),
    [todayItems, currentMinutes]
  );

  // The next class still to come today
  const nextUpcomingSlot = useMemo(
    () => todayItems.filter((s) => parseTimeToMinutes(s.startTime) > currentMinutes).sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))[0],
    [todayItems, currentMinutes]
  );

  const activeDayKey: SlotDay = isSlotDay(activeTab) ? activeTab : todayKey;
  const activeTimelineSlots = useMemo(() => buildTimelineForDay(schedules, activeDayKey, todayKey, currentMinutes), [schedules, activeDayKey, todayKey, currentMinutes]);

  /** Opens the add-slot form on the given day (the day on screen when none is given), optionally with a time already filled in. */
  const openSlotSheet = (day?: SlotDay, range?: { startMins: number; endMins: number }) => {
    setSlotSheet({ open: true, day: day ?? activeDayKey, range });
  };

  const openHub = () => {
    setActiveTab("interested-slots");
    scrollRef.current?.scrollTo({ y: Math.max(0, tabsY.current - 8), animated: true });
  };

  const onRefresh = async () => {
    await Promise.all([schedule.refresh(), hubOpen ? slots.refresh() : Promise.resolve()]);
  };

  const scheduleLoading = schedule.loading;
  const scheduleFailed = !schedule.data && !!schedule.error;

  return (
    <Screen onRefresh={onRefresh} refreshing={schedule.refreshing || slots.refreshing} scrollRef={scrollRef}>
      {/* ── Page header ── */}
      <GradientCard gradient="navy" style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Row gap={6} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.1)" }}>
            <Icon name="calendar" size={12} color={c.gold} />
            <T variant="caption" color="onDarkMuted" weight="700">
              Teacher Portal Routine
            </T>
          </Row>
          <T variant="h2" color="onDark">
            Class Schedule & Routine
          </T>
          <T variant="small" color="onDarkMuted">
            {todayName}, {todayDate}
          </T>
        </View>

        {/* Live status: in class, or free with the next class */}
        {scheduleLoading ? (
          <Skeleton height={64} rounded={14} style={{ opacity: 0.25 }} />
        ) : scheduleFailed ? null : currentOngoingSlot ? (
          <Row gap={12} align="flex-start" style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.danger, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 3, backgroundColor: c.danger }} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label" color="onDark">
                IN CLASS RIGHT NOW (ক্লাস চলছে)
              </T>
              <T variant="bodyStrong" color="onDark" numberOfLines={1}>
                {currentOngoingSlot.course?.title || "Live Session"}
              </T>
              <Row gap={5}>
                <Icon name="clock" size={12} color={c.onDarkMuted} />
                <T variant="small" color="onDarkMuted">
                  {formatTime(currentOngoingSlot.startTime)} - {formatTime(currentOngoingSlot.endTime)}
                </T>
              </Row>
            </View>
          </Row>
        ) : (
          <Row gap={12} align="flex-start" style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.success, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Icon name="coffee" size={18} color={c.onDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={6}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
                <T variant="label" color="onDark" style={{ flex: 1 }}>
                  FREE RIGHT NOW (এখন খালি আছেন)
                </T>
              </Row>
              {nextUpcomingSlot ? (
                <T variant="small" color="onDarkMuted">
                  Next Class:{" "}
                  <T variant="smallStrong" color="onDark">
                    {nextUpcomingSlot.course?.title || "Class"}
                  </T>{" "}
                  at {formatTime(nextUpcomingSlot.startTime)}
                </T>
              ) : (
                <T variant="small" color="onDarkMuted">
                  No more classes scheduled for today.
                </T>
              )}
            </View>
          </Row>
        )}

        <View style={{ gap: 8 }}>
          <ActionButton title="+ Add Teaching Slots (স্লট যুক্ত করুন)" icon="plus" tone="success" block onPress={() => openSlotSheet()} />
          <ActionButton title="Teaching Slots Hub (পড়াতে আগ্রহী স্লট)" icon="star" tone="warning" block onPress={openHub} />
          <ActionButton title="Manage Student Routines" icon="edit-2" look="glass" block onPress={() => nav.go("TeacherStudents")} />
        </View>
      </GradientCard>

      {/* ── Overview numbers ── */}
      {scheduleLoading ? (
        <SkeletonTiles count={4} />
      ) : scheduleFailed ? null : (
        <TileGrid>
          <StatTile label="Today's Classes" value={todayItems.length} icon="calendar" gradient="blue" />
          <StatTile label="Free Slots Today" value={todayFreeCount} icon="coffee" gradient="emerald" />
          <StatTile label="Weekly Total" value={schedules.length} icon="check-circle" gradient="sky" />
          <StatTile label="Current Status" value={currentOngoingSlot ? "In Class" : "Available"} mIcon="star-four-points" gradient={currentOngoingSlot ? "rose" : "violet"} />
        </TileGrid>
      )}

      {/* ── View tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        style={{ flexGrow: 0 }}
        onLayout={(e) => {
          tabsY.current = e.nativeEvent.layout.y;
        }}
      >
        <Chip label={`Today's Schedule (${todayName})`} icon="clock" selected={activeTab === "today"} onPress={() => setActiveTab("today")} style={{ height: 40 }} />
        <Chip label="Full Weekly Routine" icon="calendar" selected={activeTab === "weekly"} onPress={() => setActiveTab("weekly")} style={{ height: 40 }} />
        <Chip label="Teaching Slots Hub (পড়াতে আগ্রহী স্লট)" icon="star" selected={hubOpen} onPress={() => setActiveTab("interested-slots")} style={{ height: 40 }} />
      </ScrollView>

      {/* Day row: jumps to one weekday's detailed timeline (the hub has its own day row) */}
      {hubOpen ? null : <DayRow selected={isSlotDay(activeTab) ? activeTab : null} todayKey={todayKey} onSelect={setActiveTab} />}

      {/* ── Content ── */}
      {hubOpen ? (
        <TeachingSlotsHub slots={slots} initialDay={todayKey} onAdd={(day) => openSlotSheet(day)} onChanged={() => void schedule.reload()} />
      ) : scheduleLoading ? (
        <SkeletonList count={4} />
      ) : scheduleFailed ? (
        <Card padding={0}>
          <ErrorState title="Could not load your schedule" message={schedule.error} onRetry={schedule.retry} />
        </Card>
      ) : activeTab === "weekly" ? (
        <WeeklyRoutine schedules={schedules} todayKey={todayKey} onAddSlot={(day) => openSlotSheet(day)} />
      ) : (
        <DayTimeline
          slots={activeTimelineSlots}
          dayLabel={activeDayKey === todayKey ? `Today (${todayName})` : titleCase(activeDayKey)}
          onAddSlot={(range) => openSlotSheet(undefined, range)}
          onJoinLive={() => nav.go("TeacherClasses")}
        />
      )}

      <AddTeachingSlotSheet
        visible={slotSheet.open}
        onClose={() => setSlotSheet((prev) => ({ ...prev, open: false }))}
        initialDay={slotSheet.day}
        initialStartMins={slotSheet.range?.startMins}
        initialEndMins={slotSheet.range?.endMins}
        onSuccess={(message) => {
          toast.success(message);
          void schedule.reload();
          if (hubOpen) void slots.reload();
        }}
      />
    </Screen>
  );
}

/** Mon … Sun pills; today carries a dot and the brand colour */
function DayRow({ selected, todayKey, onSelect }: { selected: SlotDay | null; todayKey: SlotDay; onSelect: (day: SlotDay) => void }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
      {SLOT_DAYS.map((day) => {
        const isToday = day === todayKey;
        const isSelected = day === selected;
        const fg = isSelected ? (isDark ? c.gold : c.navy) : isToday ? c.primaryText : c.textMuted;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityLabel={isToday ? `${DAY_LABELS[day]}, today` : DAY_LABELS[day]}
            accessibilityState={{ selected: isSelected }}
            style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: radius.sm + 2, backgroundColor: isSelected ? (isDark ? c.navy : c.surface) : "transparent" }}
          >
            <Text style={{ color: fg, fontSize: 12.5, fontWeight: isSelected || isToday ? "800" : "600" }}>{DAY_LABELS[day].slice(0, 3)}</Text>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? fg : "transparent" }} />
          </Pressable>
        );
      })}
    </View>
  );
}
