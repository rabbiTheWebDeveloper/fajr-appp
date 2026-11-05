import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { DAY_SHORT, academyDateKey, formatTime12 } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { Avatar, Badge, Card, IconButton, Row, T } from "@/ui";
import { AttBadge, StatusBadge, avatarUri } from "@/screens/teacher/monthly/parts";
import { sessionDateKey, sessionDotColor, weekdayDateLabel, type Session } from "@/screens/teacher/monthly/utils";

interface MonthCalendarProps {
  /** Every class of the month (not narrowed by the status / attendance / search filters) */
  sessions: Session[];
  /** "YYYY-MM" */
  month: string;
  /** The date filter in force, "YYYY-MM-DD" or "" */
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  loading: boolean;
  onOpenSession: (sessionId: string) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * The month grid: each day shows up to four status dots and its class count. Tapping a day opens its
 * classes underneath and sets (or, on a second tap, clears) the date filter for the whole report.
 */
export function MonthCalendar({ sessions, month, selectedDate, onSelectDate, loading, onOpenSession }: MonthCalendarProps) {
  const { c } = useTheme();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const today = academyDateKey();

  // The open day belongs to the month on show
  useEffect(() => setActiveDay(null), [month]);

  const { weeks, byDay } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      const key = sessionDateKey(s);
      // The server pads the month range by a few hours each side, so drop the neighbours' classes
      if (!key.startsWith(month)) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }

    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${pad2(d)}`);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return { weeks: rows, byDay: map };
  }, [sessions, month]);

  const daySessions = activeDay ? (byDay[activeDay] ?? []) : [];
  const hair = StyleSheet.hairlineWidth * 2;

  const legend = [
    { color: c.success, label: "Present" },
    { color: c.danger, label: "Absent" },
    { color: c.warning, label: "Not Marked" },
    { color: c.info, label: "In Progress" },
    { color: c.violet, label: "Scheduled" },
  ];

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <View style={{ flexDirection: "row", borderBottomWidth: hair, borderBottomColor: c.border }}>
        {DAY_SHORT.map((name) => (
          <View key={name} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
            <T variant="label" color="faint" style={{ letterSpacing: 0.4 }}>
              {name}
            </T>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={{ flexDirection: "row" }}>
          {week.map((dateKey, dayIndex) => {
            if (!dateKey) {
              return <View key={`blank-${dayIndex}`} style={{ flex: 1, minHeight: 66, backgroundColor: c.surfaceAlt, opacity: 0.5, borderBottomWidth: hair, borderRightWidth: hair, borderColor: c.border }} />;
            }
            const items = byDay[dateKey] ?? [];
            const isToday = dateKey === today;
            const isFilter = selectedDate === dateKey;
            const isOpen = activeDay === dateKey;
            const day = Number(dateKey.slice(8));
            return (
              <Pressable
                key={dateKey}
                onPress={() => {
                  setActiveDay(isOpen ? null : dateKey);
                  onSelectDate(isFilter ? "" : dateKey);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${weekdayDateLabel(dateKey)}, ${items.length} ${items.length === 1 ? "class" : "classes"}`}
                accessibilityState={{ selected: isFilter || isOpen }}
                style={{
                  flex: 1,
                  minHeight: 66,
                  paddingVertical: 5,
                  paddingHorizontal: 1,
                  alignItems: "center",
                  backgroundColor: isFilter || isOpen ? c.primarySoft : "transparent",
                  borderBottomWidth: hair,
                  borderRightWidth: hair,
                  borderColor: c.border,
                }}
              >
                {isFilter || isOpen ? <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: c.primary, opacity: isFilter ? 1 : 0.55 }} /> : null}
                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 3, backgroundColor: isToday || isFilter ? c.primary : "transparent" }}>
                  <Text style={{ color: isToday || isFilter ? "#ffffff" : isOpen ? c.primaryText : c.textMuted, fontSize: 12, fontWeight: "700" }}>{day}</Text>
                </View>
                {items.length > 0 ? (
                  <>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 }}>
                      {items.slice(0, 4).map((s) => (
                        <View key={s._id} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sessionDotColor(s, c) }} />
                      ))}
                      {items.length > 4 ? <Text style={{ color: c.primaryText, fontSize: 8.5, fontWeight: "800" }}>+{items.length - 4}</Text> : null}
                    </View>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: c.primaryText, fontSize: 8.5, fontWeight: "700", marginTop: 2 }}>
                      {items.length} {items.length === 1 ? "class" : "classes"}
                    </Text>
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      <Row gap={10} wrap style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surfaceAlt }}>
        <T variant="label" color="faint">
          Legend:
        </T>
        {legend.map((item) => (
          <Row key={item.label} gap={5}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.color }} />
            <T variant="caption" color="muted">
              {item.label}
            </T>
          </Row>
        ))}
        {loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
      </Row>

      {activeDay ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
          <Row justify="space-between" gap={8} style={{ paddingLeft: 14, paddingRight: 6, paddingVertical: 6, backgroundColor: c.primarySoft }}>
            <View style={{ flex: 1, gap: 4, paddingVertical: 4 }}>
              <T variant="bodyStrong">{weekdayDateLabel(activeDay)}</T>
              <Badge label={`${daySessions.length} session${daySessions.length !== 1 ? "s" : ""}`} tone="primary" />
            </View>
            <IconButton icon="x" accessibilityLabel="Close the day's classes" onPress={() => setActiveDay(null)} />
          </Row>
          {daySessions.length === 0 ? (
            <T variant="small" color="faint" center style={{ paddingHorizontal: 16, paddingVertical: 28 }}>
              No classes recorded on this day.
            </T>
          ) : (
            daySessions.map((s, i) => (
              <Pressable
                key={s._id}
                onPress={() => onOpenSession(s._id)}
                android_ripple={{ color: c.border }}
                accessibilityRole="button"
                accessibilityLabel={`${s.student?.fullName || "Class"}: open details`}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : hair, borderTopColor: c.border }}
              >
                <Avatar uri={avatarUri(s.student?.avatar)} name={s.student?.fullName} size={36} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Row justify="space-between" gap={8}>
                    <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {s.student?.fullName || "—"}
                    </T>
                    <T variant="caption" color="muted">
                      {formatTime12(s.startTime)}
                    </T>
                  </Row>
                  <T variant="small" color="muted" numberOfLines={1}>
                    {s.course?.title || "—"}
                  </T>
                  <Row gap={6} wrap>
                    <StatusBadge status={s.status} />
                    <AttBadge status={s.studentAttendance} />
                  </Row>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </Card>
  );
}
