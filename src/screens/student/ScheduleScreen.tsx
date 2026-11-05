import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { errorMessage } from "@/api/client";
import { shareHtmlAsPdf } from "@/lib/files";
import { useFetch } from "@/lib/hooks";
import { academyClock } from "@/lib/student-dashboard-shared";
import { DAY_LABELS, type SlotDay } from "@/lib/teacher-slot-shared";
import { GradientButton, onGradient } from "@/screens/student/dashboard/parts";
import TimetableImageSheet from "@/screens/student/schedule/TimetableImageSheet";
import { DAYS, DAY_SHORT, buildTimetableHtml, hasClassOn, timeRangeText, timeText, timesOn, type ScheduleDoc, type ScheduleReply } from "@/screens/student/schedule/schedule-utils";
import { useTheme } from "@/theme/ThemeContext";
import { gradients } from "@/theme/palette";
import { Badge, Banner, Card, Divider, EmptyState, ErrorState, GradientCard, Icon, IconChip, Row, Screen, Skeleton, SkeletonCard, T, toast, type IconName } from "@/ui";

const HEADER_GRADIENT = [gradients.navyDeep[0], gradients.navy[1]] as const;

/** One fact about the class in the summary card: course, time or teacher */
function SummaryPill({ icon, text, strong }: { icon: IconName; text: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <Row gap={8} style={{ maxWidth: "100%", minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: `${c.primary}33` }}>
      <Icon name={icon} size={15} color={c.primary} />
      <T variant={strong ? "bodyStrong" : "smallStrong"} weight={strong ? "700" : "600"} style={{ flexShrink: 1 }}>
        {text}
      </T>
    </Row>
  );
}

