import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useNetworkState } from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { useNav } from "@/navigation/nav";
import { useNotifications } from "@/notifications/NotificationsContext";
import { Avatar } from "@/ui";

interface AppHeaderProps {
  title: string;
  /** Pushed screens show a back arrow instead of the brand mark */
  canGoBack?: boolean;
  /** Hide the bell on the notifications screen itself */
  hideBell?: boolean;
}

const NAVY = "#0B1A45";

/** The navy app bar on top of every signed-in screen: brand mark or back arrow, page title, bell, profile picture */
export function AppHeader({ title, canGoBack, hideBell }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const nav = useNav();
  const { unread, hidden } = useNotifications();
  const network = useNetworkState();
  // Only a definite "not connected" counts: the state is unknown for a moment at start-up
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const isStudent = user?.role === "student";

  return (
    <View style={{ backgroundColor: NAVY, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)" }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 }}>
        {canGoBack ? (
          <Pressable onPress={nav.back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)" }}>
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <Image source={require("../../assets/icon-192.png")} style={{ width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} accessibilityRole="header" style={{ color: "#ffffff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ color: "rgba(191,219,254,0.7)", fontSize: 11, fontWeight: "500" }}>
            {isStudent ? "Student Portal" : "Teacher Portal"}
          </Text>
        </View>

        {!hideBell && !hidden ? (
          <Pressable
            onPress={() => nav.go("Notifications")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)" }}
          >
            <Feather name="bell" size={19} color="#ffffff" />
            {unread > 0 ? (
              <View style={{ position: "absolute", top: 2, right: 2, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: NAVY }}>
                <Text style={{ color: "#ffffff", fontSize: 9.5, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {!canGoBack ? (
          <Pressable onPress={() => nav.go(isStudent ? "StudentSettings" : "TeacherSettings")} hitSlop={6} accessibilityRole="button" accessibilityLabel="Profile and settings">
            <Avatar uri={user?.avatar} name={user?.fullName} size={36} style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" }} />
          </Pressable>
        ) : null}
      </View>
      {offline ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6, backgroundColor: "#b45309" }}>
          <Feather name="wifi-off" size={13} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>No internet connection. Showing what was loaded before.</Text>
        </View>
      ) : null}
    </View>
  );
}
