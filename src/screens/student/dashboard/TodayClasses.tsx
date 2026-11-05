import React from "react";
import { View } from "react-native";

import { openExternal } from "@/lib/device";
import { ACADEMY_UTC_OFFSET_MINS, academyClock, classPhase, humanizeMins, type ClassPhase, type NextClass, type TodayClass } from "@/lib/student-dashboard-shared";
import { DAY_LABELS, minsToDisplay } from "@/lib/teacher-slot-shared";
import { useNav } from "@/navigation/nav";
import { CardHeader, PulseDot, onGradient } from "@/screens/student/dashboard/parts";
import { classWord } from "@/screens/student/dashboard/utils";
import { useTheme } from "@/theme/ThemeContext";
import { toneColors, type Palette, type Tone } from "@/theme/palette";
import { Badge, Button, Card, EmptyState, Icon, T, type IconName } from "@/ui";

interface TodayClassesProps {
  classes: TodayClass[];
  nextClass: NextClass | null;
  now: Date;
}

/** How close to the start a class gets a "Join" button, when the teacher has shared a link */
const JOIN_WINDOW_MINS = 15;

interface Look {
  tone: Tone;
  /** A filled chip with white text (something is happening or about to); otherwise a soft tinted one */
  solid: boolean;
  /** The colour of the stripe on the left edge of the row */
  bar: string;
  label: string;
  icon?: IconName;
}

function lookFor(phase: ClassPhase, item: TodayClass, minsToStart: number, isNext: boolean, c: Palette): Look {
  switch (phase) {
    case "live":
      return { tone: "danger", solid: true, bar: c.danger, label: "LIVE NOW" };
    case "paused":
      return { tone: "warning", solid: true, bar: c.warning, label: "Paused" };
    case "starting":
      return { tone: "violet", solid: true, bar: c.violet, label: "Class time" };
    case "upcoming":
      return isNext ? { tone: "primary", solid: true, bar: c.primary, label: `Up next · in ${humanizeMins(minsToStart)}` } : { tone: "neutral", solid: false, bar: c.borderStrong, label: "Later today" };
    case "done":
      return item.attendance === "present"
        ? { tone: "success", solid: false, bar: c.success, label: "Present", icon: "check-circle" }
        : item.attendance === "absent"
          ? { tone: "danger", solid: false, bar: c.danger, label: "Absent", icon: "x-circle" }
          : { tone: "info", solid: false, bar: c.info, label: "Completed", icon: "check-circle" };
    default:
      return { tone: "neutral", solid: false, bar: c.borderStrong, label: "Not held" };
  }
}

function StatusChip({ look, live }: { look: Look; live: boolean }) {
  const { c } = useTheme();
  const tone = toneColors(c, look.tone);
  const fg = look.solid ? onGradient.text : tone.fg;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: look.solid ? tone.solid : tone.bg }}>
      {live ? <PulseDot color={fg} size={6} /> : <Icon name={look.icon ?? "clock"} size={11} color={fg} />}
      <T variant="caption" color={fg} weight="700" numberOfLines={1}>
        {look.label}
      </T>
    </View>
  );
}

