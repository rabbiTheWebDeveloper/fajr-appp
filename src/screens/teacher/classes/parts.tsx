import React, { useRef } from "react";
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { academyMonthKey } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Badge, Button, Icon, MonthPicker, Row, T, toast, type IconName } from "@/ui";

import { CLASS_TYPE_LABELS, classTypeTone } from "@/screens/teacher/classes/types";

/** Present / Absent / Not Marked pill of a finished class */
export function AttendanceBadge({ status }: { status?: string }) {
  if (status === "present") return <Badge label="Present" tone="success" icon="user-check" />;
  if (status === "absent") return <Badge label="Absent" tone="danger" icon="user-x" />;
  return <Badge label="Not Marked" tone="neutral" icon="clipboard" />;
}

/** Regular / Retake / Make-up pill */
export function ClassTypeBadge({ type }: { type?: string | null }) {
  return <Badge label={CLASS_TYPE_LABELS[type || "regular"] || String(type)} tone={classTypeTone(type)} />;
}

interface ActionButtonProps {
  title: string;
  icon?: IconName;
  /** Background colour; the text is white unless `fg` is given */
  bg: string;
  fg?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A compact class-action button in any semantic colour (the kit's Button has no amber / sky variants) */
export function ActionButton({ title, icon, bg, fg = "#ffffff", onPress, loading, disabled, style }: ActionButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        { height: 40, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text numberOfLines={1} style={{ color: fg, fontSize: 12.5, fontWeight: "700" }}>
        {title}
      </Text>
    </Pressable>
  );
}

/** The month filter of the page: a month stepper with "Clear" (all months), as the website's month input */
export function MonthFilter({ value, onChange }: { value: string; onChange: (monthKey: string) => void }) {
  const { c } = useTheme();
  return (
    <Row gap={8} accessibilityLabel="Month filter">
      {value ? (
        <>
          <MonthPicker value={value} onChange={onChange} style={{ flex: 1 }} />
          <Button title="Clear" variant="dangerSoft" size="sm" onPress={() => onChange("")} style={{ height: 44 }} />
        </>
      ) : (
        <>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Icon name="calendar" size={15} color={c.textFaint} />
            <T variant="bodyStrong" color="muted">
              All months
            </T>
          </View>
          <Button title="This month" variant="secondary" size="sm" onPress={() => onChange(academyMonthKey())} style={{ height: 44 }} />
        </>
      )}
    </Row>
  );
}

/**
 * A toast for an action that also closes a bottom sheet. An open sheet carries its own toast host, which
 * goes away with the sheet, so the message waits until the sheet has slid off and the page shows it.
 */
export function toastAfterSheet(kind: "success" | "info" | "error", message: string): void {
  setTimeout(() => toast[kind](message), 320);
}

/** Remembers the last non-null value, so a sheet keeps its content while it slides away */
export function useLast<V>(value: V | null): V | null {
  const last = useRef<V | null>(value);
  if (value !== null) last.current = value;
  return last.current;
}
