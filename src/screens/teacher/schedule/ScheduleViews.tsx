import React from "react";
import { View } from "react-native";

import { DAY_LABELS, SLOT_DAYS, type SlotDay } from "@/lib/teacher-slot-shared";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { ActionButton, TimeTag } from "@/screens/teacher/schedule/parts";
import { formatTime, schedulesForDay, type ScheduleItem, type TimeSlot } from "@/screens/teacher/schedule/schedule-utils";
import { Badge, Button, Card, EmptyState, Icon, Row, T } from "@/ui";

interface DayTimelineProps {
  slots: TimeSlot[];
  /** "Today (Thursday)" or the day's name */
  dayLabel: string;
  /** Opens the add-slot form, with the free gap's time filled in when one was tapped */
  onAddSlot: (range?: { startMins: number; endMins: number }) => void;
  /** Opens the classes page, where a live class is run */
  onJoinLive: () => void;
}

/** One day in detail: every class in time order with the free time between them */
export function DayTimeline({ slots, dayLabel, onAddSlot, onJoinLive }: DayTimelineProps) {
  const { c } = useTheme();
  const classCount = slots.filter((s) => !s.isFree).length;
  const freeCount = slots.filter((s) => s.isFree).length;

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 8 }}>
        <Row gap={8} align="flex-start">
          <Icon name="clock" size={18} color={c.primary} style={{ marginTop: 1 }} />
          <T variant="title" style={{ flex: 1 }}>
            Detailed Timeline & Free Slots —{" "}
            <T variant="title" color="primary">
              {dayLabel}
            </T>
          </T>
        </Row>
        <Badge label={`${classCount} Classes, ${freeCount} Free Slots`} tone="neutral" />
      </Card>

      {slots.length === 0 ? (
        <Card padding={0}>
          <EmptyState
            icon="coffee"
            title="No Classes Scheduled"
            message="You are completely free on this day! No scheduled class slots found."
            actionLabel="পড়াতে আগ্রহী স্লট যুক্ত করুন"
            onAction={() => onAddSlot()}
          />
        </Card>
      ) : (
        slots.map((slot, index) =>
          slot.isFree ? (
            <FreeSlotCard key={`free-${index}`} slot={slot} onAddSlot={() => onAddSlot({ startMins: slot.startMinutes, endMins: slot.endMinutes })} />
          ) : (
            <ClassCard key={`${slot.item?._id ?? "class"}-${index}`} slot={slot} onJoinLive={onJoinLive} />
          )
        )
      )}
    </View>
  );
}

function FreeSlotCard({ slot, onAddSlot }: { slot: TimeSlot; onAddSlot: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: `${c.success}55`, backgroundColor: c.successSoft }}>
      <Row gap={12} align="flex-start">
        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surface }}>
          <Icon name="coffee" size={22} color={c.successText} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={8} wrap>
            <Badge label="FREE SLOT (খালি সময়)" tone="success" solid />
            <T variant="caption" color="success" weight="700">
              Available Time
            </T>
          </Row>
          <T variant="smallStrong">
            No class scheduled between {slot.startTime} and {slot.endTime}
          </T>
        </View>
      </Row>
      <Row gap={8} wrap justify="space-between">
        <TimeTag label={`${slot.startTime} - ${slot.endTime}`} tone="success" />
        <ActionButton title="পড়াতে আগ্রহী স্লট দিন" icon="star" tone="warning" onPress={onAddSlot} />
      </Row>
    </View>
  );
}

