import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type GradientName, type Tone } from "@/theme/palette";
import { Button, GradientCard, T, type IconName, type MIconName } from "@/ui/core";

/* ───────────────────────── Banner ───────────────────────── */

interface BannerProps {
  tone?: Tone;
  title?: string;
  message?: string;
  icon?: IconName;
  /** Extra content under the message (buttons, links) */
  children?: React.ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** An inline notice: info, success, warning or error */
export function Banner({ tone = "info", title, message, icon, children, onClose, style }: BannerProps) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  const fallbackIcon: Record<Tone, IconName> = { primary: "info", info: "info", success: "check-circle", warning: "alert-triangle", danger: "alert-circle", violet: "star", neutral: "info" };
  return (
    <View accessibilityRole={tone === "danger" ? "alert" : undefined} style={[{ flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: t.bg, borderWidth: 1, borderColor: `${t.solid}33` }, style]}>
      <Feather name={icon ?? fallbackIcon[tone]} size={17} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <T variant="bodyStrong" color={t.fg}>
            {title}
          </T>
        ) : null}
        {message ? (
          <T variant="small" color={t.fg} style={{ lineHeight: 18 }}>
            {message}
          </T>
        ) : null}
        {children ? <View style={{ marginTop: 6 }}>{children}</View> : null}
      </View>
      {onClose ? <Feather name="x" size={16} color={t.fg} onPress={onClose} accessibilityLabel="Dismiss" /> : null}
    </View>
  );
}

/* ───────────────────────── Empty / error / loading ───────────────────────── */

interface EmptyStateProps {
  icon?: IconName;
  mIcon?: MIconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: Tone;
  /** Less padding, for use inside a card */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** What a list, table or card shows when there is nothing in it */
export function EmptyState({ icon = "inbox", mIcon, title, message, actionLabel, onAction, tone = "primary", compact, style }: EmptyStateProps) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={[{ alignItems: "center", paddingVertical: compact ? 22 : 40, paddingHorizontal: 20, gap: 6 }, style]}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        {mIcon ? <MaterialCommunityIcons name={mIcon} size={28} color={t.fg} /> : <Feather name={icon} size={26} color={t.fg} />}
      </View>
      <T variant="title" center>
        {title}
      </T>
      {message ? (
        <T variant="small" color="muted" center style={{ maxWidth: 320 }}>
          {message}
        </T>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} size="sm" style={{ marginTop: 10, alignSelf: "center" }} /> : null}
    </View>
  );
}

/** What a screen shows when its data could not be loaded: the message and a Retry button */
export function ErrorState({ message, onRetry, title = "Could not load this", compact, style }: { message?: string; onRetry?: () => void; title?: string; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={[{ alignItems: "center", paddingVertical: compact ? 22 : 40, paddingHorizontal: 20, gap: 6 }, style]}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Feather name="wifi-off" size={24} color={c.dangerText} />
      </View>
      <T variant="title" center>
        {title}
      </T>
      {message ? (
        <T variant="small" color="muted" center style={{ maxWidth: 320 }}>
          {message}
        </T>
      ) : null}
      {onRetry ? <Button title="Retry" icon="refresh-cw" onPress={onRetry} size="sm" style={{ marginTop: 10, alignSelf: "center" }} /> : null}
    </View>
  );
}

export function LoadingView({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 }, style]}>
      <ActivityIndicator size="large" color={c.primary} />
      {label ? (
        <T variant="small" color="muted">
          {label}
        </T>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Skeletons ───────────────────────── */

/** A pulsing grey block that stands in for content while it loads */
export function Skeleton({ width = "100%", height = 14, rounded = 8, style }: { width?: DimensionValue; height?: DimensionValue; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true })])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: rounded, backgroundColor: c.skeleton, opacity: pulse }, style]} />;
}

/** A card-shaped skeleton: a row with an icon block and two lines */
export function SkeletonCard({ lines = 2, style }: { lines?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: 16, flexDirection: "row", gap: 12 }, style]}>
      <Skeleton width={40} height={40} rounded={12} />
      <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
        <Skeleton width="62%" height={13} />
        {Array.from({ length: Math.max(0, lines - 1) }, (_, i) => (
          <Skeleton key={i} width={i % 2 === 0 ? "92%" : "74%"} height={11} />
        ))}
      </View>
    </View>
  );
}

/** Several skeleton cards: the standard first-load state of a list screen */
export function SkeletonList({ count = 4, lines = 2, style }: { count?: number; lines?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityLabel="Loading" style={[{ gap: 12 }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}

/** A row of skeleton KPI tiles */
export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading" style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width="47%" height={92} rounded={16} style={{ flexGrow: 1 }} />
      ))}
    </View>
  );
}

/* ───────────────────────── Progress ───────────────────────── */

export function ProgressBar({ value, max = 100, tone = "primary", height = 8, color, style }: { value: number; max?: number; tone?: Tone; height?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={[{ height, borderRadius: height / 2, backgroundColor: c.surfaceAlt, overflow: "hidden" }, style]}>
      <View style={{ width: `${pct}%`, height: "100%", borderRadius: height / 2, backgroundColor: color ?? toneColors(c, tone).solid }} />
    </View>
  );
}

/* ───────────────────────── KPI tiles ───────────────────────── */

interface StatTileProps {
  label: string;
  value: string | number;
  /** A small line under the value */
  sub?: string;
  icon?: IconName;
  mIcon?: MIconName;
  gradient?: GradientName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A gradient KPI tile with white text: the app's number cards. Put them in <TileGrid>. */
export function StatTile({ label, value, sub, icon, mIcon, gradient = "blue", onPress, style }: StatTileProps) {
  return (
    <GradientCard gradient={gradient} padding={14} onPress={onPress} style={[{ minHeight: 92, justifyContent: "space-between" }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text numberOfLines={2} style={{ flex: 1, color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontWeight: "600" }}>
          {label}
        </Text>
        {icon || mIcon ? (
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            {mIcon ? <MaterialCommunityIcons name={mIcon} size={16} color="#ffffff" /> : <Feather name={icon ?? "circle"} size={15} color="#ffffff" />}
          </View>
        ) : null}
      </View>
      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {value}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: "500" }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </GradientCard>
  );
}

/** Lays children out in equal columns (2 by default) that wrap */
export function TileGrid({ children, columns = 2, gap = 12, style }: { children: React.ReactNode; columns?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap }}>
          {row.map((item, index) => (
            <View key={index} style={{ flex: 1 }}>
              {item}
            </View>
          ))}
          {row.length < columns ? Array.from({ length: columns - row.length }, (_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}
