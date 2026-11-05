import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/auth/AuthContext";
import RootNavigator from "@/navigation/RootNavigator";
import { ThemeProvider } from "@/theme/ThemeContext";
import { ToastHost } from "@/ui";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {/* The app bar and the login page are navy in both themes, so the status bar text is always light */}
          <StatusBar style="light" />
          <RootNavigator />
          <ToastHost />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