/** Every class of today, in order, with what each one is doing right now. Times are academy (Bangladesh) time. */
export default function TodayClasses({ classes, nextClass, now }: TodayClassesProps) {
  const { c } = useTheme();
  const nav = useNav();
  const nowMins = academyClock(now).minutes;
  const rows = classes.map((item) => ({ item, phase: classPhase(item, nowMins) }));
  const focusKey = rows.find((r) => r.phase === "live" || r.phase === "paused" || r.phase === "starting" || r.phase === "upcoming")?.item.key;
  const allDone = rows.length > 0 && rows.every((r) => r.phase === "done" || r.phase === "ended");
  // A phone set to another time zone: say which clock the class times are on
  const farFromAcademyClock = -now.getTimezoneOffset() !== ACADEMY_UTC_OFFSET_MINS;

  return (
    <Card padding={14} style={{ gap: 14 }}>
      <CardHeader
        mIcon="calendar-check"
        gradient="blue"
        title="Today's classes"
        subtitle={rows.length > 0 ? `${rows.length} ${classWord(rows.length)} today` : "Nothing on your routine today"}
        linkLabel="Full schedule"
        onLink={() => nav.go("StudentSchedule")}
      />

      {rows.length === 0 ? (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
          {nextClass ? (
            <EmptyState
              compact
              tone="neutral"
              mIcon="calendar-remove"
              title="No class today"
              message={`Next class: ${nextClass.daysAhead === 1 ? "Tomorrow" : DAY_LABELS[nextClass.day]} at ${minsToDisplay(nextClass.startMins)} · ${nextClass.courseTitle}${nextClass.teacherName ? ` with ${nextClass.teacherName}` : ""}`}
            />
          ) : (
            <EmptyState compact tone="neutral" mIcon="calendar-remove" title="No classes scheduled yet" message="Your teacher or the academy will set up your class routine soon." />
          )}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map(({ item, phase }) => {
            const minsToStart = item.startMins - nowMins;
            const isNext = item.key === focusKey;
            const look = lookFor(phase, item, minsToStart, isNext, c);
            const meetLink = item.meetLink;
            const canJoin = !!meetLink && (phase === "live" || phase === "paused" || phase === "starting" || (phase === "upcoming" && minsToStart <= JOIN_WINDOW_MINS));
            const inClass = phase === "live" || phase === "paused";
            return (
              <View
                key={item.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  overflow: "hidden",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isNext ? `${c.primary}66` : c.border,
                  backgroundColor: isNext ? c.primarySoft : c.surface,
                  paddingVertical: 12,
                  paddingRight: 12,
                  paddingLeft: 16,
                  opacity: phase === "done" || phase === "ended" ? 0.9 : 1,
                }}
              >
                <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: look.bar }} />

                <View style={{ width: 66 }}>
                  <T variant="bodyStrong" weight="800" numberOfLines={1} adjustsFontSizeToFit>
                    {minsToDisplay(item.startMins)}
                  </T>
                  <T variant="caption" color="muted" numberOfLines={1} adjustsFontSizeToFit>
                    until {minsToDisplay(item.endMins)}
                  </T>
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <T variant="bodyStrong" weight="700" numberOfLines={2}>
                    {item.courseTitle}
                  </T>
                  {item.teacherName ? (
                    <T variant="small" color="muted" numberOfLines={1}>
                      with {item.teacherName}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <StatusChip look={look} live={phase === "live"} />
                    {item.classType ? <Badge tone="violet" label={item.classType === "makeup" ? "MAKE-UP" : "RETAKE"} /> : null}
                  </View>
                </View>

                {canJoin ? (
                  <Button title="Join" icon="video" size="sm" variant={inClass ? "danger" : "primary"} onPress={() => void openExternal(meetLink)} accessibilityLabel={`Join ${item.courseTitle}`} style={{ height: 40 }} />
                ) : inClass ? (
                  <Button title="Open" iconRight="arrow-right" size="sm" variant="danger" onPress={() => nav.go("StudentClasses")} accessibilityLabel={`Open ${item.courseTitle} in My Classes`} style={{ height: 40 }} />
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {allDone ? (
        <T variant="smallStrong" color="success" center>
          That is all for today. MashaAllah!{nextClass ? ` Next class: ${nextClass.daysAhead === 1 ? "tomorrow" : DAY_LABELS[nextClass.day]} at ${minsToDisplay(nextClass.startMins)}.` : ""}
        </T>
      ) : null}
      {farFromAcademyClock ? (
        <T variant="caption" color="faint" center>
          Class times are in Bangladesh time (UTC+6).
        </T>
      ) : null}
    </Card>
  );
}
