import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { Chip, type IconName, type ScrollViewRef } from "@/ui";

import type { SettingsTab } from "@/screens/teacher/settings/types";

interface SettingsTabsProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  personalPct: number;
  portfolioPct: number;
  unsavedPersonal: boolean;
  unsavedPortfolio: boolean;
  /** "approved" | "pending" | "rejected" */
  idCardStatus?: string;
  /** An email is on file but not verified yet */
  emailUnverified: boolean;
}

/** The tab row pinned above the page: a sideways-scrolling line of chips, with the same marks the website's tabs carry */
export function SettingsTabs({ active, onChange, personalPct, portfolioPct, unsavedPersonal, unsavedPortfolio, idCardStatus, emailUnverified }: SettingsTabsProps) {
  const { c } = useTheme();
  const scroller = useRef<ScrollViewRef>(null);
  const offsets = useRef<Partial<Record<SettingsTab, number>>>({});

  const tabs: { key: SettingsTab; label: string; icon: IconName; dot?: boolean; dotLabel?: string }[] = [
    { key: "personal", label: `Personal & Contact · ${personalPct}%`, icon: "user", dot: unsavedPersonal, dotLabel: "Unsaved changes in Personal" },
    { key: "portfolio", label: `Portfolio & Career · ${portfolioPct}%`, icon: "award", dot: unsavedPortfolio, dotLabel: "Unsaved changes in Portfolio" },
    { key: "slots", label: "My Slots", icon: "calendar" },
    { key: "notifications", label: "Notifications", icon: "bell" },
    { key: "idcard", label: `Digital ID Card · ${idCardStatus === "approved" ? "Verified" : idCardStatus === "rejected" ? "Rejected" : "Pending"}`, icon: "shield" },
    { key: "security", label: "Security & Password", icon: "lock", dot: emailUnverified, dotLabel: "Email not verified" },
  ];

  // Bring the open tab into view (the screen can be opened straight on a tab that sits off-screen)
  useEffect(() => {
    const x = offsets.current[active];
    if (typeof x === "number") scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [active]);

  return (
    <View style={{ backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            onLayout={(event) => {
              const x = event.nativeEvent.layout.x;
              const first = offsets.current[tab.key] === undefined;
              offsets.current[tab.key] = x;
              if (first && tab.key === active) scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
            }}
          >
            <Chip
              label={tab.label}
              icon={tab.icon}
              selected={tab.key === active}
              onPress={() => {
                tapFeedback();
                onChange(tab.key);
              }}
              style={{ height: 40 }}
            />
            {tab.dot ? <View accessibilityLabel={tab.dotLabel} style={{ position: "absolute", top: -2, right: -2, width: 11, height: 11, borderRadius: 6, backgroundColor: c.warning, borderWidth: 2, borderColor: c.bg }} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
