import React, { useState } from "react";
import { Pressable, View } from "react-native";

import { academyDayIndex } from "@/lib/format";
import { useFetch, type FetchState } from "@/lib/hooks";
import { CLASS_MINS, DAY_LABELS, SLOT_DAYS, durationLabel, minsToDisplay, type SlotDay, type SlotDayData, type TeacherSlotsData } from "@/lib/teacher-slot-shared";
import { useNav } from "@/navigation/nav";
import { radius } from "@/theme/palette";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Icon, IconChip, Row, Skeleton, SkeletonTiles, StatTile, T, TileGrid } from "@/ui";

interface SlotsReply {
  success?: boolean;
  message?: string;
  data?: TeacherSlotsData;
}

/** How often the numbers are counted again while the tab is open */
const REFRESH_MS = 60_000;
const LOAD_FAILED = "Could not load your slots.";

/** Hour marks for a day bar: every fourth hour (4 AM, 8 AM, noon, ...) that falls inside the window */
const barHours = (windowStart: number, windowEnd: number) => Array.from({ length: 7 }, (_, i) => i * 4).filter((h) => h * 60 >= windowStart && h * 60 <= windowEnd);

/** Today's weekday in the academy (Bangladesh time), Monday first as the slots are listed */
const academySlotDay = (): SlotDay => SLOT_DAYS[(academyDayIndex() + 6) % 7];

/** When the numbers were last counted, on the phone's own clock (it is a "just now" stamp, not a class time) */
function updatedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : minsToDisplay(date.getHours() * 60 + date.getMinutes());
}

/**
 * Loads the teacher's week of slots. The server counts them again on every request, so the tab reloads once a minute,
 * on return to the screen and on pull-to-refresh. Nothing is loaded until the tab is opened.
 */
export function useTeacherSlots(active: boolean): FetchState<SlotsReply> {
  return useFetch<SlotsReply>(active ? "/api/teacher-portal/slots" : null, undefined, { pollMs: REFRESH_MS });
}

/** "My Slots": for every weekday the classes booked, the free slots left and their counts, counted from the schedule. Read-only. */
export function SlotsTab({ slots }: { slots: FetchState<SlotsReply> }) {
  const today = academySlotDay();
  const [open, setOpen] = useState<Set<SlotDay>>(() => new Set([today]));

  const data = slots.data?.success ? (slots.data.data ?? null) : null;
  const error = slots.error || (slots.data && !slots.data.success ? slots.data.message || LOAD_FAILED : "");
  const noClasses = data !== null && data.totals.bookedCount === 0;

  const toggle = (day: SlotDay) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  return (
    <>
      <Card style={{ gap: 12 }}>
        <Row gap={12} align="flex-start">
          <IconChip icon="calendar" />
          <View style={{ flex: 1 }}>
            <T variant="title">My Slots</T>
            <T variant="small" color="muted">
              Booked and free time for every day, counted automatically from your schedule. A free slot is a gap of 30 minutes or more.
              {data ? ` Your day is counted from ${minsToDisplay(data.windowStart)} to ${minsToDisplay(data.windowEnd)}, so your earliest and latest classes are included.` : ""}
            </T>
          </View>
        </Row>
        <Row justify="space-between">
          <T variant="caption" color="faint" style={{ flex: 1 }}>
            {data ? `Updated ${updatedAt(data.refreshedAt)}` : ""}
          </T>
          <Button title="Refresh" icon="refresh-cw" variant="secondary" size="sm" loading={slots.refreshing} disabled={slots.loading} onPress={() => void slots.refresh()} />
        </Row>
      </Card>

      {!data ? (
        error && !slots.loading ? (
          <Card>
            <ErrorState compact title={LOAD_FAILED} message={error !== LOAD_FAILED ? error : undefined} onRetry={slots.retry} />
          </Card>
        ) : (
          <View accessibilityLabel="Loading your slots" style={{ gap: 12 }}>
            <SkeletonTiles count={3} />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height={84} rounded={16} />
            ))}
          </View>
        )
      ) : (
        <>
          {error ? <Banner tone="warning" message={`${error} The numbers below may be out of date.`} /> : null}

          <TileGrid>
            <StatTile label="Booked classes" value={data.totals.bookedCount} sub={durationLabel(data.totals.bookedMinutes)} gradient="blue" icon="book-open" />
            <StatTile label="Free slots" value={data.totals.freeCount} sub={durationLabel(data.totals.freeMinutes)} gradient="emerald" icon="clock" />
          </TileGrid>
          <StatTile label="Can still hold" value={data.totals.fitCount} sub={`more ${CLASS_MINS}-minute classes`} gradient="sky" icon="plus-circle" />

          {noClasses ? (
            <Card>
              <EmptyState compact icon="calendar" title="No classes on your schedule yet" message="Your whole week is free. Booked classes appear here as soon as students are scheduled with you." />
            </Card>
          ) : null}

          {data.days.map((day) => (
            <DayCard key={day.day} day={day} isToday={day.day === today} expanded={open.has(day.day)} onToggle={() => toggle(day.day)} />
          ))}
        </>
      )}
    </>
  );
}