/** A small labelled fact inside the day's class card (TIME, INSTRUCTOR) */
function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <Row gap={8} style={{ flex: 1, minWidth: 0 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
        <Icon name={icon} size={14} color={c.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="label" color="faint" style={{ fontSize: 9.5 }}>
          {label}
        </T>
        <T variant="smallStrong" weight="700" numberOfLines={2}>
          {value}
        </T>
      </View>
    </Row>
  );
}

/** The class on the chosen weekday, or a friendly "free day" */
function DayDetail({ schedule, day }: { schedule: ScheduleDoc; day: SlotDay }) {
  const { c } = useTheme();
  if (!hasClassOn(schedule, day)) {
    return (
      <Card padding={0}>
        <EmptyState compact icon="calendar" title="No Classes Scheduled" message={`Enjoy your free day! There is no class on ${DAY_LABELS[day]}.`} />
      </Card>
    );
  }
  return (
    <Card style={{ gap: 14 }}>
      <Row gap={12}>
        <IconChip icon="calendar" tone="primary" size={40} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong" weight="700">
            Class Schedule
          </T>
          <T variant="caption" color="faint">
            {DAY_LABELS[day]}
          </T>
        </View>
      </Row>

      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${c.primary}26`, backgroundColor: c.primarySoft, padding: 14, gap: 12 }}>
        <Row justify="space-between">
          <T variant="label" color="primary">
            Active Course
          </T>
          <Badge tone="success" label="Online" />
        </Row>
        <Divider />
        <T variant="title" weight="800" style={{ fontSize: 16, lineHeight: 22 }}>
          {schedule.course?.title || "Class"}
        </T>
        <Row gap={12} align="flex-start">
          <Fact icon="clock" label="Time" value={timeRangeText(timesOn(schedule, day))} />
          <Fact icon="user" label="Instructor" value={schedule.teacher?.fullName || "Teacher"} />
        </Row>
      </View>
    </Card>
  );
}

/** The whole week at a glance: the website's seven-column timetable, turned into seven rows for a phone */
function WeekList({ schedule }: { schedule: ScheduleDoc }) {
  const { c } = useTheme();
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <T variant="title">Weekly timetable</T>
        <T variant="small" color="muted">
          Every day of your week
        </T>
      </View>
      {DAYS.map((day) => {
        const hasClass = hasClassOn(schedule, day);
        return (
          <View key={day} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: hasClass ? c.primarySoft : "transparent" }}>
            <View style={{ width: 46, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: hasClass ? c.navy : c.surfaceAlt }}>
              <T variant="caption" color={hasClass ? c.gold : c.textFaint} weight="800" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {DAY_SHORT[day]}
              </T>
            </View>
            {hasClass ? (
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T variant="bodyStrong" weight="700" numberOfLines={2}>
                  {schedule.course?.title || "Class"}
                </T>
                <T variant="small" color="muted" numberOfLines={2}>
                  {timeText(timesOn(schedule, day).start)} · {schedule.teacher?.fullName || "Teacher"} · Online
                </T>
              </View>
            ) : (
              <T variant="small" color="faint" style={{ flex: 1 }}>
                Free
              </T>
            )}
          </View>
        );
      })}
    </Card>
  );
}

export default function StudentScheduleScreen() {
  const { c } = useTheme();
  const { data, loading, refreshing, error, refresh, retry } = useFetch<ScheduleReply>("/api/student-portal/schedule");
  // Opens on today's weekday, on the academy's calendar (Bangladesh)
  const [selectedDay, setSelectedDay] = useState<SlotDay>(() => academyClock().day);
  const [imageOpen, setImageOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const schedule = data?.success ? (data.schedule ?? null) : null;
  const failed = !loading && (!data || !data.success);

  const exportPdf = async () => {
    if (!schedule || exporting) return;
    setExporting(true);
    try {
      await shareHtmlAsPdf(buildTimetableHtml(schedule), "my-schedule", { landscape: true });
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the PDF. Please try again."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <GradientCard gradient={HEADER_GRADIENT} style={{ gap: 14 }}>
        <Row gap={12}>
          <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.line, borderWidth: 1, borderColor: onGradient.chip }}>
            <Icon name="calendar" size={22} color={c.gold} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="h2" color={onGradient.text}>
              My Schedule
            </T>
            <T variant="small" color="onDarkMuted">
              Weekly timetable of your classes
            </T>
          </View>
        </Row>
        {schedule ? (
          <Row gap={10} wrap>
            <GradientButton title="Save Image" icon="image" soft onPress={() => setImageOpen(true)} />
            <GradientButton title={exporting ? "Preparing…" : "Export PDF"} icon="download" background={c.gold} color={c.navy} disabled={exporting} onPress={() => void exportPdf()} />
          </Row>
        ) : null}
      </GradientCard>

      {loading ? (
        <View accessibilityLabel="Loading your schedule" style={{ gap: 16 }}>
          <SkeletonCard />
          <Skeleton height={40} rounded={12} />
          <Skeleton height={220} rounded={16} />
        </View>
      ) : failed ? (
        <Card padding={0}>
          <ErrorState title="We could not load your schedule" message={error || data?.message || "Please check your internet connection and try again."} onRetry={retry} />
        </Card>
      ) : !schedule ? (
        <Card padding={0}>
          <EmptyState icon="calendar" title="No Schedule Assigned" message="Contact your administrator to assign a class schedule." />
        </Card>
      ) : (
        <>
          {/* A pull-to-refresh that failed keeps the timetable on screen and says so */}
          {error ? <Banner tone="warning" title="Could not refresh" message={`${error} Showing what was loaded last.`} /> : null}

          <Card padding={14}>
            <Row gap={8} wrap>
              <SummaryPill icon="book-open" text={schedule.course?.title || "Assigned Class"} strong />
              <SummaryPill icon="clock" text={`${timeText(schedule.startTime)} – ${timeText(schedule.endTime)}`} />
              {schedule.teacher?.fullName ? <SummaryPill icon="user" text={schedule.teacher.fullName} /> : null}
            </Row>
          </Card>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 1 }} accessibilityRole="tablist">
            {DAYS.map((day) => {
              const active = selectedDay === day;
              const hasClass = hasClassOn(schedule, day);
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${DAY_LABELS[day]}${hasClass ? ", class day" : ", free day"}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 42, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.surface }}
                >
                  <T variant="smallStrong" color={active ? onGradient.text : c.textMuted} weight="700">
                    {DAY_SHORT[day]}
                  </T>
                  {hasClass ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? onGradient.text : c.primary }} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <DayDetail schedule={schedule} day={selectedDay} />
          <WeekList schedule={schedule} />

          <TimetableImageSheet visible={imageOpen} onClose={() => setImageOpen(false)} schedule={schedule} />
        </>
      )}
    </Screen>
  );
}
