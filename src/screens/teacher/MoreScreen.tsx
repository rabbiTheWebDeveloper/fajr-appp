import React from "react";
import { Text, View } from "react-native";

import { isOpenDuringOnboarding } from "@/config/teacher-onboarding";
import { formatNumber } from "@/lib/format";
import { ROUTE_PATHS } from "@/navigation/routes";
import { MoreMenu, type MoreItem } from "@/screens/shared/MoreMenu";
import { useOnboarding, useOnboardingReloadOnFocus } from "@/screens/teacher/shell/onboarding";
import { useTeacher } from "@/screens/teacher/TeacherContext";

// The pages that have no tab of their own, in the website sidebar's order
const ITEMS: MoreItem[] = [
  { route: "TeacherMonthlyReport", label: "Monthly Report", icon: "bar-chart-2" },
  { route: "TeacherStudents", label: "My Students", icon: "users" },
  { route: "TeacherLearningMaterials", label: "Learning Materials", icon: "bookmark" },
  { route: "TeacherHelpdesk", label: "Teacher's Helpdesk", icon: "life-buoy" },
  { route: "TeacherCeoRequest", label: "CEO Direct Line", icon: "send" },
  { route: "TeacherLeaderboard", label: "Leaderboard", icon: "award" },
  { route: "TeacherAnnouncements", label: "Announcements", icon: "bell" },
  { route: "TeacherSettings", label: "Settings", icon: "settings" },
];

export default function TeacherMoreScreen() {
  const { profile, gems, refreshProfile, refreshGems } = useTeacher();
  const { gate } = useOnboarding();
  // Coming back from Settings or My Students may have finished a step: check the locks again
  useOnboardingReloadOnFocus();

  // While "Get Started" is unfinished, the pages it does not use carry a lock (as in the website's sidebar)
  const items = ITEMS.map((item) => ({ ...item, locked: gate === "locked" && !isOpenDuringOnboarding(ROUTE_PATHS[item.route]) }));

  const gemsPill = gems ? (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 5, marginTop: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(16,185,129,0.14)" }}>
      <Text style={{ fontSize: 12 }}>{gems.tierEmoji}</Text>
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#059669" }}>{formatNumber(gems.totalGems)} gems</Text>
    </View>
  ) : null;

  return (
    <MoreMenu
      idLine={profile?.teacherId || "Teacher Portal"}
      profileExtra={gemsPill}
      settingsRoute="TeacherSettings"
      items={items}
      onRefresh={async () => {
        await Promise.all([refreshProfile(), refreshGems()]);
      }}
    />
  );
}
