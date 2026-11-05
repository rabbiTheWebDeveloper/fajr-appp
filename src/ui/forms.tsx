import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Button, Row, T, type IconName } from "@/ui/core";
import { Sheet } from "@/ui/Sheet";

/* ───────────────────────── Field wrapper ───────────────────────── */

interface FieldProps {
  label?: string;
  required?: boolean;
  /** Help text under the field */
  hint?: string;
  /** Error text under the field (also paints the border red) */
  error?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, required, hint, error, children, style }: FieldProps) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <T variant="smallStrong" color="muted">
          {label}
          {required ? <T variant="smallStrong" color="danger">{" *"}</T> : null}
        </T>
      ) : null}
      {children}
      {error ? (
        <T variant="caption" color="danger">
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color="faint">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Text input ───────────────────────── */

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  icon?: IconName;
  /** Password field with a show/hide eye */
  secure?: boolean;
  /** Something on the right inside the box (a unit, a button) */
  right?: React.ReactNode;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, required, hint, error, icon, secure, right, disabled, containerStyle, multiline, ...rest }: InputProps) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <Field label={label} required={required} hint={hint} error={error} style={containerStyle}>
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          minHeight: 46,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? c.danger : focused ? c.primary : c.borderStrong,
          backgroundColor: disabled ? c.surfaceAlt : c.inputBg,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {icon ? <Feather name={icon} size={16} color={c.textFaint} style={multiline ? { marginTop: 3 } : undefined} /> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          editable={!disabled && rest.editable !== false}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={c.placeholder}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{ flex: 1, color: c.text, fontSize: 14, paddingVertical: multiline ? 0 : 10, minHeight: multiline ? 84 : undefined, textAlignVertical: multiline ? "top" : "center" }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? "Show password" : "Hide password"}>
            <Feather name={hidden ? "eye" : "eye-off"} size={17} color={c.textFaint} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </Field>
  );
}

/** Search box with a clear button */
export function SearchBar({ value, onChangeText, placeholder = "Search", style, onSubmit }: { value: string; onChangeText: (text: string) => void; placeholder?: string; style?: StyleProp<ViewStyle>; onSubmit?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, style]}>
      <Feather name="search" size={16} color={c.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, color: c.text, fontSize: 14, paddingVertical: 8 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Feather name="x-circle" size={16} color={c.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Select ───────────────────────── */

export interface Option<V extends string | number = string> {
  value: V;
  label: string;
  /** A second, smaller line under the label */
  description?: string;
  disabled?: boolean;
}

interface SelectProps<V extends string | number> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  value: V | null | undefined;
  options: Option<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  /** Title of the picker sheet; defaults to the label */
  title?: string;
  icon?: IconName;
  disabled?: boolean;
  /** Show a search box in the sheet (on by default above 8 options) */
  searchable?: boolean;
  /** Offer a "clear" choice that reports this value */
  clearValue?: V;
  containerStyle?: StyleProp<ViewStyle>;
  /** Compact pill style for filter bars */
  compact?: boolean;
}

/** A dropdown: shows the chosen label and opens a sheet with the options */
export function Select<V extends string | number = string>({ label, required, hint, error, value, options, onChange, placeholder = "Select…", title, icon, disabled, searchable, clearValue, containerStyle, compact }: SelectProps<V>) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const canSearch = searchable ?? options.length > 8;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Field label={label} required={required} hint={hint} error={error} style={containerStyle}>
      <Pressable
        onPress={disabled ? undefined : () => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? title ?? "Select"}: ${selected?.label ?? placeholder}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: compact ? 36 : 46,
          paddingHorizontal: 12,
          borderRadius: compact ? radius.pill : radius.md,
          borderWidth: 1,
          borderColor: error ? c.danger : compact ? c.border : c.borderStrong,
          backgroundColor: disabled ? c.surfaceAlt : compact ? c.surface : c.inputBg,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {icon ? <Feather name={icon} size={compact ? 14 : 16} color={c.textFaint} /> : null}
        <Text numberOfLines={1} style={{ flex: 1, color: selected ? c.text : c.placeholder, fontSize: compact ? 12.5 : 14, fontWeight: compact ? "600" : "400" }}>
          {selected?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={compact ? 14 : 16} color={c.textFaint} />
      </Pressable>

      <Sheet visible={open} onClose={close} title={title ?? label ?? "Select"} scroll={false}>
        {canSearch ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
            <SearchBar value={query} onChangeText={setQuery} />
          </View>
        ) : null}
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.value)}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 440 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListHeaderComponent={
            clearValue !== undefined && value !== clearValue && value !== null && value !== undefined ? (
              <Pressable
                onPress={() => {
                  onChange(clearValue);
                  close();
                }}
                style={{ paddingHorizontal: 18, paddingVertical: 12 }}
              >
                <T variant="bodyStrong" color="danger">
                  Clear selection
                </T>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            <T color="muted" center style={{ padding: 24 }}>
              Nothing matches.
            </T>
          }
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={
                  item.disabled
                    ? undefined
                    : () => {
                        onChange(item.value);
                        close();
                      }
                }
                android_ripple={{ color: c.border }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: active ? c.primarySoft : "transparent", opacity: item.disabled ? 0.45 : 1 }}
              >
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong" color={active ? "primary" : "text"}>
                    {item.label}
                  </T>
                  {item.description ? (
                    <T variant="small" color="muted">
                      {item.description}
                    </T>
                  ) : null}
                </View>
                {active ? <Feather name="check" size={18} color={c.primary} /> : null}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </Field>
  );
}