function ClassCard({ slot, onJoinLive }: { slot: TimeSlot; onJoinLive: () => void }) {
  const { c } = useTheme();
  const item = slot.item;
  if (!item) return null;
  const isOngoing = slot.status === "ongoing";
  const isCompleted = slot.status === "completed";

  return (
    <Card padding={0} style={[{ overflow: "hidden" }, isOngoing ? { borderColor: c.danger, backgroundColor: c.primarySoft } : null, isCompleted ? { backgroundColor: c.surfaceAlt, opacity: 0.85 } : null]}>
      <View style={{ flexDirection: "row" }}>
        {isOngoing ? <View style={{ width: 5, backgroundColor: c.danger }} /> : null}
        <View style={{ flex: 1, gap: 12, padding: 14 }}>
          <Row gap={12} align="flex-start">
            <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: isOngoing ? c.danger : isCompleted ? c.borderStrong : c.primary }}>
              <Icon name="video" size={22} color={isCompleted ? c.textMuted : "#ffffff"} />
            </View>

            <View style={{ flex: 1, gap: 5 }}>
              <Row gap={6} wrap>
                {isOngoing ? <Badge label="● LIVE NOW" tone="danger" solid /> : isCompleted ? <Badge label="COMPLETED" tone="neutral" /> : <Badge label="SCHEDULED" tone="primary" />}
                <Badge label={`${(item.type || "Live").toUpperCase()} CLASS`} tone="neutral" />
              </Row>

              <T variant="title">{item.course?.title || "Assigned Class Session"}</T>

              {item.student ? (
                <Row gap={6} align="flex-start">
                  <Icon name="user" size={13} color={c.primary} style={{ marginTop: 2 }} />
                  <T variant="smallStrong" style={{ flex: 1 }}>
                    {item.student.fullName}
                    {item.student.email ? (
                      <T variant="small" color="faint">
                        {" "}
                        ({item.student.email})
                      </T>
                    ) : null}
                  </T>
                </Row>
              ) : null}
            </View>
          </Row>

          <Row gap={8} wrap>
            <TimeTag label={`${slot.startTime} - ${slot.endTime}`} />
            {item.duration ? <Badge label={`${item.duration} mins`} tone="neutral" /> : null}
          </Row>

          {item.type === "live" && isOngoing ? <Button title="Join Live Class Now" icon="video" variant="danger" block onPress={onJoinLive} /> : null}
        </View>
      </View>
    </Card>
  );
}

interface WeeklyRoutineProps {
  schedules: ScheduleItem[];
  todayKey: SlotDay;
  onAddSlot: (day: SlotDay) => void;
}

/** The whole week, one card per day (the website's 7-column timetable, stacked for a phone) */
export function WeeklyRoutine({ schedules, todayKey, onAddSlot }: WeeklyRoutineProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 4 }}>
        <Row gap={8}>
          <Icon name="calendar" size={18} color={c.primary} />
          <T variant="title" style={{ flex: 1 }}>
            7-Day Class Timetable
          </T>
        </Row>
        <T variant="small" color="muted">
          Highlighting Today ({DAY_LABELS[todayKey]})
        </T>
      </Card>

      {SLOT_DAYS.map((dayKey) => {
        const dayName = DAY_LABELS[dayKey];
        const isToday = dayKey === todayKey;
        const daySchedules = schedulesForDay(schedules, dayKey);

        return (
          <Card key={dayKey} padding={0} style={[{ overflow: "hidden" }, isToday ? { borderColor: c.primary } : null]}>
            <Row justify="space-between" style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: isToday ? c.primary : c.surfaceAlt }}>
              <T variant="label" color={isToday ? "#ffffff" : "muted"} style={{ fontSize: 12 }}>
                {dayName}
              </T>
              {isToday ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.22)" }}>
                  <T variant="caption" color="#ffffff" weight="800">
                    TODAY
                  </T>
                </View>
              ) : (
                <T variant="caption" color="faint">
                  {daySchedules.length === 1 ? "1 class" : `${daySchedules.length} classes`}
                </T>
              )}
            </Row>

            <View style={{ gap: 8, padding: 12 }}>
              {daySchedules.length === 0 ? (
                <View style={{ alignItems: "center", gap: 4, paddingVertical: 14 }}>
                  <Icon name="coffee" size={22} color={c.textFaint} />
                  <T variant="caption" color="faint">
                    Free Day
                  </T>
                </View>
              ) : (
                daySchedules.map((s, i) => (
                  <View key={`${s._id}-${i}`} style={{ gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
                    <Row gap={8} align="flex-start" justify="space-between">
                      <T variant="smallStrong" weight="800" style={{ flex: 1 }}>
                        {s.course?.title || "Class"}
                      </T>
                      <Badge label={(s.type || "Live").toUpperCase()} tone="primary" />
                    </Row>

                    {s.student ? (
                      <Row gap={6}>
                        <Icon name="user" size={12} color={c.textFaint} />
                        <T variant="small" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                          {s.student.fullName}
                        </T>
                      </Row>
                    ) : null}

                    <Row justify="space-between" gap={8} style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
                      <Row gap={5}>
                        <Icon name="clock" size={12} color={c.primary} />
                        <T variant="smallStrong" color="primary">
                          {formatTime(s.startTime)}
                        </T>
                      </Row>
                      <Row gap={6}>
                        <T variant="small" color="muted">
                          {formatTime(s.endTime)}
                        </T>
                        {s.duration ? <Badge label={`${s.duration}m`} tone="neutral" /> : null}
                      </Row>
                    </Row>
                  </View>
                ))
              )}

              {/* Quick add for this day */}
              <ActionButton title={`+ ${dayName.slice(0, 3)} স্লট দিন`} icon="plus" look="soft" block onPress={() => onAddSlot(dayKey)} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}
