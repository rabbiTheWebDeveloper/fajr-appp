import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { api, errorMessage } from "@/api/client";
import { titleCase } from "@/lib/format";
import type { FetchState } from "@/lib/hooks";
import { DAY_LABELS, SLOT_DAYS, type SlotDay } from "@/lib/teacher-slot-shared";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { ActionButton, TimeTag } from "@/screens/teacher/schedule/parts";
import { Badge, Banner, Card, ErrorState, GradientCard, Icon, IconButton, IconChip, Row, SkeletonList, SkeletonTiles, T, confirmAsync, toast } from "@/ui";

/** A class a student already has with the teacher: its time cannot be offered again */
export interface BookedClass {
  startMins: number;
  endMins: number;
  startTime: string;
  endTime: string;
  duration: number;
  durationLabel: string;
  studentName: string;
  studentCode: string;
  courseTitle: string;
  source: string;
}

/** A time the teacher offered for new students */
export interface InterestedSlot {
  _id: string;
  day: SlotDay;
  startTime: string;
  endTime: string;
  startMins: number;
  endMins: number;
  duration: number;
  courses?: { _id: string; title: string }[];
  targetAudience?: "any" | "kids" | "adults" | "female" | "male";
  status: "open" | "assigned" | "cancelled";
  note?: string;
  createdAt?: string;
}

/** GET /api/teacher-portal/slots/interested */
export interface SlotsReply {
  success?: boolean;
  message?: string;
  bookedByDay?: Record<string, BookedClass[]>;
  interestedSlots?: InterestedSlot[];
  courses?: { _id: string; title: string }[];
}

interface TeachingSlotsHubProps {
  /** The slots request, owned by the schedule screen so its pull-to-refresh reloads it too */
  slots: FetchState<SlotsReply>;
  initialDay: SlotDay;
  /** Opens the add-slot form on a day */
  onAdd: (day: SlotDay) => void;
  /** Called after a slot was removed */
  onChanged: () => void;
}

