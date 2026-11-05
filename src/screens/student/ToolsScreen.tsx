import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import DailyDuaCard from "@/screens/student/tools/DailyDuaCard";
import PrayerTimesCard from "@/screens/student/tools/PrayerTimesCard";
import QuranPracticePlayer from "@/screens/student/tools/QuranPracticePlayer";
import { useTheme } from "@/theme/ThemeContext";
import { GradientCard, Icon, Screen, T, type IconName } from "@/ui";

type ToolTab = "practice" | "prayers" | "duas";

const TABS: { key: ToolTab; label: string; icon: IconName }[] = [
  { key: "practice", label: "Tajweed Practice Station", icon: "book-open" },
  { key: "prayers", label: "Prayer Times & Countdown", icon: "compass" },
  { key: "duas", label: "Daily Masnoon Du'as", icon: "star" },
];

/** Islamic Tools: Quran recitation practice, prayer times and daily du'as */
export default function StudentToolsScreen() {
  const { c } = useTheme();
  const [activeTab, setActiveTab] = useState<ToolTab>("practice");

  return (
    <Screen>
      {/* Page header with the tool tabs */}
      <GradientCard gradient="navy">
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(223,183,108,0.16)", borderWidth: 1, borderColor: "rgba(223,183,108,0.35)" }}>
            <Icon name="star" size={12} color={c.gold} />
            <Text numberOfLines={1} style={{ flexShrink: 1, color: c.gold, fontSize: 11.5, fontWeight: "700" }}>
              Daily Islamic Practice & Habit Tools
            </Text>
          </View>
          <T variant="h1" color="onDark">
            Quran Practice & Daily Utilities 🕌
          </T>
          <T variant="small" color="onDarkMuted" style={{ lineHeight: 19 }}>
            Enhance your daily Tajweed recitation, stay punctual with your 5 daily prayers, and memorize essential daily Sunnah Du'as with authentic audio.
          </T>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.14)", marginTop: 14, marginBottom: 12 }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            const fg = active ? c.navy : "#ffffff";
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (!active) tapFeedback();
                  setActiveTab(tab.key);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: active ? "#ffffff" : "rgba(255,255,255,0.12)" }}
              >
                <Icon name={tab.icon} size={15} color={fg} />
                <Text style={{ color: fg, fontSize: 12.5, fontWeight: "700" }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </GradientCard>

      {/* Only the open tool is mounted, so leaving the practice station also stops its audio */}
      {activeTab === "practice" ? <QuranPracticePlayer /> : null}
      {activeTab === "prayers" ? <PrayerTimesCard /> : null}
      {activeTab === "duas" ? <DailyDuaCard /> : null}
    </Screen>
  );
}