/* ───────────────────────── Segmented control & tabs ───────────────────────── */

interface SegmentedProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; icon?: IconName; count?: number }[];
  style?: StyleProp<ViewStyle>;
}

/** Equal-width tabs in one rounded track: for 2–4 choices (page tabs, Light/Dark/Auto…) */
export function Segmented<V extends string>({ value, onChange, options, style }: SegmentedProps<V>) {
  const { c, isDark } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[{ flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const fg = active ? (isDark ? c.gold : c.navy) : c.textMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 38,
              paddingHorizontal: 6,
              borderRadius: radius.sm + 2,
              backgroundColor: active ? (isDark ? c.navy : c.surface) : "transparent",
              ...(active && !isDark ? { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            {option.icon ? <Feather name={option.icon} size={14} color={fg} /> : null}
            <Text numberOfLines={1} style={{ color: fg, fontSize: 12.5, fontWeight: "700" }}>
              {option.label}
            </Text>
            {typeof option.count === "number" ? <Text style={{ color: fg, fontSize: 11, fontWeight: "700", opacity: 0.7 }}>{option.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Checkbox & toggle ───────────────────────── */

export function Checkbox({ checked, onChange, label, description, disabled, style }: { checked: boolean; onChange: (next: boolean) => void; label?: string; description?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      style={[{ flexDirection: "row", alignItems: "flex-start", gap: 10, opacity: disabled ? 0.5 : 1, paddingVertical: 4 }, style]}
    >
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? c.primary : c.borderStrong, backgroundColor: checked ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
        {checked ? <Feather name="check" size={14} color="#ffffff" /> : null}
      </View>
      {label ? (
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{label}</T>
          {description ? (
            <T variant="small" color="muted">
              {description}
            </T>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/** A labelled on/off switch row */
export function Toggle({ value, onChange, label, description, disabled, style }: { value: boolean; onChange: (next: boolean) => void; label: string; description?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Row justify="space-between" gap={12} style={[{ paddingVertical: 6 }, style]}>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {description ? (
          <T variant="small" color="muted">
            {description}
          </T>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ false: c.borderStrong, true: c.primary }} thumbColor="#ffffff" />
    </Row>
  );
}

/* ───────────────────────── Star rating ───────────────────────── */

export function StarRating({ value, onChange, size = 30, max = 5, readOnly }: { value: number; onChange?: (next: number) => void; size?: number; max?: number; readOnly?: boolean }) {
  const { c } = useTheme();
  return (
    <Row gap={6}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <Pressable key={star} disabled={readOnly || !onChange} onPress={() => onChange?.(star)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}>
          <Feather name="star" size={size} color={star <= value ? c.warning : c.borderStrong} style={star <= value ? { opacity: 1 } : { opacity: 0.9 }} />
        </Pressable>
      ))}
    </Row>
  );
}

/* ───────────────────────── Pagination ───────────────────────── */

/** "‹ Page 2 of 7 ›" under a list */
export function Pagination({ page, totalPages, onChange, total, style }: { page: number; totalPages: number; onChange: (page: number) => void; total?: number; style?: StyleProp<ViewStyle> }) {
  if (totalPages <= 1) return null;
  return (
    <Row justify="space-between" style={style}>
      <Button title="Previous" icon="chevron-left" variant="secondary" size="sm" disabled={page <= 1} onPress={() => onChange(page - 1)} />
      <T variant="smallStrong" color="muted">
        Page {page} of {totalPages}
        {typeof total === "number" ? ` · ${total} total` : ""}
      </T>
      <Button title="Next" iconRight="chevron-right" variant="secondary" size="sm" disabled={page >= totalPages} onPress={() => onChange(page + 1)} />
    </Row>
  );
}
