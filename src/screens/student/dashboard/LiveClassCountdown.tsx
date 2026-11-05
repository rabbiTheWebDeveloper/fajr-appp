import React from "react";
import { View } from "react-native";

import { openExternal } from "@/lib/device";
import { useNow } from "@/lib/hooks";
import { ACADEMY_UTC_OFFSET_MINS, type TodayClass } from "@/lib/student-dashboard-shared";
import { minsToDisplay } from "@/lib/teacher-slot-shared";
import { useNav } from "@/navigation/nav";
import { GradientButton, PulseDot, onGradient } from "@/screens/student/dashboard/parts";
import { useTheme } from "@/theme/ThemeContext";
import { gradients } from "@/theme/palette";
import { GradientCard, Icon, Row, T } from "@/ui";

const DEFAULT_CLASS_MINS = 45;
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

interface LiveClassCountdownProps {
  /** Today's classes that are not done yet */
  classes: TodayClass[];
  studentName?: string;
}

/**
 * The banner at the top of the dashboard: the class running right now with the time left, or the next class of
 * today with a countdown to its start, ticking every second. Class times are read on the academy's clock
 * (Bangladesh, UTC+6), so "8:00 PM" is the same moment for a student abroad as for one in Dhaka.
 * Shows nothing when no class is left today.
 */
export default function LiveClassCountdown({ classes, studentName }: LiveClassCountdownProps) {
  const now = useNow(1000);
  const nav = useNav();
  const { c } = useTheme();

  const clock = new Date(now.getTime() + ACADEMY_UTC_OFFSET_MINS * 60_000);
  const currentMinutes = clock.getUTCHours() * 60 + clock.getUTCMinutes();
  const currentSeconds = clock.getUTCSeconds();

  const sessions = classes
    .map((item) => ({ ...item, endMins: item.endMins > item.startMins ? item.endMins : item.startMins + DEFAULT_CLASS_MINS }))
    .sort((a, b) => a.startMins - b.startMins);

  const active = sessions.find((s) => currentMinutes >= s.startMins && currentMinutes < s.endMins);
  const upcoming = sessions.find((s) => s.startMins > currentMinutes);
  const session = active ?? upcoming;
  if (!session) return null;

  const isLive = !!active;
  let countdown: string;
  if (isLive) {
    const minsLeft = Math.max(0, session.endMins - currentMinutes - 1);
    countdown = `${minsLeft}m ${pad2(59 - currentSeconds)}s left`;
  } else {
    const total = Math.max(0, (session.startMins - currentMinutes) * 60 - currentSeconds);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    countdown = hours > 0 ? `${hours}h ${mins}m ${pad2(total % 60)}s` : `${mins}m ${pad2(total % 60)}s`;
  }

  const accent = isLive ? onGradient.text : c.gold;
  const meetLink = session.meetLink;

  return (
    <GradientCard gradient={isLive ? "rose" : "navyDeep"} style={{ borderWidth: 1, borderColor: isLive ? onGradient.chip : `${c.gold}55` }}>
      <Row gap={12} align="flex-start">
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.line, borderWidth: 1, borderColor: isLive ? onGradient.chip : `${c.gold}66` }}>
          <Icon name="video" size={22} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Row gap={6} style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: isLive ? onGradient.chip : `${c.gold}26`, borderWidth: 1, borderColor: isLive ? "transparent" : `${c.gold}4D` }}>
            <PulseDot color={isLive ? onGradient.text : c.success} />
            <T variant="caption" color={accent} weight="800" style={{ letterSpacing: 0.6 }}>
              {isLive ? "🔴 LIVE NOW" : "NEXT UPCOMING CLASS"}
            </T>
          </Row>

          <T variant="title" color={onGradient.text} numberOfLines={2} style={{ marginTop: 2 }}>
            {session.courseTitle || "Scheduled Class Session"}
          </T>

          <Row gap={5}>
            <Icon name="clock" size={12} color={accent} />
            <T variant="smallStrong" color={onGradient.soft}>
              {minsToDisplay(session.startMins)} – {minsToDisplay(session.endMins)}
            </T>
          </Row>
          {session.teacherName ? (
            <T variant="small" color="onDarkMuted" numberOfLines={1}>
              Teacher:{" "}
              <T variant="smallStrong" color={accent}>
                {session.teacherName}
              </T>
            </T>
          ) : null}
          {studentName ? (
            <T variant="small" color="onDarkMuted" numberOfLines={1}>
              Student:{" "}
              <T variant="smallStrong" color={onGradient.text}>
                {studentName}
              </T>
            </T>
          ) : null}
        </View>
      </Row>

      <View style={{ height: 1, backgroundColor: onGradient.line, marginVertical: 12 }} />

      <Row gap={12} justify="space-between">
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="label" color="onDarkMuted">
            {isLive ? "Session Ending In" : "Starts In"}
          </T>
          <T variant="mono" color={accent} weight="800" numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="none" style={{ fontSize: 22, lineHeight: 28 }}>
            {countdown}
          </T>
        </View>

        {meetLink ? (
          <GradientButton
            title={isLive ? "Join Live Now" : "Open Meet"}
            iconRight="arrow-right"
            onPress={() => void openExternal(meetLink)}
            background={isLive ? undefined : c.gold}
            color={isLive ? gradients.rose[1] : c.navy}
          />
        ) : (
          <GradientButton title={isLive ? "Enter Classroom" : "Go to Class"} iconRight="arrow-right" onPress={() => nav.go("StudentClasses")} color={isLive ? gradients.rose[1] : c.navy} />
        )}
      </Row>
    </GradientCard>
  );
}
