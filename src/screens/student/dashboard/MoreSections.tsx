import React from "react";
import { View } from "react-native";

import { useNav } from "@/navigation/nav";
import type { RouteName } from "@/navigation/routes";
import { GradientButton, GradientIcon, onGradient } from "@/screens/student/dashboard/parts";
import { useTheme } from "@/theme/ThemeContext";
import { gradients, type GradientName } from "@/theme/palette";
import { Card, GradientCard, Icon, MIcon, Row, T, TileGrid, type IconName } from "@/ui";

/** The verse or hadith of the day. (It is not always a hadith, so it is not labelled as one.) */
export function InspirationCard({ inspiration }: { inspiration: { arabic: string; english: string; source: string } }) {
  const { c } = useTheme();
  return (
    <Card tone="warning" style={{ gap: 10, borderColor: `${c.warning}40` }}>
      <Row gap={8}>
        <MIcon name="creation" size={16} color={c.warningText} />
        <T variant="label" color="warning">
          Daily inspiration
        </T>
      </Row>
      <T weight="700" style={{ fontSize: 19, lineHeight: 34, textAlign: "right", writingDirection: "rtl" }}>{inspiration.arabic}</T>
      <T variant="body" weight="500" style={{ fontStyle: "italic", lineHeight: 22 }}>
        “{inspiration.english}”
      </T>
      <T variant="smallStrong" color="warning" weight="700">
        — {inspiration.source}
      </T>
    </Card>
  );
}

/** A colourful link to the Tajweed practice station. */
export function PracticeBanner() {
  const nav = useNav();
  return (
    <GradientCard gradient="violet" style={{ gap: 14 }}>
      <Row gap={12} align="flex-start" accessibilityLabel="Tajweed practice">
        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.chip }}>
          <Icon name="book-open" size={20} color={onGradient.text} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T variant="title" color={onGradient.text} weight="800">
            Tajweed audio & homework station
          </T>
          <T variant="small" color={onGradient.soft}>
            Listen to Surahs verse by verse with Mishary Rashid Alafasy and repeat after him.
          </T>
        </View>
      </Row>
      <GradientButton title="Open practice station" iconRight="arrow-right" color={gradients.violet[1]} onPress={() => nav.go("StudentTools")} />
    </GradientCard>
  );
}

interface Shortcut {
  label: string;
  route: RouteName;
  icon: IconName;
  gradient: GradientName;
}

// The website's quick links, in its order
const SHORTCUTS: Shortcut[] = [
  { label: "My Classes", route: "StudentClasses", icon: "book-open", gradient: "blue" },
  { label: "Islamic Tools", route: "StudentTools", icon: "star", gradient: "emerald" },
  { label: "Schedule", route: "StudentSchedule", icon: "calendar", gradient: "violet" },
  { label: "Payments", route: "StudentPayments", icon: "credit-card", gradient: "amber" },
  { label: "Feedback", route: "StudentFeedback", icon: "heart", gradient: "sky" },
  { label: "Certificate", route: "StudentCertificate", icon: "award", gradient: "rose" },
];

export function ShortcutGrid() {
  const nav = useNav();
  return (
    <View style={{ gap: 10 }}>
      <T variant="label" color="faint">
        Quick access
      </T>
      <TileGrid columns={3} gap={10}>
        {SHORTCUTS.map((shortcut) => (
          <Card key={shortcut.route} padding={12} onPress={() => nav.go(shortcut.route)} style={{ alignItems: "center", gap: 8, minHeight: 96, justifyContent: "center" }}>
            <GradientIcon icon={shortcut.icon} gradient={shortcut.gradient} size={44} />
            <T variant="smallStrong" weight="700" center numberOfLines={2}>
              {shortcut.label}
            </T>
          </Card>
        ))}
      </TileGrid>
    </View>
  );
}
