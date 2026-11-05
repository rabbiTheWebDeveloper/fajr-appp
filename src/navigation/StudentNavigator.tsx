import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/navigation/AppHeader";
import { ROUTE_TITLES, STUDENT_TABS_HOST, type RouteName } from "@/navigation/routes";
import { inTabs, tabBarOptions, tabListeners, tabOptions } from "@/navigation/shared";
import { NotificationsProvider } from "@/notifications/NotificationsContext";
import { useReminderSync } from "@/notifications/useReminderSync";
import NotificationsScreen from "@/screens/shared/NotificationsScreen";
import CertificateScreen from "@/screens/student/CertificateScreen";
import ClassesScreen from "@/screens/student/ClassesScreen";
import DashboardScreen from "@/screens/student/DashboardScreen";
import FeedbackScreen from "@/screens/student/FeedbackScreen";
import LeaderboardScreen from "@/screens/student/LeaderboardScreen";
import MoreScreen from "@/screens/student/MoreScreen";
import PaymentsScreen from "@/screens/student/PaymentsScreen";
import ScheduleScreen from "@/screens/student/ScheduleScreen";
import { loadStudentReminderSlots } from "@/screens/student/settings/reminder-slots";
import SettingsScreen from "@/screens/student/SettingsScreen";
import { StudentProvider } from "@/screens/student/StudentContext";
import ToolsScreen from "@/screens/student/ToolsScreen";
import { useTheme } from "@/theme/ThemeContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabDashboard = inTabs(DashboardScreen);
const TabClasses = inTabs(ClassesScreen);
const TabTools = inTabs(ToolsScreen);
const TabSchedule = inTabs(ScheduleScreen);
const TabMore = inTabs(MoreScreen);

function StudentTabs() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  useReminderSync(loadStudentReminderSlots);
  return (
    <Tab.Navigator screenOptions={tabBarOptions(c, isDark, insets.bottom)} screenListeners={tabListeners} backBehavior="firstRoute">
      <Tab.Screen name="StudentDashboard" component={TabDashboard} options={tabOptions("StudentDashboard", "grid", "Dashboard", c, isDark)} />
      <Tab.Screen name="StudentClasses" component={TabClasses} options={tabOptions("StudentClasses", "book-open", "Classes", c, isDark)} />
      <Tab.Screen name="StudentTools" component={TabTools} options={tabOptions("StudentTools", "star", "Tools", c, isDark)} />
      <Tab.Screen name="StudentSchedule" component={TabSchedule} options={tabOptions("StudentSchedule", "calendar", "Schedule", c, isDark)} />
      <Tab.Screen name="StudentMore" component={TabMore} options={tabOptions("StudentMore", "menu", "More", c, isDark)} />
    </Tab.Navigator>
  );
}

const pushed = (route: RouteName) => ({ header: () => <AppHeader title={ROUTE_TITLES[route]} canGoBack hideBell={route === "Notifications"} /> });

/** The student portal: five tabs, plus the pages reached from More, the dashboard and notifications */
export default function StudentNavigator() {
  const { c } = useTheme();
  return (
    <StudentProvider>
      <NotificationsProvider>
        <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }}>
          <Stack.Screen name={STUDENT_TABS_HOST} component={StudentTabs} options={{ headerShown: false }} />
          <Stack.Screen name="StudentPayments" component={PaymentsScreen} options={pushed("StudentPayments")} />
          <Stack.Screen name="StudentCertificate" component={CertificateScreen} options={pushed("StudentCertificate")} />
          <Stack.Screen name="StudentFeedback" component={FeedbackScreen} options={pushed("StudentFeedback")} />
          <Stack.Screen name="StudentLeaderboard" component={LeaderboardScreen} options={pushed("StudentLeaderboard")} />
          <Stack.Screen name="StudentSettings" component={SettingsScreen} options={pushed("StudentSettings")} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={pushed("Notifications")} />
        </Stack.Navigator>
      </NotificationsProvider>
    </StudentProvider>
  );
}
