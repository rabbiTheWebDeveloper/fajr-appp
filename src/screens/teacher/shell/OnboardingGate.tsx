import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { isOpenDuringOnboarding } from "@/config/teacher-onboarding";
import { useNav } from "@/navigation/nav";
import { ROUTE_PATHS, TEACHER_TABS_HOST, tabsHostFor, type RouteName } from "@/navigation/routes";
import { useOnboarding } from "@/screens/teacher/shell/onboarding";
import { Button, Card, IconChip, Screen, Skeleton, T } from "@/ui";

/**
 * Wraps every teacher screen. While the Get Started steps are unfinished, only the screens those steps are
 * done on (dashboard, Settings, My Students) render; the rest show a lock notice instead. This is a
 * screen-level lock: the screens' own data endpoints are not blocked.
 */
export function OnboardingGate({ route, children }: { route: RouteName; children: React.ReactNode }) {
  const { gate, state } = useOnboarding();
  const nav = useNav();
  const navigation = useNavigation<{ popTo?: (name: string, params?: object) => void }>();

  if (gate === "open" || isOpenDuringOnboarding(ROUTE_PATHS[route])) return <>{children}</>;

  if (gate === "checking") {
    return (
      <Screen>
        <View accessibilityLabel="Loading page" style={{ gap: 16 }}>
          <Skeleton width={220} height={30} />
          <Skeleton height={160} rounded={16} />
        </View>
      </Screen>
    );
  }

  const stepsLeft = state ? state.steps.filter((step) => step.blocksDashboard && !step.done).length : 0;

  const goToGetStarted = () => {
    // A page opened on top of the tabs steps back down to them instead of stacking a second dashboard
    if (!tabsHostFor(route) && typeof navigation.popTo === "function") {
      navigation.popTo(TEACHER_TABS_HOST, { screen: "TeacherDashboard" });
      return;
    }
    nav.go("TeacherDashboard");
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
      <Card padding={24} style={{ alignItems: "center", gap: 14 }}>
        <IconChip icon="lock" tone="warning" size={48} />
        <View style={{ gap: 6 }}>
          <T variant="h2" center accessibilityRole="header">
            This page is locked
          </T>
          <T color="muted" center>
            Finish the Get Started steps on your dashboard to unlock every page
            {stepsLeft > 0 ? ` (${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left)` : ""}.
          </T>
        </View>
        <Button title="Go to Get Started" iconRight="arrow-right" onPress={goToGetStarted} style={{ alignSelf: "center" }} />
      </Card>
    </Screen>
  );
}
