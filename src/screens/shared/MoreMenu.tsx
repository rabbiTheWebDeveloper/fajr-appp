import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Constants from "expo-constants";

import { useAuth } from "@/auth/AuthContext";
import { callPhone, openWhatsApp, tapFeedback } from "@/lib/device";
import { useNav } from "@/navigation/nav";
import type { RouteName } from "@/navigation/routes";
import { useTheme, type ThemeMode } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Avatar, Button, Card, Row, Screen, Segmented, T, confirmAsync, type IconName } from "@/ui";

export interface MoreItem {
  route: RouteName;
  label: string;
  icon: IconName;
  /** A lock on the tile (teacher pages closed until "Get Started" is finished) */
  locked?: boolean;
}

interface MoreMenuProps {
  /** The line under the name: student ID or teacher ID */
  idLine?: string;
  /** Extra content inside the profile card (the teacher's gems pill) */
  profileExtra?: React.ReactNode;
  settingsRoute: RouteName;
  items: MoreItem[];
  onRefresh?: () => Promise<void>;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Auto", icon: "smartphone" },
];

/** The "More" tab of both portals: profile card, the rest of the pages, appearance, support and sign-out */
export function MoreMenu({ idLine, profileExtra, settingsRoute, items, onRefresh }: MoreMenuProps) {
  const { c } = useTheme();
  const { mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const nav = useNav();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSignOut = async () => {
    const yes = await confirmAsync({ title: "Log out?", message: "You will need your password to sign in again.", confirmText: "Log out", destructive: true });
    if (!yes) return;
    setSigningOut(true);
    await signOut();
  };

  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
      }
    : undefined;

  const rows: MoreItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Card onPress={() => nav.go(settingsRoute)} padding={14}>
        <Row gap={14}>
          <Avatar uri={user?.avatar} name={user?.fullName} size={52} square />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <T variant="title" numberOfLines={1}>
              {user?.fullName || (user?.role === "teacher" ? "Instructor" : "Student")}
            </T>
            {idLine ? (
              <T variant="mono" color="muted" numberOfLines={1}>
                {idLine}
              </T>
            ) : null}
            {profileExtra}
          </View>
          <Feather name="chevron-right" size={18} color={c.textFaint} />
        </Row>
      </Card>

      <View style={{ gap: 12 }}>
        {rows.map((row, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 12 }}>
            {row.map((item) => (
              <Pressable
                key={item.route}
                onPress={() => {
                  tapFeedback();
                  nav.go(item.route);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.locked ? `${item.label}, locked until Get Started is finished` : item.label}
                android_ripple={{ color: c.border }}
                style={{ flex: 1, minHeight: 88, justifyContent: "space-between", padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, opacity: item.locked ? 0.6 : 1, overflow: "hidden" }}
              >
                <Row justify="space-between">
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                    <Feather name={item.icon} size={18} color={c.textMuted} />
                  </View>
                  {item.locked ? <Feather name="lock" size={14} color={c.textFaint} /> : null}
                </Row>
                <Text numberOfLines={1} style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label" color="faint">
          Appearance
        </T>
        <Segmented
          value={mode}
          onChange={(next) => {
            tapFeedback();
            setMode(next);
          }}
          options={THEME_OPTIONS}
        />
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label" color="faint">
          Need help?
        </T>
        <Row>
          <Button title="WhatsApp" icon="message-circle" variant="secondary" style={{ flex: 1 }} block onPress={() => void openWhatsApp("8801641028312", "Hello Fajr Academy Support, I need assistance with the Fajr Academy app.")} />
          <Button title="Call support" icon="phone" variant="secondary" style={{ flex: 1 }} block onPress={() => void callPhone("01857381244")} />
        </Row>
      </View>

      <Button title={signingOut ? "Signing out…" : "Log Out"} icon="log-out" variant="dangerSoft" size="lg" block loading={signingOut} onPress={() => void handleSignOut()} />

      <T variant="caption" color="faint" center>
        Fajr Academy · version {Constants.expoConfig?.version ?? "2.0.0"}
      </T>
    </Screen>
  );
}
