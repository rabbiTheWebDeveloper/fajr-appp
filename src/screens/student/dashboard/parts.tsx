import React, { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme/ThemeContext";
import { gradients, radius, type GradientName } from "@/theme/palette";
import { Icon, MIcon, Row, T, type IconName, type MIconName } from "@/ui";

/** Whites for text and shapes that sit on a gradient (the same in light and dark) */
export const onGradient = {
  text: "#ffffff",
  soft: "rgba(255,255,255,0.88)",
  chip: "rgba(255,255,255,0.2)",
  line: "rgba(255,255,255,0.14)",
} as const;

/** A gradient square with a white icon: the leading visual of the dashboard cards and shortcuts */
export function GradientIcon({ icon, mIcon, gradient, size = 40 }: { icon?: IconName; mIcon?: MIconName; gradient: GradientName; size?: number }) {
  const colors = gradients[gradient];
  const glyph = Math.round(size * 0.5);
  return (
    <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), alignItems: "center", justifyContent: "center" }}>
      {mIcon ? <MIcon name={mIcon} size={glyph} color={onGradient.text} /> : <Icon name={icon ?? "circle"} size={glyph} color={onGradient.text} />}
    </LinearGradient>
  );
}

interface CardHeaderProps {
  icon?: IconName;
  mIcon?: MIconName;
  gradient: GradientName;
  title: string;
  subtitle?: string;
  /** A "see more" link on the right */
  linkLabel?: string;
  onLink?: () => void;
}

/** The heading of a dashboard card: icon, title, a line under it and a link to the full page */
export function CardHeader({ icon, mIcon, gradient, title, subtitle, linkLabel, onLink }: CardHeaderProps) {
  const { c } = useTheme();
  return (
    <Row gap={10} justify="space-between">
      <Row gap={12} style={{ flex: 1, minWidth: 0 }}>
        <GradientIcon icon={icon} mIcon={mIcon} gradient={gradient} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="title" numberOfLines={1}>
            {title}
          </T>
          {subtitle ? (
            <T variant="small" color="muted" numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
      </Row>
      {linkLabel && onLink ? (
        <Pressable onPress={onLink} hitSlop={8} accessibilityRole="link" accessibilityLabel={linkLabel} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, paddingLeft: 6, opacity: pressed ? 0.6 : 1 })}>
          <T variant="smallStrong" color="primary">
            {linkLabel}
          </T>
          <Icon name="arrow-right" size={14} color={c.primaryText} />
        </Pressable>
      ) : null}
    </Row>
  );
}

/** A dot that breathes, to mark something that is happening right now */
export function PulseDot({ color = onGradient.text, size = 7 }: { color?: string; size?: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 0.25, duration: 600, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulse }} />;
}

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  /** Text colour of the solid (white) button; ignored when `soft` */
  color?: string;
  /** See-through white instead of solid white: for the quieter action */
  soft?: boolean;
  /** Background of the solid button (default white) */
  background?: string;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
}

/** A button for use on top of a gradient card */
export function GradientButton({ title, onPress, color, soft, background, icon, iconRight, disabled }: GradientButtonProps) {
  const fg = soft ? onGradient.text : (color ?? gradients.navy[0]);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        alignSelf: "flex-start",
        backgroundColor: soft ? onGradient.chip : (background ?? onGradient.text),
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <T variant="smallStrong" color={fg} weight="800" numberOfLines={1}>
        {title}
      </T>
      {iconRight ? <Icon name={iconRight} size={14} color={fg} /> : null}
    </Pressable>
  );
}
