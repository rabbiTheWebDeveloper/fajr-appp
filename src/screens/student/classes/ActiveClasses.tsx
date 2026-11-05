import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAppForeground } from "@/lib/hooks";
import { minsToDisplay } from "@/lib/teacher-slot-shared";
import { conductedAt, formatMonthDay, monthKey, summariseSessions, type HistorySession } from "@/screens/student/classes/class-history-utils";
import {
  buildClassPlan,
  countdownText,
  courseFacts,
  dayHeading,
  dayName,
  timeRange,
  type ActiveSession,
  type ClassItem,
  type WeeklyClass,
} from "@/screens/student/classes/class-schedule-utils";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type GradientName } from "@/theme/palette";
import { Badge, Button, Card, Divider, EmptyState, GradientCard, Icon, Row, SectionHeader, T, TileGrid } from "@/ui";

export interface CourseCard {
  _id?: string;
  title: string;
  category?: string;
  level?: string;
  /** A teacher record when the server filled it in; otherwise only an id, which has no name to show */
  instructor?: { fullName?: string } | string | null;
  progress?: number;
  enrollmentStatus?: string;
}

interface ActiveClassesProps {
  courses: CourseCard[];
  history: HistorySession[];
  weekly: WeeklyClass[];
  sessions: ActiveSession[];
  /** Opens the join screen for a class that has a meeting link */
  onJoin: (item: ClassItem) => void;
  /** Opens the history tab on this course */
  onViewHistory: (courseTitle: string) => void;
}

const TICK_MS = 30_000;

const instructorName = (course: CourseCard) => (course.instructor && typeof course.instructor === "object" ? course.instructor.fullName : undefined);

/** "pre-intermediate" -> "Pre-Intermediate" */
const capitaliseWords = (text: string) => text.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

function JoinButton({ item, onJoin, size = "md" }: { item: ClassItem; onJoin: (item: ClassItem) => void; size?: "md" | "lg" }) {
  return <Button title="Join class" icon="video" variant="gold" size={size} block onPress={() => onJoin(item)} />;
}

function QuickTile({ label, value, gradient }: { label: string; value: string; gradient: GradientName }) {
  return (
    <GradientCard gradient={gradient} padding={10} style={{ flex: 1, minHeight: 80, justifyContent: "space-between", gap: 6 }}>
      <T variant="caption" color="onDarkMuted" weight="600">
        {label}
      </T>
      <T variant="h2" color="onDark" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
    </GradientCard>
  );
}

