import React from "react";
import { Pressable, Text, View } from "react-native";

import { classWindow, formatClassTime, type TodayClass } from "@/screens/teacher/dashboard/schedule-utils";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Button, Card, EmptyState, ErrorState, GradientCard, Icon, IconChip, Row, Skeleton, T } from "@/ui";

/* ───────────────────────── Next / ongoing session banner ───────────────────────── */

interface NextSessionBannerProps {
  classes: TodayClass[];
  /** Minutes from midnight on the academy's clock */
  currentMinutes: number;
  todayName: string;
  loading: boolean;
  onOpenClasses: () => void;
}

/** The class that is running now, else the next one today, else today's first: with a shortcut to My Classes */
export function NextSessionBanner({ classes, currentMinutes, todayName, loading, onOpenClasses }: NextSessionBannerProps) {
  const { c } = useTheme();

  const ongoing = classes.find((item) => {
    const { start, end } = classWindow(item);
    return currentMinutes >= start && currentMinutes < end;
  });
  const next = classes.find((item) => classWindow(item).start > currentMinutes);
  const featured = ongoing || next || classes[0];

  return (
    <GradientCard gradient="navy" padding={20} style={{ gap: 18 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ongoing ? c.danger : c.success }} />
          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>{ongoing ? "Live Right Now" : next ? "Live Soon" : "Today's Routine"}</Text>
        </View>

        {loading ? (
          <View style={{ gap: 10 }} accessibilityLabel="Loading schedule...">
            <Skeleton width="70%" height={22} style={{ opacity: 0.35 }} />
            <Skeleton width="50%" height={14} style={{ opacity: 0.35 }} />
          </View>
        ) : (
          <>
            <Text style={{ color: "#ffffff", fontSize: 20, lineHeight: 26, fontWeight: "800" }}>{featured ? featured.course?.title || "Assigned Class Session" : "No Classes Today"}</Text>
            {featured ? (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon name="clock" size={14} color={c.onDarkMuted} />
                  <Text style={{ color: c.onDarkMuted, fontSize: 14 }}>
                    {formatClassTime(featured.startTime)} – {formatClassTime(featured.endTime)}
                  </Text>
                </View>
                {featured.student ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Icon name="users" size={14} color={c.onDarkMuted} />
                    <Text numberOfLines={1} style={{ color: c.onDarkMuted, fontSize: 14, flex: 1 }}>
                      Student: {featured.student.fullName}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: c.onDarkMuted, fontSize: 14, lineHeight: 20 }}>You have no classes scheduled for today ({todayName}).</Text>
            )}
          </>
        )}
      </View>

      <Pressable onPress={onOpenClasses} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 12, backgroundColor: "#ffffff", opacity: pressed ? 0.88 : 1 })}>
        <Icon name="play-circle" size={17} color={c.navy} />
        <Text style={{ color: c.navy, fontSize: 14, fontWeight: "800" }}>Go to Classes</Text>
      </Pressable>
    </GradientCard>
  );
}

/* ───────────────────────── Today's class schedule ───────────────────────── */

interface TodayScheduleCardProps {
  classes: TodayClass[];
  currentMinutes: number;
  todayName: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenSchedule: () => void;
  onOpenClasses: () => void;
}

/** Every class scheduled for today, each marked Live Now, Upcoming or Completed from the academy's clock */
export function TodayScheduleCard({ classes, currentMinutes, todayName, loading, error, onRetry, onOpenSchedule, onOpenClasses }: TodayScheduleCardProps) {
  const { c } = useTheme();

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Row gap={10} align="flex-start">
          <IconChip icon="calendar" tone="primary" size={34} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Row gap={8} wrap>
              <T variant="title" accessibilityRole="header">
                Today&apos;s Class Schedule
              </T>
              <Badge label={todayName} tone="primary" />
            </Row>
            <T variant="small" color="muted">
              Your scheduled sessions for today ({classes.length} {classes.length === 1 ? "class" : "classes"})
            </T>
          </View>
        </Row>
        <Button title="View Full Routine" icon="clock" iconRight="chevron-right" variant="secondary" size="sm" onPress={onOpenSchedule} />
      </View>

      {loading ? (
        <View style={{ gap: 10 }} accessibilityLabel="Loading schedule...">
          <Skeleton height={86} rounded={12} />
          <Skeleton height={86} rounded={12} />
        </View>
      ) : error ? (
        <ErrorState compact title="Could not load today's schedule" message={error} onRetry={onRetry} />
      ) : classes.length === 0 ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong, backgroundColor: c.surfaceAlt }}>
          <EmptyState
            compact
            icon="coffee"
            tone="neutral"
            title="No Classes Scheduled Today"
            message={`You don't have any classes scheduled for ${todayName}. Enjoy your day or check your full weekly routine!`}
            actionLabel="Check Weekly Routine"
            onAction={onOpenSchedule}
          />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {classes.map((item, idx) => {
            const { start, end } = classWindow(item);
            const isOngoing = currentMinutes >= start && currentMinutes < end;
            const isCompleted = currentMinutes >= end;
            const isUpcoming = currentMinutes < start;

            return (
              <View
                key={item._id || idx}
                style={{ gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: isOngoing ? c.danger : c.border, backgroundColor: isOngoing ? c.dangerSoft : isCompleted ? c.surfaceAlt : c.surface, opacity: isCompleted ? 0.8 : 1 }}
              >
                <Row gap={12} align="flex-start">
                  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isOngoing ? c.danger : isCompleted ? c.borderStrong : c.primary }}>
                    <Icon name="video" size={19} color={isCompleted ? c.textMuted : "#ffffff"} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    <Row gap={6} wrap>
                      {isOngoing ? <Badge label="LIVE NOW" tone="danger" solid /> : null}
                      {isCompleted ? <Badge label="COMPLETED" tone="neutral" /> : null}
                      {isUpcoming ? <Badge label="UPCOMING" tone="primary" /> : null}
                      <Badge label={`${item.type || "Live"} Class`.toUpperCase()} tone="neutral" />
                    </Row>
                    <T variant="bodyStrong" weight="700" numberOfLines={2}>
                      {item.course?.title || "Assigned Class Session"}
                    </T>
                    {item.student ? (
                      <Row gap={6}>
                        <Icon name="user" size={13} color={c.textFaint} />
                        <T variant="small" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                          {item.student.fullName}
                        </T>
                      </Row>
                    ) : null}
                  </View>
                </Row>

                <Row justify="space-between" gap={10} style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
                  <Row gap={6} style={{ flexShrink: 1, paddingHorizontal: 10, minHeight: 34, borderRadius: 9, backgroundColor: isOngoing ? c.surface : c.surfaceAlt }}>
                    <Icon name="clock" size={13} color={c.primary} />
                    <T variant="smallStrong" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {formatClassTime(item.startTime)} - {formatClassTime(item.endTime)}
                    </T>
                  </Row>
                  <Button title={isOngoing ? "Join Now" : "Details"} iconRight="chevron-right" size="sm" variant={isOngoing ? "danger" : "secondary"} onPress={onOpenClasses} />
                </Row>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
