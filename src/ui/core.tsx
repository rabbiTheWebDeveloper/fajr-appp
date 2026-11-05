import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme/ThemeContext";
import { gradients, radius, toneColors, type GradientName, type Palette, type Tone } from "@/theme/palette";

/* ───────────────────────── Icons ───────────────────────── */

export type IconName = React.ComponentProps<typeof Feather>["name"];
export type MIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Feather icons (the closest family to the website's lucide icons). `color` defaults to the body text colour. */
export function Icon({ name, size = 18, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Feather name={name} size={size} color={color ?? c.text} style={style} />;
}

/** Material Community icons, for the few glyphs Feather lacks (crown, trophy, mosque, whatsapp, diamond…) */
export function MIcon({ name, size = 18, color, style }: { name: MIconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? c.text} style={style} />;
}

/* ───────────────────────── Text ───────────────────────── */

type Variant = "h1" | "h2" | "title" | "body" | "bodyStrong" | "small" | "smallStrong" | "caption" | "label" | "mono";
type ColorName = "text" | "muted" | "faint" | "primary" | "success" | "warning" | "danger" | "info" | "violet" | "onDark" | "onDarkMuted" | "gold";

const VARIANTS: Record<Variant, TextStyle> = {
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4 },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: "700", letterSpacing: -0.2 },
  title: { fontSize: 15.5, lineHeight: 21, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  small: { fontSize: 12.5, lineHeight: 17, fontWeight: "400" },
  smallStrong: { fontSize: 12.5, lineHeight: 17, fontWeight: "600" },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "500" },
  label: { fontSize: 10.5, lineHeight: 14, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  mono: { fontSize: 12.5, lineHeight: 17, fontWeight: "600", fontFamily: "monospace" },
};

function resolveColor(c: Palette, color: ColorName | (string & {}) | undefined): string {
  switch (color) {
    case undefined:
    case "text":
      return c.text;
    case "muted":
      return c.textMuted;
    case "faint":
      return c.textFaint;
    case "primary":
      return c.primaryText;
    case "success":
      return c.successText;
    case "warning":
      return c.warningText;
    case "danger":
      return c.dangerText;
    case "info":
      return c.infoText;
    case "violet":
      return c.violetText;
    case "onDark":
      return c.onDark;
    case "onDarkMuted":
      return c.onDarkMuted;
    case "gold":
      return c.gold;
    default:
      return color;
  }
}

export interface TProps extends TextProps {
  variant?: Variant;
  /** A named theme colour, or any colour string */
  color?: ColorName | (string & {});
  center?: boolean;
  weight?: TextStyle["fontWeight"];
}

/** Themed text. Always use this instead of the bare <Text> so dark mode works. */
export function T({ variant = "body", color, center, weight, style, ...rest }: TProps) {
  const { c } = useTheme();
  return <Text {...rest} style={[VARIANTS[variant], { color: resolveColor(c, color) }, center && { textAlign: "center" }, weight ? { fontWeight: weight } : null, style]} />;
}

/* ───────────────────────── Layout ───────────────────────── */

interface RowProps {
  children?: React.ReactNode;
  gap?: number;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Row({ children, gap = 8, align = "center", justify, wrap, style, accessibilityLabel }: RowProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row", alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>
      {children}
    </View>
  );
}

export function Col({ children, gap = 8, style }: { children?: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.border, marginLeft: inset }, style]} />;
}

export function Spacer({ size = 12 }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}

/* ───────────────────────── Card ───────────────────────── */

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding; default 16. Pass 0 for edge-to-edge content such as lists. */
  padding?: number;
  onPress?: () => void;
  /** Tints the card (e.g. a warning card) */
  tone?: Tone;
}

