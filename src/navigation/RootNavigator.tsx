import React, { useMemo } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";
import StudentNavigator from "@/navigation/StudentNavigator";
import TeacherNavigator from "@/navigation/TeacherNavigator";
import LoginScreen from "@/screens/auth/LoginScreen";
import { useTheme } from "@/theme/ThemeContext";

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: "#060d20", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <Image source={require("../../assets/icon-192.png")} style={{ width: 88, height: 88, borderRadius: 24 }} />
      <ActivityIndicator color="#DFB76C" />
    </View>
  );
}

/** Decides what the app shows: the splash while the saved session is read, the login screen, or the right portal */
export default function RootNavigator() {
  const { status, user } = useAuth();
  const { c, isDark } = useTheme();

  const navTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.surface, text: c.text, border: c.border, notification: c.danger } };
  }, [c, isDark]);

  if (status === "loading") return <Splash />;
  if (status === "signedOut" || !user) return <LoginScreen />;

  // A new container per account, so one person's screens never linger for the next
  return (
    <NavigationContainer key={`${user.role}:${user._id}`} theme={navTheme}>
      {user.role === "teacher" ? <TeacherNavigator /> : <StudentNavigator />}
    </NavigationContainer>
  );
}