/** The teacher's booked classes beside the open slots they offered, day by day or for the whole week */
export default function TeachingSlotsHub({ slots, initialDay, onAdd, onChanged }: TeachingSlotsHubProps) {
  const { c } = useTheme();
  const [selectedDay, setSelectedDay] = useState<SlotDay>(initialDay);
  const [viewMode, setViewMode] = useState<"day" | "all-week">("day");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingDay, setClearingDay] = useState<SlotDay | null>(null);

  const bookedByDay = slots.data?.bookedByDay ?? {};
  const interestedSlots = slots.data?.interestedSlots ?? [];

  const handleDeleteSlot = async (slotId: string) => {
    const sure = await confirmAsync({ title: "আপনি কি নিশ্চিত যে এই আগ্রহী স্লটটি মুছে ফেলতে চান?", confirmText: "মুছে ফেলুন", cancelText: "বাতিল", destructive: true });
    if (!sure) return;

    setDeletingId(slotId);
    try {
      const json = await api.delete<{ success?: boolean; message?: string }>("/api/teacher-portal/slots/interested", { id: slotId });
      if (!json.success) throw new Error(json.message || "Failed to delete slot");
      toast.success("স্লটটি সফলভাবে মুছে ফেলা হয়েছে।");
      await slots.reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete slot"));
    } finally {
      setDeletingId(null);
    }
  };

  // Clears every still-open slot of the day; slots a student was already given are kept by the server
  const handleClearDaySlots = async (day: SlotDay) => {
    const dayLabel = DAY_LABELS[day] || day;
    const sure = await confirmAsync({ title: `আপনি কি নিশ্চিত যে ${dayLabel}-এর সকল উন্মুক্ত স্লট মুছে ফেলতে চান?`, confirmText: "মুছে ফেলুন", cancelText: "বাতিল", destructive: true });
    if (!sure) return;

    setClearingDay(day);
    try {
      const json = await api.delete<{ success?: boolean; message?: string }>("/api/teacher-portal/slots/interested", { day });
      if (!json.success) throw new Error(json.message || "Failed to clear slots");
      toast.success(json.message || `${dayLabel}-এর স্লটগুলো মুছে ফেলা হয়েছে।`);
      await slots.reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not clear slots"));
    } finally {
      setClearingDay(null);
    }
  };

  // The request starts when this tab is first opened, so "no data and no error yet" is still loading
  if (slots.loading || (!slots.data && !slots.error)) {
    return (
      <View style={{ gap: 16 }}>
        <SkeletonTiles count={2} />
        <SkeletonList count={3} />
      </View>
    );
  }

  if (!slots.data) {
    return (
      <Card padding={0}>
        <ErrorState message={slots.error || "Failed to load slots data"} onRetry={slots.retry} />
      </Card>
    );
  }

  const currentDayBooked = bookedByDay[selectedDay] || [];
  const currentDayInterested = interestedSlots.filter((s) => s.day === selectedDay);
  const totalBookedCount = Object.values(bookedByDay).reduce((acc, list) => acc + list.length, 0);
  const totalOpenCount = interestedSlots.filter((s) => s.status === "open").length;

  const deleteButton = (slot: InterestedSlot, label: string) =>
    deletingId === slot._id ? (
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="small" color={c.danger} />
      </View>
    ) : (
      <IconButton icon="trash-2" size={40} color={c.dangerText} accessibilityLabel={label} onPress={() => void handleDeleteSlot(slot._id)} />
    );

  return (
    <View style={{ gap: 16 }}>
      {/* ── Totals ── */}
      <GradientCard gradient="navy">
        <Row justify="space-between" align="flex-start" gap={12}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" color="onDarkMuted">
              Existing Student Classes
            </T>
            <T variant="h1" color="onDark" style={{ fontSize: 30, lineHeight: 36 }}>
              {totalBookedCount}
            </T>
            <Row gap={6} align="flex-start">
              <Icon name="lock" size={13} color={c.onDarkMuted} style={{ marginTop: 2 }} />
              <T variant="small" color="onDarkMuted" style={{ flex: 1 }}>
                বিদ্যমান শিক্ষার্থীদের বুকড ক্লাস (লক করা)
              </T>
            </Row>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Icon name="users" size={22} color={c.onDark} />
          </View>
        </Row>
      </GradientCard>

      <GradientCard gradient="amber">
        <Row justify="space-between" align="flex-start" gap={12}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" color="rgba(255,255,255,0.85)">
              Submitted Teaching Slots
            </T>
            <T variant="h1" color="onDark" style={{ fontSize: 30, lineHeight: 36 }}>
              {totalOpenCount}
            </T>
            <Row gap={6} align="flex-start">
              <Icon name="star" size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }} />
              <T variant="small" color="rgba(255,255,255,0.9)" style={{ flex: 1 }}>
                নতুন স্টুডেন্ট নেওয়ার উন্মুক্ত স্লট
              </T>
            </Row>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
            <Icon name="clock" size={22} color={c.onDark} />
          </View>
        </Row>
      </GradientCard>

      {/* ── Add slots ── */}
      <Card style={{ gap: 10, borderStyle: "dashed", borderWidth: 1.5, borderColor: c.borderStrong }}>
        <Row gap={8} align="flex-start">
          <Icon name="star" size={16} color={c.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="title">পড়াতে আগ্রহী নতুন স্লট দিন</T>
            <T variant="small" color="muted">
              একসাথে একাধিক দিন ও সময় (যেমন: শনি ৮-৯PM, ৯-১০PM) সহজে যুক্ত করুন।
            </T>
          </View>
        </Row>
        <ActionButton title="+ Add Slots (একাধিক দিন ও স্লট যোগ করুন)" icon="plus" block onPress={() => onAdd(selectedDay)} />
      </Card>

      {/* A reload that failed while older data is still on screen */}
      {slots.error ? (
        <Banner tone="danger" message={slots.error}>
          <ActionButton title="পুনরায় চেষ্টা করুন" icon="refresh-cw" tone="danger" look="soft" onPress={() => void slots.reload()} />
        </Banner>
      ) : null}

      {/* ── View controls & day selection ── */}
      <View style={{ gap: 10 }}>
        <Row gap={8} wrap>
          <ActionButton title="দিন ভিত্তিক ভিউ (Day-by-Day)" icon="calendar" look={viewMode === "day" ? "solid" : "soft"} tone={viewMode === "day" ? "primary" : "neutral"} onPress={() => setViewMode("day")} />
          <ActionButton
            title="সপ্তাহের সব স্লট একসাথে (All Week Summary)"
            icon="layers"
            look={viewMode === "all-week" ? "solid" : "soft"}
            tone={viewMode === "all-week" ? "primary" : "neutral"}
            onPress={() => setViewMode("all-week")}
          />
          <ActionButton title="+ নতুন স্লট যোগ করুন" icon="plus" tone="warning" onPress={() => onAdd(selectedDay)} />
        </Row>

        {viewMode === "day" ? (
          <View style={{ gap: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SLOT_DAYS.map((day) => {
                const isSelected = selectedDay === day;
                const bookedCount = (bookedByDay[day] || []).length;
                const openCount = interestedSlots.filter((s) => s.day === day && s.status === "open").length;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${DAY_LABELS[day]}: ${bookedCount} booked, ${openCount} open`}
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      minWidth: 104,
                      gap: 8,
                      padding: 12,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: isSelected ? c.primary : c.border,
                      backgroundColor: isSelected ? c.primary : c.surface,
                    }}
                  >
                    <T variant="label" color={isSelected ? "#ffffff" : "text"}>
                      {DAY_LABELS[day]}
                    </T>
                    <Row gap={6}>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : c.surfaceAlt }}>
                        <T variant="caption" color={isSelected ? "#ffffff" : "muted"} weight="700">
                          🔒 {bookedCount}
                        </T>
                      </View>
                      {openCount > 0 ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : c.warningSoft }}>
                          <T variant="caption" color={isSelected ? "#ffffff" : "warning"} weight="700">
                            🟡 {openCount}
                          </T>
                        </View>
                      ) : null}
                    </Row>
                  </Pressable>
                );
              })}
            </ScrollView>
            {/* The web page explains these two counters on hover */}
            <T variant="caption" color="faint">
              🔒 বিদ্যমান বুকড ক্লাস · 🟡 উন্মুক্ত স্লট
            </T>
          </View>
        ) : null}
      </View>

      {viewMode === "all-week" ? (
        /* ── All-week summary ── */
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 8 }}>
            <Row gap={8} align="flex-start">
              <Icon name="layers" size={18} color={c.primary} style={{ marginTop: 1 }} />
              <T variant="title" style={{ flex: 1 }}>
                ৭ দিনের সব আগ্রহী স্লটের তালিকা (Weekly Open Slots Overview)
              </T>
            </Row>
            <Badge label={`মোট ${totalOpenCount} টি উন্মুক্ত স্লট`} tone="warning" />
          </Card>

          {SLOT_DAYS.map((day) => {
            const dayOpenSlots = interestedSlots.filter((s) => s.day === day && s.status === "open");
            const dayBooked = bookedByDay[day] || [];
            return (
              <Card key={day} style={{ gap: 10 }}>
                <Row justify="space-between" gap={8} wrap>
                  <T variant="title">{DAY_LABELS[day]}</T>
                  <Row gap={6}>
                    <Badge label={`🔒 ${dayBooked.length} বুকড`} tone="neutral" />
                    <Badge label={`🟡 ${dayOpenSlots.length} স্লট`} tone="warning" />
                  </Row>
                </Row>

                {dayOpenSlots.length === 0 ? (
                  <T variant="small" color="faint" center style={{ fontStyle: "italic", paddingVertical: 10 }}>
                    কোনো উন্মুক্ত স্লট নেই
                  </T>
                ) : (
                  <View style={{ gap: 8 }}>
                    {dayOpenSlots.map((slot) => (
                      <Row key={slot._id} justify="space-between" gap={8} style={{ paddingLeft: 10, paddingRight: 2, borderRadius: radius.md, borderWidth: 1, borderColor: `${c.warning}55`, backgroundColor: c.warningSoft }}>
                        <Row gap={6} style={{ flex: 1 }}>
                          <Icon name="clock" size={14} color={c.warningText} />
                          <T variant="smallStrong" style={{ flex: 1 }}>
                            {slot.startTime} – {slot.endTime}
                          </T>
                        </Row>
                        {deleteButton(slot, "মুছে ফেলুন")}
                      </Row>
                    ))}
                  </View>
                )}

                <ActionButton title={`+ ${DAY_LABELS[day].slice(0, 3)}-এ স্লট দিন`} icon="plus" look="soft" block onPress={() => onAdd(day)} />
              </Card>
            );
          })}
        </View>
      ) : (
        /* ── One day: booked classes, then the open slots ── */
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <Row gap={8} align="flex-start">
              <Icon name="calendar" size={18} color={c.primary} style={{ marginTop: 1 }} />
              <T variant="title" style={{ flex: 1 }}>
                {DAY_LABELS[selectedDay]} — Schedule & Availability Breakdown
              </T>
            </Row>
            <Row gap={8} wrap>
              {currentDayInterested.some((s) => s.status === "open") ? (
                <ActionButton title="সব উন্মুক্ত স্লট মুছুন" icon="trash-2" tone="danger" look="soft" loading={clearingDay === selectedDay} onPress={() => void handleClearDaySlots(selectedDay)} />
              ) : null}
              <ActionButton title={`+ Add Slots on ${DAY_LABELS[selectedDay]}`} icon="plus" look="soft" onPress={() => onAdd(selectedDay)} />
            </Row>
          </Card>

          {/* Existing booked classes (locked) */}
          <Card style={{ gap: 12 }}>
            <Row gap={10} align="flex-start">
              <IconChip icon="lock" tone="primary" size={34} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="bodyStrong">বিদ্যমান শিক্ষার্থীদের বুকড ক্লাস</T>
                <T variant="caption" color="muted">
                  Existing Booked Classes ({currentDayBooked.length})
                </T>
                <Badge label="LOCKED SLOTS" tone="primary" style={{ marginTop: 4 }} />
              </View>
            </Row>

            {currentDayBooked.length === 0 ? (
              <View style={{ alignItems: "center", gap: 4, paddingVertical: 24, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong, backgroundColor: c.surfaceAlt }}>
                <Icon name="clock" size={28} color={c.textFaint} />
                <T variant="smallStrong" center>
                  {DAY_LABELS[selectedDay]}-এ কোনো নিয়মিত ক্লাস বুক করা নেই
                </T>
                <T variant="caption" color="faint" center>
                  এই দিনের পুরো সময়টি আপনার জন্য উন্মুক্ত রয়েছে!
                </T>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {currentDayBooked.map((cls, idx) => (
                  <View key={`${cls.startMins}-${idx}`} style={{ gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt }}>
                    <Row gap={10} align="flex-start">
                      <IconChip icon="user" tone="primary" size={36} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Row gap={8} wrap>
                          <T variant="smallStrong" weight="800" style={{ flexShrink: 1 }}>
                            {cls.studentName}
                          </T>
                          {cls.studentCode ? (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
                              <T variant="mono" color="muted" style={{ fontSize: 10.5, lineHeight: 15 }}>
                                {cls.studentCode}
                              </T>
                            </View>
                          ) : null}
                        </Row>
                        <Row gap={6} align="flex-start">
                          <Icon name="book-open" size={12} color={c.textFaint} style={{ marginTop: 3 }} />
                          <T variant="small" color="muted" style={{ flex: 1 }}>
                            {cls.courseTitle}
                          </T>
                        </Row>
                      </View>
                    </Row>
                    <Row gap={8} wrap>
                      <TimeTag label={`${cls.startTime} – ${cls.endTime}`} />
                      <Badge label={cls.durationLabel} tone="neutral" />
                    </Row>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* The teacher's submitted interested slots */}
          <Card style={{ gap: 12 }}>
            <Row gap={10} align="flex-start">
              <IconChip icon="star" tone="warning" size={34} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="bodyStrong">পড়াতে আগ্রহী উন্মুক্ত স্লটসমূহ</T>
                <T variant="caption" color="muted">
                  Your Submitted Interested Slots ({currentDayInterested.length})
                </T>
                <Badge label="OPEN FOR STUDENTS" tone="warning" style={{ marginTop: 4 }} />
              </View>
            </Row>

            {currentDayInterested.length === 0 ? (
              <View style={{ alignItems: "center", gap: 4, paddingVertical: 24, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: `${c.warning}66`, backgroundColor: c.warningSoft }}>
                <Icon name="star" size={28} color={c.warning} />
                <T variant="smallStrong" center>
                  {DAY_LABELS[selectedDay]}-এ কোনো আগ্রহী স্লট সাবমিট করা নেই
                </T>
                <T variant="caption" color="muted" center>
                  আপনি এই দিনে নতুন স্টুডেন্ট পড়াতে চাইলে নিচে ক্লিক করে স্লট সাবমিট করুন।
                </T>
                <ActionButton title="+ এই দিনে স্লট যোগ করুন" icon="plus" tone="warning" onPress={() => onAdd(selectedDay)} style={{ alignSelf: "center", marginTop: 8 }} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {currentDayInterested.map((slot) => {
                  const isOpen = slot.status === "open";
                  const isAssigned = slot.status === "assigned";
                  const tint = isOpen ? c.warning : c.success;
                  return (
                    <Row key={slot._id} gap={6} align="flex-start" style={{ padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: `${tint}55`, backgroundColor: isOpen ? c.warningSoft : c.successSoft }}>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Row gap={8} wrap>
                          <TimeTag label={`${slot.startTime} – ${slot.endTime}`} tone="warning" />
                          <Badge label={`${slot.duration} mins`} tone="warning" />
                          {isOpen ? <Badge label="স্টুডেন্টের অপেক্ষায় (Open)" tone="warning" icon="clock" /> : isAssigned ? <Badge label="শিক্ষার্থী যুক্ত হয়েছে (Assigned)" tone="success" icon="check" /> : null}
                        </Row>

                        {/* Course preference */}
                        <Row gap={6} wrap>
                          <T variant="caption" color="muted" weight="600">
                            বিষয় পছন্দ:
                          </T>
                          {slot.courses && slot.courses.length > 0 ? (
                            slot.courses.map((course) => <Badge key={course._id} label={course.title} tone="primary" style={{ maxWidth: "100%" }} />)
                          ) : (
                            <T variant="caption" color="muted" style={{ fontStyle: "italic" }}>
                              যেকোনো বিষয় (Any Course)
                            </T>
                          )}
                        </Row>

                        {/* Target audience & note */}
                        {(slot.targetAudience && slot.targetAudience !== "any") || slot.note ? (
                          <Row gap={8} wrap>
                            {slot.targetAudience && slot.targetAudience !== "any" ? <Badge label={`লক্ষ্য: ${titleCase(slot.targetAudience)}`} tone="neutral" /> : null}
                            {slot.note ? (
                              <T variant="caption" color="muted" style={{ flexShrink: 1 }}>
                                "{slot.note}"
                              </T>
                            ) : null}
                          </Row>
                        ) : null}
                      </View>

                      {/* Only a slot no student was given yet can be withdrawn */}
                      {isOpen ? deleteButton(slot, "স্লটটি বাতিল করুন") : null}
                    </Row>
                  );
                })}
              </View>
            )}
          </Card>
        </View>
      )}
    </View>
  );
}