/** The standard white (dark: slate) rounded surface */
export function Card({ children, style, padding = 16, onPress, tone }: CardProps) {
  const { c, isDark } = useTheme();
  const toned = tone ? toneColors(c, tone) : null;
  const base: ViewStyle = {
    backgroundColor: toned ? toned.bg : c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: toned ? "transparent" : c.border,
    padding,
    ...(isDark || toned ? null : { shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} android_ripple={{ color: c.border }} style={({ pressed }) => [base, pressed && { opacity: 0.92 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** A card with a brand gradient background and white text inside (hero cards, KPI tiles) */
export function GradientCard({ gradient = "blue", children, style, padding = 16, onPress }: { gradient?: GradientName | readonly [string, string]; children?: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number; onPress?: () => void }) {
  const colors = typeof gradient === "string" ? gradients[gradient] : gradient;
  const body = (
    <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius.lg, padding, overflow: "hidden" }, style]}>
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}>
      {body}
    </Pressable>
  );
}

/** Section heading above a card or list, with an optional action on the right */
export function SectionHeader({ title, subtitle, action, icon, style }: { title: string; subtitle?: string; action?: React.ReactNode; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Row justify="space-between" align="center" style={[{ marginBottom: 2 }, style]}>
      <Row gap={8} style={{ flex: 1 }}>
        {icon ? <Icon name={icon} size={16} color={c.primary} /> : null}
        <View style={{ flex: 1 }}>
          <T variant="title">{title}</T>
          {subtitle ? (
            <T variant="small" color="muted">
              {subtitle}
            </T>
          ) : null}
        </View>
      </Row>
      {action}
    </Row>
  );
}

/* ───────────────────────── Buttons ───────────────────────── */

type ButtonVariant = "primary" | "navy" | "secondary" | "outline" | "ghost" | "danger" | "dangerSoft" | "success" | "gold";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the full width of the parent */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ title, onPress, variant = "primary", size = "md", icon, iconRight, loading, disabled, block, style, accessibilityLabel }: ButtonProps) {
  const { c } = useTheme();
  const look: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: "#ffffff" },
    navy: { bg: c.navy, fg: "#ffffff" },
    secondary: { bg: c.surfaceAlt, fg: c.text },
    outline: { bg: "transparent", fg: c.primaryText, border: c.borderStrong },
    ghost: { bg: "transparent", fg: c.primaryText },
    danger: { bg: c.danger, fg: "#ffffff" },
    dangerSoft: { bg: c.dangerSoft, fg: c.dangerText },
    success: { bg: c.success, fg: "#ffffff" },
    gold: { bg: c.gold, fg: c.navy },
  };
  const dims = { sm: { h: 34, px: 12, font: 12.5, icon: 14 }, md: { h: 44, px: 16, font: 14, icon: 16 }, lg: { h: 50, px: 20, font: 15, icon: 18 } }[size];
  const { bg, fg, border } = look[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      android_ripple={inactive ? undefined : { color: "rgba(255,255,255,0.18)" }}
      style={({ pressed }) => [
        {
          height: dims.h,
          paddingHorizontal: dims.px,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: border ? 1 : 0,
          borderColor: border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          overflow: "hidden",
          alignSelf: block ? "stretch" : "flex-start",
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Feather name={icon} size={dims.icon} color={fg} /> : null}
      <Text numberOfLines={1} style={{ color: fg, fontSize: dims.font, fontWeight: "700" }}>
        {title}
      </Text>
      {iconRight && !loading ? <Feather name={iconRight} size={dims.icon} color={fg} /> : null}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Background behind the icon; omit for a bare icon */
  background?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, size = 38, color, background, disabled, accessibilityLabel, style }: IconButtonProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}
    >
      <Feather name={icon} size={Math.round(size * 0.5)} color={color ?? c.textMuted} />
    </Pressable>
  );
}

/* ───────────────────────── Badges & chips ───────────────────────── */