/** One weekday: counts and a day bar always visible, the classes and free slots when it is opened */
function DayCard({ day, isToday, expanded, onToggle }: { day: SlotDayData; isToday: boolean; expanded: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const nav = useNav();
  const span = Math.max(1, day.windowEnd - day.windowStart);
  const pct = (mins: number) => Math.min(100, Math.max(0, ((mins - day.windowStart) / span) * 100));
  const summary = `${DAY_LABELS[day.day]}: ${day.bookedCount} booked, ${day.freeCount} free slots`;

  return (
    <Card padding={0} style={[{ overflow: "hidden" }, isToday ? { borderColor: c.primary, borderWidth: 2 } : null]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={summary} android_ripple={{ color: c.border }} style={{ padding: 14, gap: 12 }}>
        <Row gap={8} align="flex-start">
          <Row gap={6} wrap style={{ flex: 1 }}>
            <T variant="bodyStrong" weight="800">
              {DAY_LABELS[day.day]}
            </T>
            {isToday ? <Badge label="Today" tone="primary" solid /> : null}
            <Badge label={`${day.bookedCount} booked`} tone="primary" />
            <Badge label={`${day.freeCount} free · ${durationLabel(day.freeMinutes)}`} tone="success" />
            {day.untimedCount > 0 ? <Badge label={`${day.untimedCount} without a time`} tone="warning" /> : null}
          </Row>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.textFaint} />
        </Row>

        <View>
          {/* The day as a bar: free time green, booked classes blue, over the teacher's own day window */}
          <View style={{ height: 12, borderRadius: 6, backgroundColor: c.surfaceAlt, overflow: "hidden" }}>
            {day.free.map((range) => (
              <View key={`f${range.startMins}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(range.startMins)}%`, width: `${pct(range.endMins) - pct(range.startMins)}%`, backgroundColor: c.success }} />
            ))}
            {day.booked.map((slot, index) => (
              <View
                key={`b${slot.startMins}-${index}`}
                style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(slot.startMins)}%`, width: `${Math.max(0.8, pct(slot.endMins) - pct(slot.startMins))}%`, backgroundColor: c.primary }}
              />
            ))}
          </View>
          <View style={{ height: 16, marginTop: 3 }}>
            {barHours(day.windowStart, day.windowEnd).map((hour) => {
              const at = pct(hour * 60);
              // Marks at the two ends hug the edge instead of hanging outside the card
              const place = at <= 5 ? ({ left: 0, textAlign: "left" } as const) : at >= 95 ? ({ right: 0, textAlign: "right" } as const) : ({ left: `${at}%`, marginLeft: -24, textAlign: "center" } as const);
              return (
                <T key={hour} variant="caption" color="faint" style={[{ position: "absolute", width: 48, fontSize: 10 }, place]}>
                  {minsToDisplay(hour * 60).replace(":00", "")}
                </T>
              );
            })}
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ gap: 14, padding: 14, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ gap: 8 }}>
            <T variant="label" color="primary">
              Booked classes
            </T>
            {day.booked.length === 0 ? (
              <T variant="small" color="muted">
                No classes booked.
              </T>
            ) : (
              day.booked.map((slot, index) => (
                <View key={`${slot.startMins}-${index}`} style={{ gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: c.primarySoft }}>
                  <Row gap={8} wrap>
                    <T variant="smallStrong">
                      {minsToDisplay(slot.startMins)} – {minsToDisplay(slot.endMins)}
                    </T>
                    <T variant="small" color="muted">
                      {durationLabel(slot.endMins - slot.startMins)}
                    </T>
                    {slot.source === "session" ? <Badge label="One-off" tone="primary" /> : null}
                  </Row>
                  <T variant="small" color="muted">
                    {[slot.studentName || "Student", slot.studentCode, slot.courseTitle].filter(Boolean).join(" · ")}
                  </T>
                </View>
              ))
            )}
            {day.untimedCount > 0 ? (
              <View style={{ gap: 6 }}>
                <T variant="small" color="warning">
                  {day.untimedCount} class{day.untimedCount === 1 ? " has" : "es have"} no time, so {day.untimedCount === 1 ? "it is" : "they are"} not placed on this day.
                </T>
                <Button title="Set the time" icon="clock" variant="outline" size="sm" onPress={() => nav.go("TeacherStudents")} />
              </View>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <T variant="label" color="success">
              Free slots
            </T>
            {day.free.length === 0 ? (
              <T variant="small" color="muted">
                No free slot of 30 minutes or more.
              </T>
            ) : (
              day.free.map((range) => {
                const length = range.endMins - range.startMins;
                const fits = Math.floor(length / CLASS_MINS);
                return (
                  <View key={range.startMins} style={{ gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: c.successSoft }}>
                    <Row gap={8} wrap>
                      <T variant="smallStrong">
                        {minsToDisplay(range.startMins)} – {minsToDisplay(range.endMins)}
                      </T>
                      <T variant="small" color="muted">
                        {durationLabel(length)}
                      </T>
                    </Row>
                    <T variant="small" color="muted">
                      {day.bookedCount === 0 ? "Free all day · " : ""}
                      {fits > 0 ? `Room for ${fits} class${fits === 1 ? "" : "es"} of 45 minutes` : "Too short for a 45-minute class"}
                    </T>
                  </View>
                );
              })
            )}
          </View>
        </View>
      ) : null}
    </Card>
  );
}
