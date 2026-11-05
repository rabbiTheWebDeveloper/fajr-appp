import React from "react";
import { Pressable, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { useNav } from "@/navigation/nav";
import type { RouteName } from "@/navigation/routes";
import { useTheme } from "@/theme/ThemeContext";
import type { Tone } from "@/theme/palette";
import { IconChip, SectionHeader, T, type IconName } from "@/ui";

// Every page of the teacher portal, in the order and with the names of the website's menu
const LINKS: { route: RouteName; label: string; icon: IconName; tone: Tone }[] = [
  { route: "TeacherClasses", label: "My Classes", icon: "calendar", tone: "primary" },
  { route: "TeacherMonthlyReport", label: "Monthly Report", icon: "bar-chart-2", tone: "violet" },
  { route: "TeacherStudents", label: "My Students", icon: "users", tone: "success" },
  { route: "TeacherLearningMaterials", label: "Learning Materials", icon: "bookmark", tone: "info" },
  { route: "TeacherSalary", label: "Salary", icon: "dollar-sign", tone: "success" },
  { route: "TeacherSchedule", label: "Schedule", icon: "clipboard", tone: "primary" },
  { route: "TeacherHelpdesk", label: "Teacher's Helpdesk", icon: "life-buoy", tone: "warning" },
  { route: "TeacherCeoRequest", label: "CEO Direct Line", icon: "send", tone: "violet" },
  { route: "TeacherLeaderboard", label: "Leaderboard", icon: "award", tone: "warning" },
  { route: "TeacherAnnouncements", label: "Announcements", icon: "bell", tone: "danger" },
  { route: "TeacherSettings", label: "Settings", icon: "settings", tone: "neutral" },
];

const COLUMNS = 3;

/** Shortcuts to the other pages of the portal */
export function QuickLinks() {
  const { c } = useTheme();
  const nav = useNav();

  const rows: (typeof LINKS)[] = [];
  for (let i = 0; i < LINKS.length; i += COLUMNS) rows.push(LINKS.slice(i, i + COLUMNS));

  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title="Quick Links" />
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
          {row.map((link) => (
            <Pressable
              key={link.route}
              onPress={() => {
                tapFeedback();
                nav.go(link.route);
              }}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              android_ripple={{ color: c.border }}
              style={{ flex: 1, minHeight: 86, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 6, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: "hidden" }}
            >
              <IconChip icon={link.icon} tone={link.tone} size={36} />
              <T variant="caption" weight="700" center numberOfLines={2}>
                {link.label}
              </T>
            </Pressable>
          ))}
          {row.length < COLUMNS ? Array.from({ length: COLUMNS - row.length }, (_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}
