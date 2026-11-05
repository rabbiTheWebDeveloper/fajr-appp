import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/navigation/AppHeader";
import { ROUTE_TITLES, TEACHER_TABS_HOST, type RouteName } from "@/navigation/routes";
import { inTabs, tabBarOptions, tabListeners, tabOptions } from "@/navigation/shared";
import { NotificationsProvider } from "@/notifications/NotificationsContext";
import { useReminderSync } from "@/notifications/useReminderSync";
import NotificationsScreen from "@/screens/shared/NotificationsScreen";
import AnnouncementsScreen from "@/screens/teacher/AnnouncementsScreen";
import CeoRequestScreen from "@/screens/teacher/CeoRequestScreen";
import ClassesScreen from "@/screens/teacher/ClassesScreen";
import DashboardScreen from "@/screens/teacher/DashboardScreen";
import HelpdeskScreen from "@/screens/teacher/HelpdeskScreen";
import LeaderboardScreen from "@/screens/teacher/LeaderboardScreen";
import LearningMaterialsScreen from "@/screens/teacher/LearningMaterialsScreen";
import MonthlyReportScreen from "@/screens/teacher/MonthlyReportScreen";
import MoreScreen from "@/screens/teacher/MoreScreen";
import SalaryScreen from "@/screens/teacher/SalaryScreen";
import ScheduleScreen from "@/screens/teacher/ScheduleScreen";
import { loadTeacherReminderSlots } from "@/screens/teacher/schedule/reminder-slots";
import SettingsScreen from "@/screens/teacher/SettingsScreen";
import StudentsScreen from "@/screens/teacher/StudentsScreen";
import { TeacherNoticeModal, TeacherPage, TeacherShellProvider } from "@/screens/teacher/shell/TeacherShell";
import { TeacherProvider } from "@/screens/teacher/TeacherContext";
import { useTheme } from "@/theme/ThemeContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Every teacher screen sits inside TeacherPage: the warning strip on top and the "Get Started" lock while onboarding */
function page(route: RouteName, Component: React.ComponentType): React.ComponentType {
  function Page() {
    return (
      <TeacherPage route={route}>
        <Component />
      </TeacherPage>
    );
  }
  Page.displayName = `TeacherPage(${route})`;
  return Page;
}

const TabDashboard = inTabs(page("TeacherDashboard", DashboardScreen));
const TabClasses = inTabs(page("TeacherClasses", ClassesScreen));
const TabSchedule = inTabs(page("TeacherSchedule", ScheduleScreen));
const TabSalary = inTabs(page("TeacherSalary", SalaryScreen));
const TabMore = inTabs(MoreScreen);

const MonthlyReport = page("TeacherMonthlyReport", MonthlyReportScreen);
const Students = page("TeacherStudents", StudentsScreen);
const LearningMaterials = page("TeacherLearningMaterials", LearningMaterialsScreen);
const Helpdesk = page("TeacherHelpdesk", HelpdeskScreen);
const CeoRequest = page("TeacherCeoRequest", CeoRequestScreen);
const Leaderboard = page("TeacherLeaderboard", LeaderboardScreen);
const Announcements = page("TeacherAnnouncements", AnnouncementsScreen);
const Settings = page("TeacherSettings", SettingsScreen);

function TeacherTabs() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  useReminderSync(loadTeacherReminderSlots);
  return (
    <Tab.Navigator screenOptions={tabBarOptions(c, isDark, insets.bottom)} screenListeners={tabListeners} backBehavior="firstRoute">
      <Tab.Screen name="TeacherDashboard" component={TabDashboard} options={tabOptions("TeacherDashboard", "bar-chart-2", "Home", c, isDark)} />
      <Tab.Screen name="TeacherClasses" component={TabClasses} options={tabOptions("TeacherClasses", "calendar", "Classes", c, isDark)} />
      <Tab.Screen name="TeacherSchedule" component={TabSchedule} options={tabOptions("TeacherSchedule", "clipboard", "Schedule", c, isDark)} />
      <Tab.Screen name="TeacherSalary" component={TabSalary} options={tabOptions("TeacherSalary", "dollar-sign", "Salary", c, isDark)} />
      <Tab.Screen name="TeacherMore" component={TabMore} options={tabOptions("TeacherMore", "menu", "More", c, isDark)} />
    </Tab.Navigator>
  );
}

const pushed = (route: RouteName) => ({ header: () => <AppHeader title={ROUTE_TITLES[route]} canGoBack hideBell={route === "Notifications"} /> });

/** The teacher portal: five tabs, plus the pages reached from More, the dashboard and notifications */
export default function TeacherNavigator() {
  const { c } = useTheme();
  return (
    <TeacherProvider>
      <TeacherShellProvider>
        <NotificationsProvider>
          <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }}>
            <Stack.Screen name={TEACHER_TABS_HOST} component={TeacherTabs} options={{ headerShown: false }} />
            <Stack.Screen name="TeacherMonthlyReport" component={MonthlyReport} options={pushed("TeacherMonthlyReport")} />
            <Stack.Screen name="TeacherStudents" component={Students} options={pushed("TeacherStudents")} />
            <Stack.Screen name="TeacherLearningMaterials" component={LearningMaterials} options={pushed("TeacherLearningMaterials")} />
            <Stack.Screen name="TeacherHelpdesk" component={Helpdesk} options={pushed("TeacherHelpdesk")} />
            <Stack.Screen name="TeacherCeoRequest" component={CeoRequest} options={pushed("TeacherCeoRequest")} />
            <Stack.Screen name="TeacherLeaderboard" component={Leaderboard} options={pushed("TeacherLeaderboard")} />
            <Stack.Screen name="TeacherAnnouncements" component={Announcements} options={pushed("TeacherAnnouncements")} />
            <Stack.Screen name="TeacherSettings" component={Settings} options={pushed("TeacherSettings")} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={pushed("Notifications")} />
          </Stack.Navigator>
          <TeacherNoticeModal />
        </NotificationsProvider>
      </TeacherShellProvider>
    </TeacherProvider>
  );
}
