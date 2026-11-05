import React from "react";
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type Tone } from "@/theme/palette";
import { Icon, type IconName } from "@/ui";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  icon?: IconName;
  tone?: Tone;
  /** solid: filled; soft: tinted with a border; glass: for the navy hero card */
  look?: "solid" | "soft" | "glass";
  loading?: boolean;
  disabled?: boolean;
  /** Stretch across the parent */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A button whose label may wrap onto a second line. The schedule page's buttons carry long
 * English + Bengali labels that the kit's one-line Button would cut off on a narrow phone.
 */
export function ActionButton({ title, onPress, icon, tone = "primary", look = "solid", loading, disabled, block, style }: ActionButtonProps) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  const inactive = disabled || loading;
  const fg = look === "soft" ? t.fg : "#ffffff";
  const background = look === "solid" ? t.solid : look === "soft" ? t.bg : "rgba(255,255,255,0.12)";
  const border = look === "solid" ? t.solid : look === "soft" ? `${t.solid}55` : "rgba(255,255,255,0.2)";

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 44,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: background,
          alignSelf: block ? "stretch" : "flex-start",
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 13, lineHeight: 18, fontWeight: "700", flexShrink: 1, textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

/** "🕒 8:00 PM – 9:00 PM" in a small bordered tag */
export function TimeTag({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: `${t.solid}40`, backgroundColor: c.surface }}>
      <Icon name="clock" size={13} color={t.fg} />
      <Text style={{ color: c.text, fontSize: 12.5, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

interface PillProps {
  label: string;
  /** Smaller text after the label */
  extra?: string;
  icon?: IconName;
  active?: boolean;
  tone?: Tone;
  /** Strike the label through (a time that is already taken) */
  strike?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** A tappable choice: filled when chosen, outlined otherwise */
export function Pill({ label, extra, icon, active, tone = "primary", strike, onPress, accessibilityLabel }: PillProps) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  const fg = active ? "#ffffff" : tone === "neutral" ? c.text : t.fg;
  // A plain (neutral) choice turns the app's action blue when chosen
  const activeColor = tone === "neutral" ? c.primary : t.solid;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? activeColor : tone === "neutral" ? c.borderStrong : `${t.solid}55`,
        backgroundColor: active ? activeColor : tone === "danger" ? t.bg : c.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12.5, fontWeight: "700", flexShrink: 1, textDecorationLine: strike ? "line-through" : "none" }}>{label}</Text>
      {extra ? <Text style={{ color: fg, fontSize: 11, fontWeight: "600", opacity: 0.8 }}>{extra}</Text> : null}
    </Pressable>
  );
}
