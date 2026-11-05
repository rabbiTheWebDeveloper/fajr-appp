import React from "react";
import { View } from "react-native";

import type { RouteName } from "@/navigation/routes";
import { NoticeModal } from "@/screens/teacher/shell/NoticeModal";
import { TeacherOnboardingProvider, useOnboardingReloadOnFocus } from "@/screens/teacher/shell/onboarding";
import { OnboardingGate } from "@/screens/teacher/shell/OnboardingGate";
import { WarningTicker } from "@/screens/teacher/shell/WarningTicker";
import { useTheme } from "@/theme/ThemeContext";

export { useOnboarding } from "@/screens/teacher/shell/onboarding";

/** State shared by every teacher screen: the "Get Started" checklist and the lock that follows from it */
export function TeacherShellProvider({ children }: { children: React.ReactNode }) {
  return <TeacherOnboardingProvider>{children}</TeacherOnboardingProvider>;
}

/**
 * Wraps each teacher screen: the warning strip on top (on every teacher page, as on the website) and the
 * "Get Started" lock while onboarding. `route` tells which website page the screen stands for.
 */
export function TeacherPage({ route, children }: { route: RouteName; children: React.ReactNode }) {
  const { c } = useTheme();
  // Steps are finished on other screens, so each screen coming into view checks the list again
  useOnboardingReloadOnFocus();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <WarningTicker />
      <View style={{ flex: 1 }}>
        <OnboardingGate route={route}>{children}</OnboardingGate>
      </View>
    </View>
  );
}

/** The pop-up for an active notice from the academy */
export function TeacherNoticeModal() {
  return <NoticeModal />;
}
