import React from "react";
import { Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import { tapFeedback } from "@/lib/device";
import { AppHeader } from "@/navigation/AppHeader";
import { ROUTE_TITLES, type RouteName } from "@/navigation/routes";
import type { Palette } from "@/theme/palette";
import { InTabsContext, type IconName } from "@/ui";

/** Marks a screen as living inside the tab bar */
export function inTabs<P extends object>(Component: React.ComponentType<P>): React.ComponentType<P> {
  function TabScreen(props: P) {
    return (
      <InTabsContext.Provider value={true}>
        <Component {...props} />
      </InTabsContext.Provider>
    );
  }
  TabScreen.displayName = `InTabs(${Component.displayName || Component.name || "Screen"})`;
  return TabScreen;
}

/** Look and behaviour shared by both portals' bottom tab bars */
export function tabBarOptions(c: Palette, isDark: boolean, bottomInset: number): BottomTabNavigationOptions {
  return {
    tabBarActiveTintColor: isDark ? c.gold : c.navy,
    tabBarInactiveTintColor: c.textFaint,
    // Room for the icon pill and the label, plus the phone's gesture bar underneath
    tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 1, elevation: 12, height: 64 + bottomInset, paddingTop: 6, paddingBottom: bottomInset + 6 },
    tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700", marginBottom: 2 },
    tabBarHideOnKeyboard: true,
    sceneStyle: { backgroundColor: c.bg },
  };
}

/** One tab's options: title in the app bar, icon with the active pill, short label */
export function tabOptions(route: RouteName, icon: IconName, label: string, c: Palette, isDark: boolean): BottomTabNavigationOptions {
  return {
    title: label,
    header: () => <AppHeader title={ROUTE_TITLES[route]} />,
    tabBarAccessibilityLabel: ROUTE_TITLES[route],
    tabBarIcon: ({ focused, color }) => (
      <View style={{ width: 46, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: focused ? (isDark ? "rgba(223,183,108,0.14)" : "rgba(11,26,69,0.08)") : "transparent" }}>
        <Feather name={icon} size={20} color={color} />
      </View>
    ),
    tabBarLabel: ({ color, children }) => (
      <Text numberOfLines={1} style={{ color, fontSize: 10.5, fontWeight: "700" }}>
        {children}
      </Text>
    ),
  };
}

/** A light tick each time a tab is pressed */
export const tabListeners = { tabPress: () => tapFeedback() };
