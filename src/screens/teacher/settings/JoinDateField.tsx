import React, { useState } from "react";
import { Pressable } from "react-native";

import { academyDateKey, formatDate, shiftMonthKey } from "@/lib/format";
import { radius } from "@/theme/palette";
import { useTheme } from "@/theme/ThemeContext";
import { Calendar, Field, Icon, IconButton, Row, Sheet, T } from "@/ui";

interface JoinDateFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** "YYYY-MM-DD", or "" when no date is set */
  value: string;
  onChange: (dateKey: string) => void;
}

/**
 * The joining-date picker. A joining date is often years back, so on top of the kit's month calendar
 * this sheet has a year stepper (the plain date field would need a tap for every month).
 */
export function JoinDateField({ label, required, hint, value, onChange }: JoinDateFieldProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || academyDateKey()).slice(0, 7));

  return (
    <Field label={label} required={required} hint={hint}>
      <Pressable
        onPress={() => {
          setMonth((value || academyDateKey()).slice(0, 7));
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value, "long") : "not set"}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.inputBg }}
      >
        <Icon name="calendar" size={16} color={c.textFaint} />
        <T color={value ? "text" : c.placeholder} style={{ flex: 1 }} numberOfLines={1}>
          {value ? formatDate(value, "weekday") : "Choose a date"}
        </T>
        <Icon name="chevron-down" size={16} color={c.textFaint} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Joining Date">
        <Row justify="space-between">
          <IconButton icon="chevrons-left" accessibilityLabel="Previous year" onPress={() => setMonth((m) => shiftMonthKey(m, -12))} />
          <T variant="bodyStrong" color="muted">
            Year {month.slice(0, 4)}
          </T>
          <IconButton icon="chevrons-right" accessibilityLabel="Next year" onPress={() => setMonth((m) => shiftMonthKey(m, 12))} />
        </Row>
        <Calendar
          value={value || null}
          month={month}
          onMonthChange={setMonth}
          onSelect={(key) => {
            onChange(key);
            setOpen(false);
          }}
        />
      </Sheet>
    </Field>
  );
}