export function Badge({ label, tone = "neutral", icon, solid, style }: { label: string; tone?: Tone; icon?: IconName; solid?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  const fg = solid ? "#ffffff" : t.fg;
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: solid ? t.solid : t.bg }, style]}>
      {icon ? <Feather name={icon} size={11} color={fg} /> : null}
      <Text numberOfLines={1} style={{ color: fg, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

/** A tappable filter pill */
export function Chip({ label, selected, onPress, icon, count, style }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; count?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const fg = selected ? "#ffffff" : c.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: selected ? c.primary : c.surface, borderWidth: 1, borderColor: selected ? c.primary : c.border }, style]}
    >
      {icon ? <Feather name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12.5, fontWeight: "600" }}>{label}</Text>
      {typeof count === "number" ? (
        <View style={{ minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "rgba(255,255,255,0.25)" : c.surfaceAlt }}>
          <Text style={{ color: fg, fontSize: 10.5, fontWeight: "700" }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** An icon inside a soft tinted rounded square, as used at the start of list rows and stat cards */
export function IconChip({ icon, tone = "primary", size = 38, mIcon }: { icon?: IconName; mIcon?: MIconName; tone?: Tone; size?: number }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
      {mIcon ? <MaterialCommunityIcons name={mIcon} size={Math.round(size * 0.5)} color={t.fg} /> : <Feather name={icon ?? "circle"} size={Math.round(size * 0.47)} color={t.fg} />}
    </View>
  );
}

/* ───────────────────────── Avatar ───────────────────────── */

export function initialsOf(name?: string | null, fallback = "FA"): string {
  if (!name || !name.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** A round (or rounded-square) profile picture that falls back to initials when there is no image or it fails to load */
export function Avatar({ uri, name, size = 40, square, style }: { uri?: string | null; name?: string | null; size?: number; square?: boolean; style?: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = React.useState(false);
  const { c } = useTheme();
  const borderRadius = square ? Math.round(size * 0.3) : size / 2;

  React.useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return <Image source={{ uri }} onError={() => setFailed(true)} style={[{ width: size, height: size, borderRadius, backgroundColor: c.surfaceAlt }, style]} />;
  }
  return (
    <LinearGradient colors={[gradients.navy[0], gradients.navy[1]]} style={[{ width: size, height: size, borderRadius, alignItems: "center", justifyContent: "center" }, style as StyleProp<ViewStyle>]}>
      <Text style={{ color: c.gold, fontWeight: "800", fontSize: Math.round(size * 0.36) }}>{initialsOf(name)}</Text>
    </LinearGradient>
  );
}

/* ───────────────────────── Rows ───────────────────────── */

/** "Label ........ value" line used in detail cards */
export function KeyValue({ label, value, valueColor, mono, style }: { label: string; value: React.ReactNode; valueColor?: TProps["color"]; mono?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Row justify="space-between" align="flex-start" gap={12} style={[{ paddingVertical: 7 }, style]}>
      <T variant="small" color="muted" style={{ flexShrink: 0, maxWidth: "45%" }}>
        {label}
      </T>
      {typeof value === "string" || typeof value === "number" ? (
        <T variant={mono ? "mono" : "smallStrong"} color={valueColor} style={{ flex: 1, textAlign: "right" }} selectable>
          {value}
        </T>
      ) : (
        <View style={{ flex: 1, alignItems: "flex-end" }}>{value}</View>
      )}
    </Row>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  /** Show a chevron on the right (default when onPress is set and no `right` is given) */
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
  titleLines?: number;
  subtitleLines?: number;
}

/** A tappable list row: leading visual, title + subtitle, trailing content */
export function ListItem({ title, subtitle, left, right, onPress, chevron, style, titleLines = 1, subtitleLines = 2 }: ListItemProps) {
  const { c } = useTheme();
  const showChevron = chevron ?? (!!onPress && !right);
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyStrong" numberOfLines={titleLines}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" color="muted" numberOfLines={subtitleLines}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
      {showChevron ? <Feather name="chevron-right" size={18} color={c.textFaint} /> : null}
    </>
  );
  const base: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 };
  if (!onPress) return <View style={[base, style]}>{body}</View>;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: c.border }} style={[base, style]}>
      {body}
    </Pressable>
  );
}
