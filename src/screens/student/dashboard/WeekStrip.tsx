import React from "react";
import { Pressable, View } from "react-native";

import type { WeekDay, WeekDayState } from "@/lib/student-dashboard-shared";
import { onGradient } from "@/screens/student/dashboard/parts";
import { useTheme } from "@/theme/ThemeContext";
import type { Palette } from "@/theme/palette";
import { Card, Icon, Row, T, toast, type IconName } from "@/ui";

interface Look {
  tile: string;
  badge: string;
  /** Colour of the icon or number inside the badge */
  mark: string;
  text: string;
  /** No icon: the badge shows how many classes are planned */
  icon: IconName | null;
}

function lookFor(state: WeekDayState, c: Palette): Look {
  switch (state) {
    case "attended":
      return { tile: c.successSoft, badge: c.success, mark: onGradient.text, text: "Attended", icon: "check" };
    case "absent":
      return { tile: c.dangerSoft, badge: c.danger, mark: onGradient.text, text: "Absent", icon: "x" };
    case "held":
      return { tile: c.infoSoft, badge: c.info, mark: onGradient.text, text: "Class held, not marked yet", icon: "check" };
    case "missed":
      return { tile: c.surfaceAlt, badge: c.borderStrong, mark: c.textMuted, text: "No class recorded", icon: "minus" };
    case "upcoming":
      return { tile: c.primarySoft, badge: c.primary, mark: onGradient.text, text: "Class scheduled", icon: null };
    default:
      return { tile: "transparent", badge: "transparent", mark: c.textFaint, text: "No class", icon: "minus" };
  }
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={4}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T variant="caption" color="muted" weight="600">
        {label}
      </T>
    </Row>
  );
}

/** The three days behind you, today and the three ahead: what you attended, what you missed and what is coming. */
export default function WeekStrip({ days }: { days: WeekDay[] }) {
  const { c } = useTheme();
  return (
    <Card padding={14} style={{ gap: 14 }}>
      <Row gap={10} justify="space-between">
        <T variant="title">Your week</T>
        <Row gap={10} wrap justify="flex-end" accessibilityLabel="Legend" style={{ flexShrink: 1 }}>
          <Legend color={c.success} label="Attended" />
          <Legend color={c.danger} label="Absent" />
          <Legend color={c.primary} label="Coming" />
        </Row>
      </Row>

      <View style={{ flexDirection: "row", gap: 5 }}>
        {days.map((day) => {
          const look = lookFor(day.state, c);
          // What a day's mark means is spelled out on tap (and to screen readers)
          const meaning = `${day.label} ${day.dayOfMonth}: ${look.text}${day.state === "upcoming" && day.planned > 1 ? ` (${day.planned} classes)` : ""}`;
          return (
            <Pressable
              key={day.dateKey}
              onPress={() => toast.info(meaning)}
              accessibilityLabel={meaning}
              accessibilityState={{ selected: day.isToday }}
              style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: look.tile, borderWidth: 2, borderColor: day.isToday ? c.primary : "transparent" }}
            >
              <T variant="caption" color={day.isToday ? "primary" : "muted"} weight="700" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 10, textTransform: "uppercase" }}>
                {day.isToday ? "Today" : day.label}
              </T>
              <T variant="title" weight="800" style={{ lineHeight: 19 }}>
                {day.dayOfMonth}
              </T>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: look.badge }}>
                {look.icon ? (
                  <Icon name={look.icon} size={13} color={look.mark} />
                ) : (
                  <T variant="caption" color={look.mark} weight="800">
                    {day.planned}
                  </T>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
