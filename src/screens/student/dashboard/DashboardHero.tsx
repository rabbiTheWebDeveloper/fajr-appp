import React from "react";
import { View } from "react-native";

import { greetingFor } from "@/lib/student-dashboard-shared";
import { onGradient } from "@/screens/student/dashboard/parts";
import { classWord, deviceDateText } from "@/screens/student/dashboard/utils";
import type { StudentProfile } from "@/screens/student/StudentContext";
import { useTheme } from "@/theme/ThemeContext";
import { gradients } from "@/theme/palette";
import { Avatar, GradientCard, Icon, MIcon, Row, T } from "@/ui";

interface DashboardHeroProps {
  student: StudentProfile | null;
  /** True while the profile is still on its way */
  loading: boolean;
  now: Date;
  /** Classes in a row marked present; the chip shows only when there is one */
  streak: number;
}

const HERO_GRADIENT = [gradients.navyDeep[0], gradients.navy[1]] as const;

/** The welcome banner: greeting, name, date and the two things worth celebrating (the course and the streak). */
export default function DashboardHero({ student, loading, now, streak }: DashboardHeroProps) {
  const { c } = useTheme();
  // "Good morning" goes by the person's own clock, not the academy's
  const greeting = greetingFor(now.getHours());
  const firstName = student?.fullName?.trim().split(/\s+/)[0] || "Student";
  // The profile route sends the course as its title
  const course = typeof student?.course === "string" && student.course.trim() ? student.course.trim() : null;

  return (
    <GradientCard gradient={HERO_GRADIENT} padding={18}>
      <Row gap={14} justify="space-between">
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="label" color="onDarkMuted" numberOfLines={2}>
            {greeting.emoji} Assalamu Alaikum · {greeting.text}
          </T>

          {loading && !student ? (
            <View accessibilityLabel="Loading your name" style={{ marginTop: 8, height: 30, width: 170, borderRadius: 10, backgroundColor: onGradient.line }} />
          ) : (
            <T variant="h1" color={onGradient.text} numberOfLines={1} style={{ marginTop: 4, fontSize: 26, lineHeight: 32 }}>
              {firstName} 👋
            </T>
          )}
          <T variant="small" color="onDarkMuted" style={{ marginTop: 2 }}>
            {deviceDateText(now)}
          </T>

          {course || streak > 0 ? (
            <Row gap={8} wrap style={{ marginTop: 12 }}>
              {course ? (
                <Row gap={6} style={{ maxWidth: "100%", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: onGradient.line, borderWidth: 1, borderColor: onGradient.chip }}>
                  <MIcon name="school-outline" size={14} color={onGradient.text} />
                  <T variant="smallStrong" color={onGradient.text} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {course}
                  </T>
                </Row>
              ) : null}
              {streak > 0 ? (
                <Row gap={6} style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: `${c.gold}33`, borderWidth: 1, borderColor: `${c.gold}66` }}>
                  <MIcon name="fire" size={14} color={c.gold} />
                  <T variant="smallStrong" color={c.gold} weight="800">
                    {streak} {classWord(streak)} in a row
                  </T>
                </Row>
              ) : null}
            </Row>
          ) : null}
        </View>

        <View>
          <View style={{ padding: 2.5, borderRadius: 22, backgroundColor: c.gold }}>
            <Avatar uri={student?.avatar} name={student?.fullName} size={64} square />
          </View>
          <View style={{ position: "absolute", right: -5, bottom: -5, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.success, borderWidth: 2, borderColor: gradients.navy[1] }}>
            <Icon name="star" size={11} color={onGradient.text} />
          </View>
        </View>
      </Row>
    </GradientCard>
  );
}