export default function ActiveClasses({ courses, history, weekly, sessions, onJoin, onViewHistory }: ActiveClassesProps) {
  const { c, isDark } = useTheme();

  // The clock moves on by itself so "Starts in 25 min" and "Live now" stay true while the screen is open
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  // Timers do not run while the app is in the background: catch up the moment it returns
  useAppForeground(() => setNow(new Date()));

  const plan = useMemo(() => buildClassPlan({ weekly, sessions, now }), [weekly, sessions, now]);
  // Live and paused classes, the rest in time order, and the rest grouped under "Today", "Tomorrow", ...
  const { live, upcoming, groups } = useMemo(() => {
    const upcomingItems = plan.filter((p) => p.state === "scheduled");
    const grouped: { heading: string; items: ClassItem[] }[] = [];
    for (const item of upcomingItems) {
      const heading = dayHeading(item.startsAt, now);
      const last = grouped[grouped.length - 1];
      if (last && last.heading === heading) last.items.push(item);
      else grouped.push({ heading, items: [item] });
    }
    return { live: plan.filter((p) => p.state !== "scheduled"), upcoming: upcomingItems, groups: grouped };
  }, [plan, now]);
  const next = upcoming[0] ?? null;

  const thisMonth = useMemo(() => {
    const key = monthKey(now);
    return summariseSessions(
      history.filter((h) => {
        const d = conductedAt(h);
        return d !== null && monthKey(d) === key;
      })
    );
  }, [history, now]);
  const attendancePct = thisMonth.classes > 0 ? Math.round((thisMonth.present / thisMonth.classes) * 100) : null;

  const nextCountdown = next ? countdownText(next.startsAt, next.endsAt, now) : null;

  return (
    <>
      {/* ── What to do right now ── */}
      {live.length > 0 ? (
        <View accessibilityLabel="Live class" style={{ gap: 12 }}>
          {live.map((item) => {
            const paused = item.state === "paused";
            const tone = toneColors(c, paused ? "warning" : "success");
            return (
              <Card key={item.key} tone={paused ? "warning" : "success"} style={{ gap: 14 }}>
                <Row gap={12}>
                  <View style={{ width: 52, height: 52, borderRadius: radius.lg, backgroundColor: tone.solid, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={paused ? "pause-circle" : "radio"} size={26} color={c.onDark} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row gap={6}>
                      {!paused ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone.solid }} /> : null}
                      <T variant="label" color={tone.fg} style={{ flex: 1 }}>
                        {paused ? "On a short break" : "Your class is live now"}
                      </T>
                    </Row>
                    <T variant="h2">{item.courseTitle}</T>
                    {item.teacherName ? (
                      <T variant="small" color="muted">
                        with {item.teacherName}
                      </T>
                    ) : null}
                  </View>
                </Row>
                {item.meetLink ? (
                  <JoinButton item={item} onJoin={onJoin} size="lg" />
                ) : (
                  <T variant="smallStrong" color="muted">
                    {paused ? "Your teacher will resume soon." : "Your teacher has not shared the class link yet."}
                  </T>
                )}
              </Card>
            );
          })}
        </View>
      ) : next && nextCountdown ? (
        <GradientCard gradient="navyDeep" padding={18} style={{ gap: 14 }}>
          <View accessibilityLabel="Next class" style={{ gap: 4 }}>
            <T variant="label" color="gold">
              Your next class
            </T>
            <T variant="h1" color="onDark">
              {next.courseTitle}
            </T>
            {next.teacherName ? (
              <Row gap={6}>
                <Icon name="user" size={13} color={c.onDarkMuted} />
                <T variant="small" color="onDarkMuted" style={{ flex: 1 }}>
                  with {next.teacherName}
                </T>
              </Row>
            ) : null}
          </View>
          <Row gap={8} wrap>
            <Row gap={6} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Icon name="calendar" size={13} color={c.gold} />
              <T variant="smallStrong" color="onDark">
                {dayHeading(next.startsAt, now)} · {timeRange(next)}
              </T>
            </Row>
            <Row gap={6} style={{ backgroundColor: nextCountdown.tone === "later" ? "rgba(255,255,255,0.1)" : c.success, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Icon name="clock" size={13} color={c.onDark} />
              <T variant="smallStrong" color="onDark" weight="800">
                {nextCountdown.text}
              </T>
            </Row>
          </Row>
          {next.startsOn ? (
            <T variant="caption" color="onDarkMuted">
              This class begins on {formatMonthDay(next.startsOn, true)}.
            </T>
          ) : null}
          {next.meetLink ? (
            <JoinButton item={next} onJoin={onJoin} size="lg" />
          ) : (
            <View style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 }}>
              <T variant="small" color="onDarkMuted" style={{ lineHeight: 18 }}>
                The{" "}
                <T variant="smallStrong" color="onDark">
                  Join class
                </T>{" "}
                button appears here when your teacher shares the class link.
              </T>
            </View>
          )}
        </GradientCard>
      ) : (
        <Card padding={0}>
          <EmptyState
            icon="calendar"
            title="No classes scheduled yet"
            message="Your weekly class times will appear here as soon as your teacher sets them. If you expected classes, please contact the academy."
          />
        </Card>
      )}

      {/* ── Quick numbers ── */}
      <TileGrid columns={3} gap={10}>
        <QuickTile label="Classes each week" value={String(weekly.length)} gradient="blue" />
        <QuickTile label="Done this month" value={String(thisMonth.classes)} gradient="emerald" />
        <QuickTile label="Attendance this month" value={attendancePct === null ? "—" : `${attendancePct}%`} gradient="violet" />
      </TileGrid>

      {/* ── This week ── */}
      {groups.length > 0 ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title="Coming up this week" icon="calendar" />
          <Card padding={0} style={{ overflow: "hidden" }}>
            {groups.map((group) => {
              const today = group.heading === "Today";
              return (
                <View key={group.heading}>
                  <View style={{ backgroundColor: today ? c.primarySoft : c.surfaceAlt, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <T variant="label" color={today ? "primary" : "muted"}>
                      {group.heading}
                    </T>
                  </View>
                  {group.items.map((item, index) => {
                    const countdown = countdownText(item.startsAt, item.endsAt, now);
                    return (
                      <View key={item.key}>
                        {index > 0 ? <Divider /> : null}
                        <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                          <Row gap={12} align="flex-start">
                            <View style={{ width: 76 }}>
                              <T variant="bodyStrong" weight="800">
                                {minsToDisplay(item.startMins)}
                              </T>
                              <T variant="caption" color="faint">
                                until {minsToDisplay(item.endMins)}
                              </T>
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                              <T variant="bodyStrong">{item.courseTitle}</T>
                              {item === next ? <Badge label="Next up" tone="warning" /> : null}
                              <T variant="small" color="muted">
                                {item.teacherName ? `with ${item.teacherName}` : dayName(item.day)}
                                {item.startsOn ? ` · begins ${formatMonthDay(item.startsOn)}` : ""}
                              </T>
                              <T variant="caption" weight="700" color={countdown.tone === "later" ? "faint" : "success"}>
                                {countdown.text}
                              </T>
                            </View>
                          </Row>
                          {item.meetLink ? <JoinButton item={item} onJoin={onJoin} /> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {/* ── My courses ── */}
      <View style={{ gap: 10 }}>
        <SectionHeader title="My courses" icon="book-open" />
        {courses.length === 0 ? (
          <Card padding={0}>
            <EmptyState icon="book-open" title="No courses yet" message="You are not enrolled in any course." />
          </Card>
        ) : (
          courses.map((course, idx) => {
            const facts = courseFacts({ _id: course._id, title: course.title }, plan, weekly, history);
            const progress = Math.min(100, Math.max(0, course.progress || 0));
            const joinItem = facts.live?.meetLink ? facts.live : facts.next?.meetLink ? facts.next : null;
            const isActive = !course.enrollmentStatus || course.enrollmentStatus === "active";
            return (
              <Card key={course._id || course.title || String(idx)} padding={0} style={{ overflow: "hidden" }}>
                <LinearGradient colors={[c.navy, c.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5 }} />
                <View style={{ padding: 16, gap: 14 }}>
                  <Row gap={6} wrap>
                    <Badge label={(course.category || "Course").toUpperCase()} tone="primary" />
                    {course.level ? <Badge label={capitaliseWords(course.level)} tone="neutral" /> : null}
                    {!isActive && course.enrollmentStatus ? <Badge label={course.enrollmentStatus.toUpperCase()} tone="neutral" /> : null}
                    {facts.live ? <Badge label="LIVE NOW" tone="success" icon="radio" /> : null}
                  </Row>

                  <View style={{ gap: 4 }}>
                    <T variant="title">{course.title}</T>
                    <Row gap={6}>
                      <Icon name="user" size={13} color={c.textFaint} />
                      <T variant="small" color="muted" style={{ flex: 1 }}>
                        {instructorName(course) || "Teacher to be announced"}
                      </T>
                    </Row>
                  </View>

                  <View style={{ gap: 6 }}>
                    <T variant="label" color="faint">
                      Weekly classes
                    </T>
                    {facts.times.length > 0 ? (
                      <Row gap={6} wrap>
                        {facts.times.map((time) => (
                          <View key={time} style={{ backgroundColor: c.primarySoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <T variant="caption" color="primary" weight="700">
                              {time}
                            </T>
                          </View>
                        ))}
                      </Row>
                    ) : (
                      <T variant="small" color="faint" style={{ fontStyle: "italic" }}>
                        No fixed weekly time yet
                      </T>
                    )}
                    {facts.next ? (
                      <Row gap={6}>
                        <Icon name="clock" size={13} color={c.primary} />
                        <T variant="smallStrong" color="muted" style={{ flex: 1 }}>
                          Next: {dayHeading(facts.next.startsAt, now)} at {minsToDisplay(facts.next.startMins)}
                        </T>
                      </Row>
                    ) : null}
                  </View>

                  <View style={{ gap: 6 }}>
                    <Row justify="space-between">
                      <T variant="small" color="muted">
                        Course progress
                      </T>
                      <T variant="smallStrong" color="primary">
                        {progress}%
                      </T>
                    </Row>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel={`${course.title} progress`}
                      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
                      style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: "hidden" }}
                    >
                      {/* Navy disappears on the dark surface, so the dark theme starts the bar from blue */}
                      <LinearGradient colors={[isDark ? c.primary : c.navy, c.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${progress}%`, height: "100%", borderRadius: 4 }} />
                    </View>
                    <T variant="caption" color="faint">
                      {facts.completed === 0
                        ? "No classes completed yet"
                        : `${facts.completed} class${facts.completed === 1 ? "" : "es"} completed${facts.lastClass ? ` · last on ${formatMonthDay(facts.lastClass)}` : ""}`}
                    </T>
                  </View>
                </View>

                {joinItem || facts.completed > 0 ? (
                  <>
                    <Divider />
                    <Row gap={8} wrap style={{ padding: 14 }}>
                      {joinItem ? (
                        <Button
                          title={joinItem.state === "scheduled" ? "Join class" : "Join live class"}
                          icon="play-circle"
                          variant={isDark ? "primary" : "navy"}
                          style={{ flexGrow: 1 }}
                          onPress={() => onJoin(joinItem)}
                        />
                      ) : null}
                      {facts.completed > 0 ? <Button title="Class history" icon="rotate-ccw" variant="secondary" style={{ flexGrow: 1 }} onPress={() => onViewHistory(course.title)} /> : null}
                    </Row>
                  </>
                ) : null}
              </Card>
            );
          })
        )}
      </View>
    </>
  );
}
