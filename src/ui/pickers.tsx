import React, { useMemo, useState } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { DAY_SHORT, MONTH_NAMES, MONTH_SHORT, academyDateKey, academyMonthKey, formatDate, formatMonthKey, formatTime12, shiftMonthKey } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Button, IconButton, Row, T, type IconName } from "@/ui/core";
import { Field } from "@/ui/forms";
import { Sheet } from "@/ui/Sheet";

const pad2 = (n: number) => String(n).padStart(2, "0");

/* ───────────────────────── Month stepper ───────────────────────── */

interface MonthPickerProps {
  /** "YYYY-MM" */
  value: string;
  onChange: (monthKey: string) => void;
  /** Latest month that can be chosen ("YYYY-MM"); defaults to no limit */
  max?: string;
  min?: string;
  style?: StyleProp<ViewStyle>;
}

/** "‹  November 2026  ›": steps a month at a time; tapping the name opens a month grid */
export function MonthPicker({ value, onChange, max, min, style }: MonthPickerProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const prev = shiftMonthKey(value, -1);
  const next = shiftMonthKey(value, 1);
  const canPrev = !min || prev >= min;
  const canNext = !max || next <= max;

  return (
    <>
      <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, height: 44 }, style]}>
        <IconButton icon="chevron-left" accessibilityLabel="Previous month" disabled={!canPrev} onPress={() => onChange(prev)} />
        <Pressable
          onPress={() => {
            setYear(Number(value.slice(0, 4)));
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Month: ${formatMonthKey(value)}. Tap to choose another month`}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: "100%" }}
        >
          <Feather name="calendar" size={15} color={c.primary} />
          <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{formatMonthKey(value)}</Text>
        </Pressable>
        <IconButton icon="chevron-right" accessibilityLabel="Next month" disabled={!canNext} onPress={() => onChange(next)} />
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Choose a month">
        <Row justify="space-between">
          <IconButton icon="chevron-left" accessibilityLabel="Previous year" onPress={() => setYear((y) => y - 1)} disabled={!!min && `${year - 1}-12` < min} />
          <T variant="h2">{year}</T>
          <IconButton icon="chevron-right" accessibilityLabel="Next year" onPress={() => setYear((y) => y + 1)} disabled={!!max && `${year + 1}-01` > max} />
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MONTH_SHORT.map((name, index) => {
            const key = `${year}-${pad2(index + 1)}`;
            const disabled = (!!max && key > max) || (!!min && key < min);
            const active = key === value;
            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => {
                  onChange(key);
                  setOpen(false);
                }}
                style={{ width: "31%", flexGrow: 1, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.primary : c.surfaceAlt, opacity: disabled ? 0.35 : 1 }}
              >
                <Text style={{ color: active ? "#ffffff" : c.text, fontWeight: "700", fontSize: 13.5 }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="This month"
          variant="secondary"
          block
          onPress={() => {
            onChange(academyMonthKey());
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

/* ───────────────────────── Calendar ───────────────────────── */

interface CalendarProps {
  /** Selected day, "YYYY-MM-DD" */
  value?: string | null;
  onSelect: (dateKey: string) => void;
  min?: string;
  max?: string;
  /** Days to mark with a dot: dateKey -> colour */
  marks?: Record<string, string>;
  /** The month on show ("YYYY-MM"); controlled when given together with onMonthChange */
  month?: string;
  onMonthChange?: (monthKey: string) => void;
}

/** A month grid. Used inside DateField and on its own for calendar views. */
export function Calendar({ value, onSelect, min, max, marks, month, onMonthChange }: CalendarProps) {
  const { c } = useTheme();
  const today = academyDateKey();
  const [innerMonth, setInnerMonth] = useState(() => (value || today).slice(0, 7));
  const shown = month ?? innerMonth;
  const setShown = (next: string) => {
    setInnerMonth(next);
    onMonthChange?.(next);
  };

  const cells = useMemo(() => {
    const [y, m] = shown.split("-").map(Number);
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const list: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) list.push(null);
    for (let d = 1; d <= days; d++) list.push(`${shown}-${pad2(d)}`);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [shown]);

  const [year, monthNumber] = shown.split("-").map(Number);

  return (
    <View style={{ gap: 8 }}>
      <Row justify="space-between">
        <IconButton icon="chevron-left" accessibilityLabel="Previous month" onPress={() => setShown(shiftMonthKey(shown, -1))} disabled={!!min && shiftMonthKey(shown, -1) < min.slice(0, 7)} />
        <T variant="title">
          {MONTH_NAMES[monthNumber - 1]} {year}
        </T>
        <IconButton icon="chevron-right" accessibilityLabel="Next month" onPress={() => setShown(shiftMonthKey(shown, 1))} disabled={!!max && shiftMonthKey(shown, 1) > max.slice(0, 7)} />
      </Row>
      <View style={{ flexDirection: "row" }}>
        {DAY_SHORT.map((name) => (
          <View key={name} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
            <T variant="caption" color="faint">
              {name}
            </T>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((key, index) => {
          if (!key) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const disabled = (!!min && key < min) || (!!max && key > max);
          const active = key === value;
          const isToday = key === today;
          const mark = marks?.[key];
          return (
            <Pressable key={key} disabled={disabled} onPress={() => onSelect(key)} accessibilityRole="button" accessibilityLabel={formatDate(key, "long")} style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.primary : "transparent", borderWidth: isToday && !active ? 1.5 : 0, borderColor: c.primary, opacity: disabled ? 0.3 : 1 }}>
                <Text style={{ color: active ? "#ffffff" : c.text, fontSize: 13.5, fontWeight: active || isToday ? "800" : "500" }}>{Number(key.slice(8))}</Text>
              </View>
              {mark ? <View style={{ position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: active ? "#ffffff" : mark }} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ───────────────────────── Date field ───────────────────────── */

interface PickerFieldBase {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

function PickerBox({ text, placeholder, icon, onPress, disabled, error }: { text: string; placeholder: string; icon: IconName; onPress: () => void; disabled?: boolean; error?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.borderStrong, backgroundColor: disabled ? c.surfaceAlt : c.inputBg, opacity: disabled ? 0.7 : 1 }}
    >
      <Feather name={icon} size={16} color={c.textFaint} />
      <Text numberOfLines={1} style={{ flex: 1, color: text ? c.text : c.placeholder, fontSize: 14 }}>
        {text || placeholder}
      </Text>
      <Feather name="chevron-down" size={16} color={c.textFaint} />
    </Pressable>
  );
}

interface DateFieldProps extends PickerFieldBase {
  /** "YYYY-MM-DD", or "" when nothing is chosen */
  value: string;
  onChange: (dateKey: string) => void;
  min?: string;
  max?: string;
  /** Show a "Clear" button in the sheet */
  clearable?: boolean;
}

/** A date input: shows "Thu, 5 Nov 2026" and opens a calendar */
export function DateField({ label, required, hint, error, value, onChange, min, max, placeholder = "Choose a date", disabled, clearable, containerStyle }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} required={required} hint={hint} error={error} style={containerStyle}>
      <PickerBox text={value ? formatDate(value, "weekday") : ""} placeholder={placeholder} icon="calendar" onPress={() => setOpen(true)} disabled={disabled} error={error} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? "Choose a date"}
        footer={
          <Row>
            {clearable && value ? (
              <Button
                title="Clear"
                variant="secondary"
                style={{ flex: 1 }}
                block
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
              />
            ) : null}
            <Button
              title="Today"
              variant="outline"
              style={{ flex: 1 }}
              block
              disabled={(!!min && academyDateKey() < min) || (!!max && academyDateKey() > max)}
              onPress={() => {
                onChange(academyDateKey());
                setOpen(false);
              }}
            />
          </Row>
        }
      >
        <Calendar
          value={value || null}
          min={min}
          max={max}
          onSelect={(key) => {
            onChange(key);
            setOpen(false);
          }}
        />
      </Sheet>
    </Field>
  );
}

/* ───────────────────────── Time field ───────────────────────── */

interface TimeFieldProps extends PickerFieldBase {
  /** 24-hour "HH:MM", or "" when nothing is chosen */
  value: string;
  onChange: (time: string) => void;
  /** Minute choices step; default 5 */
  minuteStep?: number;
}

/** A time input: shows "2:30 PM" and opens hour / minute / AM-PM pickers. Reports 24-hour "HH:MM". */
export function TimeField({ label, required, hint, error, value, onChange, placeholder = "Choose a time", disabled, minuteStep = 5, containerStyle }: TimeFieldProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  const initialHour24 = parsed ? Number(parsed[1]) : 9;
  const initialMinute = parsed ? Number(parsed[2]) : 0;
  const [hour12, setHour12] = useState(initialHour24 % 12 === 0 ? 12 : initialHour24 % 12);
  const [minute, setMinute] = useState(initialMinute);
  const [pm, setPm] = useState(initialHour24 >= 12);

  const openSheet = () => {
    setHour12(initialHour24 % 12 === 0 ? 12 : initialHour24 % 12);
    setMinute(initialMinute);
    setPm(initialHour24 >= 12);
    setOpen(true);
  };

  const minutes = useMemo(() => {
    const list: number[] = [];
    for (let m = 0; m < 60; m += Math.max(1, minuteStep)) list.push(m);
    if (!list.includes(initialMinute)) list.push(initialMinute);
    return list.sort((a, b) => a - b);
  }, [minuteStep, initialMinute]);

  const cell = (active: boolean): ViewStyle => ({ width: "15%", flexGrow: 1, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.primary : c.surfaceAlt });
  const preview = `${hour12}:${pad2(minute)} ${pm ? "PM" : "AM"}`;

  return (
    <Field label={label} required={required} hint={hint} error={error} style={containerStyle}>
      <PickerBox text={value ? formatTime12(value) : ""} placeholder={placeholder} icon="clock" onPress={openSheet} disabled={disabled} error={error} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? "Choose a time"}
        subtitle={preview}
        footer={
          <Button
            title={`Set ${preview}`}
            block
            onPress={() => {
              const hour24 = (hour12 % 12) + (pm ? 12 : 0);
              onChange(`${pad2(hour24)}:${pad2(minute)}`);
              setOpen(false);
            }}
          />
        }
      >
        <T variant="label" color="faint">
          Hour
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Pressable key={h} onPress={() => setHour12(h)} style={cell(h === hour12)}>
              <Text style={{ color: h === hour12 ? "#ffffff" : c.text, fontWeight: "700" }}>{h}</Text>
            </Pressable>
          ))}
        </View>
        <T variant="label" color="faint">
          Minute
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {minutes.map((m) => (
            <Pressable key={m} onPress={() => setMinute(m)} style={cell(m === minute)}>
              <Text style={{ color: m === minute ? "#ffffff" : c.text, fontWeight: "700" }}>{pad2(m)}</Text>
            </Pressable>
          ))}
        </View>
        <Row>
          {[false, true].map((isPm) => (
            <Pressable key={String(isPm)} onPress={() => setPm(isPm)} style={[cell(pm === isPm), { width: "48%" }]}>
              <Text style={{ color: pm === isPm ? "#ffffff" : c.text, fontWeight: "700" }}>{isPm ? "PM" : "AM"}</Text>
            </Pressable>
          ))}
        </Row>
      </Sheet>
    </Field>
  );
}
