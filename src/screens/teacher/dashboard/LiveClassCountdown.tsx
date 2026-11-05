import React from "react";
import { Pressable, Text, View } from "react-native";

import { openExternal } from "@/lib/device";
import { formatTime12 } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { academyToday, parseTimeToMinutes, type TodayClass } from "@/screens/teacher/dashboard/schedule-utils";
import { useTheme } from "@/theme/ThemeContext";
import { gradients } from "@/theme/palette";
import { GradientCard, Icon } from "@/ui";

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

// The darker end of the rose gradient, for the text on the white button of a live class
const LIVE_TEXT = gradients.rose[1];

/**
 * The live class alert on top of the dashboard: a countdown to the next class of today, or, while a class is
 * running, how long is left of it. It ticks every second on the academy's clock and hides when today has no
 * class left. (Reminders before a class are the app's own on-phone notifications, set in Settings.)
 */
export function LiveClassCountdown({ schedules, onOpenClasses }: { schedules: TodayClass[]; onOpenClasses: () => void }) {
  const { c } = useTheme();
  const now = useNow(1000);
  const { minutes: currentMinutes, seconds: currentSeconds } = academyToday(now);

  const processed = schedules
    .filter((s) => Boolean(s?.startTime))
    .map((s) => {
      const startMins = parseTimeToMinutes(s.startTime);
      const duration = Number(s.duration) || 45;
      const endMins = s.endTime ? parseTimeToMinutes(s.endTime) : startMins + duration;
      return { ...s, startMins, endMins: endMins <= startMins ? startMins + duration : endMins };
    })
    .sort((a, b) => a.startMins - b.startMins);

  const activeSession = processed.find((s) => currentMinutes >= s.startMins && currentMinutes < s.endMins);
  const upcomingSession = processed.find((s) => s.startMins > currentMinutes);
  const session = activeSession || upcomingSession;

  // No class running and none left today
  if (!session) return null;

  const isLive = Boolean(activeSession);
  let countdownText: string;
  if (activeSession) {
    const remainingMins = Math.max(0, activeSession.endMins - currentMinutes - 1);
    countdownText = `${remainingMins}m ${pad2(59 - currentSeconds)}s left`;
  } else {
    const diffTotalSeconds = Math.max(0, (session.startMins - currentMinutes) * 60 - currentSeconds);
    const diffHours = Math.floor(diffTotalSeconds / 3600);
    const diffMins = Math.floor((diffTotalSeconds % 3600) / 60);
    const diffSecs = diffTotalSeconds % 60;
    countdownText = diffHours > 0 ? `${diffHours}h ${diffMins}m ${pad2(diffSecs)}s` : `${diffMins}m ${pad2(diffSecs)}s`;
  }

  const meetLink = session.meetLink;
  const actionLabel = meetLink ? (isLive ? "Join Live Now" : "Open Meet") : isLive ? "Enter Classroom" : "Go to Class";
  const onAction = () => {
    if (meetLink) void openExternal(meetLink);
    else onOpenClasses();
  };

  return (
    <GradientCard gradient={isLive ? "rose" : "navyDeep"} style={{ borderWidth: 1, borderColor: isLive ? "rgba(255,255,255,0.25)" : "rgba(223,183,108,0.35)", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: isLive ? "rgba(255,255,255,0.2)" : "rgba(223,183,108,0.14)", borderWidth: 1, borderColor: isLive ? "rgba(255,255,255,0.35)" : "rgba(223,183,108,0.4)" }}>
          <Icon name="video" size={22} color={isLive ? "#ffffff" : c.gold} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: isLive ? "rgba(255,255,255,0.22)" : "rgba(223,183,108,0.15)", borderWidth: isLive ? 0 : 1, borderColor: "rgba(223,183,108,0.3)" }}>
            {isLive ? null : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.success }} />}
            <Text style={{ color: isLive ? "#ffffff" : c.gold, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.6 }}>{isLive ? "🔴 LIVE NOW" : "NEXT UPCOMING CLASS"}</Text>
          </View>

          <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 16.5, fontWeight: "900" }}>
            {session.course?.title || "Scheduled Class Session"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 8, rowGap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="clock" size={12} color={isLive ? "#ffffff" : c.gold} />
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" }}>
                {formatTime12(session.startTime)}
                {session.endTime ? ` – ${formatTime12(session.endTime)}` : ""}
              </Text>
            </View>
            {session.student?.fullName ? (
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, flexShrink: 1 }}>
                Student: <Text style={{ color: "#ffffff", fontWeight: "700" }}>{session.student.fullName}</Text>
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>{isLive ? "Session Ending In" : "Starts In"}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: isLive ? "#ffffff" : c.gold, fontSize: 22, fontWeight: "900", fontFamily: "monospace" }}>
            {countdownText}
          </Text>
        </View>

        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 16, borderRadius: 12, backgroundColor: isLive ? "#ffffff" : c.gold, opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ color: isLive ? LIVE_TEXT : c.navy, fontSize: 13, fontWeight: "800" }}>{actionLabel}</Text>
          <Icon name="arrow-right" size={15} color={isLive ? LIVE_TEXT : c.navy} />
        </Pressable>
      </View>
    </GradientCard>
  );
}
