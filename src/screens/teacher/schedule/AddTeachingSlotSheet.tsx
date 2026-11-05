import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { api, errorMessage } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { DAY_LABELS, SLOT_DAYS, durationLabel, minsToDisplay, type SlotDay } from "@/lib/teacher-slot-shared";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { ActionButton, Pill } from "@/screens/teacher/schedule/parts";
import { Banner, Button, Icon, Input, Row, Sheet, Skeleton, T, TimeField } from "@/ui";

interface Range {
  startMins: number;
  endMins: number;
}

interface BookedClass extends Range {
  studentName: string;
  courseTitle?: string;
}

interface DaySlot extends Range {
  day: SlotDay;
}

interface CourseOption {
  _id: string;
  title: string;
}

type Audience = "any" | "kids" | "adults" | "female" | "male";

/** GET /api/teacher-portal/slots/interested, as far as this form reads it */
interface SlotsLoadReply {
  success?: boolean;
  message?: string;
  bookedByDay?: Record<string, BookedClass[]>;
  interestedSlots?: (DaySlot & { status: string })[];
  courses?: CourseOption[];
}

interface AddTeachingSlotSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialDay?: SlotDay;
  /** Pre-fills the time when the teacher taps one of their own free gaps */
  initialStartMins?: number;
  initialEndMins?: number;
}

/** Free time is looked for between these hours; a class outside them still blocks, it is just not offered. */
const DAY_START = 6 * 60;
const DAY_END = 23 * 60;
/** The server refuses anything shorter. */
const MIN_SLOT_MINS = 15;
/** A gap shorter than this is not worth offering as free time. */
const MIN_FREE_MINS = 30;
const DURATION_CHOICES = [30, 45, 60, 90];
const PRESETS: { start: number; duration: number }[] = [
  { start: 20 * 60, duration: 60 },
  { start: 21 * 60, duration: 60 },
  { start: 19 * 60, duration: 60 },
  { start: 16 * 60, duration: 60 },
  { start: 10 * 60, duration: 60 },
  { start: 20 * 60, duration: 45 },
];
const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "any", label: "যে কেউ" },
  { key: "kids", label: "শিশু" },
  { key: "adults", label: "প্রাপ্তবয়স্ক" },
  { key: "female", label: "মহিলা" },
  { key: "male", label: "পুরুষ" },
];
/** The day buttons sit four to a row so each stays wide enough to tap */
const DAY_ROWS: (SlotDay | null)[][] = [
  ["monday", "tuesday", "wednesday", "thursday"],
  ["friday", "saturday", "sunday", null],
];

const overlaps = (a: Range, b: Range) => Math.max(a.startMins, b.startMins) < Math.min(a.endMins, b.endMins);
const rangeLabel = (r: Range) => `${minsToDisplay(r.startMins)} – ${minsToDisplay(r.endMins)}`;
const sameRange = (a: Range, b: Range) => a.startMins === b.startMins && a.endMins === b.endMins;

/** 750 -> "12:30", the value format of the time field */
function toInputValue(mins: number): string {
  const m = Math.min(Math.max(mins, 0), 1439);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function fromInputValue(value: string): number | null {
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/** The stretches of the day, left to right, that no busy range covers. */
function freeGaps(busy: Range[]): Range[] {
  const sorted = [...busy].sort((a, b) => a.startMins - b.startMins);
  const gaps: Range[] = [];
  let cursor = DAY_START;
  for (const b of sorted) {
    if (cursor >= DAY_END) break;
    const gapEnd = Math.min(b.startMins, DAY_END);
    if (gapEnd - cursor >= MIN_FREE_MINS) gaps.push({ startMins: cursor, endMins: gapEnd });
    cursor = Math.max(cursor, b.endMins);
  }
  if (DAY_END - cursor >= MIN_FREE_MINS) gaps.push({ startMins: cursor, endMins: DAY_END });
  return gaps;
}

const sortDays = (list: SlotDay[]) => SLOT_DAYS.filter((d) => list.includes(d));

/** The "add teaching slots" form: pick days, pick a time, submit one slot or a whole list of them. */
export default function AddTeachingSlotSheet(props: AddTeachingSlotSheetProps) {
  // Mounting the body only while open gives every opening a fresh form for the day and time that was tapped
  if (!props.visible) return null;
  return <SlotSheetBody {...props} />;
}

function SlotSheetBody({ onClose, onSuccess, initialDay = "saturday", initialStartMins, initialEndMins }: AddTeachingSlotSheetProps) {
  const { c } = useTheme();
  const firstStart = initialStartMins ?? 20 * 60;
  const firstEnd = initialEndMins && initialEndMins > firstStart ? initialEndMins : firstStart + 60;

  const [days, setDays] = useState<SlotDay[]>([initialDay]);
  const [startMins, setStartMins] = useState(firstStart);
  const [endMins, setEndMins] = useState(Math.min(firstEnd, 1440));
  const [pending, setPending] = useState<DaySlot[]>([]);

  const [booked, setBooked] = useState<Record<string, BookedClass[]>>({});
  const [openSlots, setOpenSlots] = useState<DaySlot[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const [showBusy, setShowBusy] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>("any");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bumped by "try again" to run the load once more
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<SlotsLoadReply>("/api/teacher-portal/slots/interested")
      .then((json) => {
        if (!json.success) throw new Error(json.message || "load failed");
        if (cancelled) return;
        setBooked(json.bookedByDay || {});
        setOpenSlots((json.interestedSlots || []).filter((s) => s.status === "open"));
        setCourses(json.courses || []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const retryLoad = () => {
    setLoadState("loading");
    setLoadAttempt((n) => n + 1);
  };

  const current: Range = { startMins, endMins };
  const duration = endMins - startMins;

  const rangeIssue =
    endMins <= startMins ? "শেষের সময় শুরুর সময়ের পরে হতে হবে।" : duration < MIN_SLOT_MINS ? "স্লট কমপক্ষে ১৫ মিনিটের হতে হবে।" : endMins > 1440 ? "স্লট মধ্যরাতের আগে শেষ হতে হবে।" : null;

  // Plain-language reasons the chosen time cannot be added, one per day it clashes on
  const clashes = useMemo(() => {
    if (rangeIssue) return [];
    const chosen: Range = { startMins, endMins };
    const out: string[] = [];
    for (const day of days) {
      const classHit = (booked[day] || []).find((b) => overlaps(b, chosen));
      if (classHit) {
        out.push(`${DAY_LABELS[day]}: ${rangeLabel(classHit)} এ ${classHit.studentName}-এর ক্লাস আছে`);
        continue;
      }
      const openHit = openSlots.find((s) => s.day === day && overlaps(s, chosen));
      if (openHit) {
        out.push(`${DAY_LABELS[day]}: ${rangeLabel(openHit)} এ আপনার স্লট আগেই দেওয়া আছে`);
        continue;
      }
      const listed = pending.find((s) => s.day === day && overlaps(s, chosen));
      if (listed) out.push(`${DAY_LABELS[day]}: ${rangeLabel(listed)} নিচের তালিকায় আগেই যোগ করা আছে`);
    }
    return out;
  }, [rangeIssue, days, booked, openSlots, pending, startMins, endMins]);

  const canUseBuilder = !rangeIssue && clashes.length === 0 && days.length > 0;

  // Time that is free on every selected day: whatever any selected day has busy is taken out
  const freeChips = useMemo(() => {
    const busy: Range[] = days.flatMap((day) => [...(booked[day] || []), ...openSlots.filter((s) => s.day === day), ...pending.filter((s) => s.day === day)]);
    return freeGaps(busy);
  }, [days, booked, openSlots, pending]);

  // With nothing in the list yet, the time being picked is itself what gets submitted: open, pick, submit.
  const toSubmit: DaySlot[] = pending.length > 0 ? pending : canUseBuilder ? days.map((day) => ({ day, startMins, endMins })) : [];

  const toggleDay = (day: SlotDay) => {
    setFormError(null);
    setDays((prev) => sortDays(prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const setStart = (value: number) => {
    setFormError(null);
    setStartMins(value);
    // Keep the length the teacher already chose, so changing only the start moves the whole slot
    setEndMins(Math.min(value + Math.max(duration, MIN_SLOT_MINS), 1440));
  };

  const pickRange = (r: Range) => {
    setFormError(null);
    setStartMins(r.startMins);
    setEndMins(r.endMins);
  };

  const addToList = () => {
    if (!canUseBuilder) return;
    setFormError(null);
    setPending((prev) => [...prev, ...days.map((day) => ({ day, startMins, endMins }))]);
    // Move on to the slot right after, so a second one is a single tap away
    if (endMins + duration <= 1440) {
      setStartMins(endMins);
      setEndMins(endMins + duration);
    }
  };

  const removePending = (target: DaySlot) => {
    setFormError(null);
    setPending((prev) => prev.filter((s) => s !== target));
  };

  const handleSubmit = async () => {
    if (toSubmit.length === 0) {
      setFormError(rangeIssue || clashes[0] || "অনুগ্রহ করে অন্তত একটি দিন ও সময় বেছে নিন।");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const dayWiseSlots = SLOT_DAYS.filter((d) => toSubmit.some((s) => s.day === d)).map((day) => ({
        day,
        timeSlots: toSubmit
          .filter((s) => s.day === day)
          .map((s) => ({
            startTime: minsToDisplay(s.startMins),
            endTime: minsToDisplay(s.endMins),
            duration: s.endMins - s.startMins,
          })),
      }));

      const json = await api.post<{ success?: boolean; message?: string }>("/api/teacher-portal/slots/interested", {
        dayWiseSlots,
        courses: selectedCourses,
        targetAudience: audience,
        note: note.trim(),
      });
      if (!json.success) throw new Error(json.message || "স্লট সাবমিট করা যায়নি।");

      successFeedback();
      onSuccess(json.message || `${toSubmit.length} টি নতুন স্লট যুক্ত হয়েছে!`);
      onClose();
    } catch (err) {
      setFormError(errorMessage(err, "স্লট সাবমিট করা যায়নি। আবার চেষ্টা করুন।"));
    } finally {
      setSubmitting(false);
    }
  };

  const busyOnSelectedDays = days.filter((d) => (booked[d] || []).length > 0);
  const anyPresetBlocked = PRESETS.some((p) => {
    const r = { startMins: p.start, endMins: p.start + p.duration };
    return days.some((d) => (booked[d] || []).some((b) => overlaps(b, r)));
  });

  return (
    <Sheet
      visible
      full
      // The sheet stays up while the slots are being saved
      onClose={submitting ? () => {} : onClose}
      title="পড়াতে আগ্রহী স্লট যুক্ত করুন"
      subtitle="দিন বেছে নিন, সময় দিন — ব্যস্ত সময় নিজে থেকেই বাদ যাবে"
      footer={
        <>
          {formError ? <Banner tone="danger" message={formError} /> : null}
          <Row gap={10}>
            <Button title="বাতিল" variant="secondary" onPress={onClose} disabled={submitting} />
            <Button
              title={submitting ? "যুক্ত হচ্ছে..." : toSubmit.length > 0 ? `সাবমিট করুন (${toSubmit.length} টি স্লট)` : "সাবমিট করুন"}
              icon="check"
              loading={submitting}
              disabled={toSubmit.length === 0}
              onPress={() => void handleSubmit()}
              style={{ flex: 1 }}
            />
          </Row>
        </>
      }
    >
      {/* ── Step 1: days ── */}
      <View style={{ gap: 8 }}>
        <Row justify="space-between" wrap>
          <T variant="label" color="muted">
            ১. কোন কোন দিন?
          </T>
          <Row gap={14}>
            <Pressable onPress={() => setDays([...SLOT_DAYS])} hitSlop={10} accessibilityRole="button">
              <T variant="smallStrong" color="primary" style={{ textDecorationLine: "underline" }}>
                সব দিন
              </T>
            </Pressable>
            <Pressable onPress={() => setDays(SLOT_DAYS.filter((d) => d !== "friday"))} hitSlop={10} accessibilityRole="button">
              <T variant="smallStrong" color="primary" style={{ textDecorationLine: "underline" }}>
                শুক্রবার বাদে
              </T>
            </Pressable>
          </Row>
        </Row>
        {DAY_ROWS.map((row, rowIndex) => (
          <Row key={rowIndex} gap={6}>
            {row.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={{ flex: 1 }} />;
              const selected = days.includes(day);
              const bookedCount = (booked[day] || []).length;
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={DAY_LABELS[day]}
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: selected ? c.primary : c.border,
                    backgroundColor: selected ? c.primary : c.surface,
                  }}
                >
                  <T variant="smallStrong" color={selected ? "#ffffff" : "text"} weight="800" style={{ textTransform: "uppercase" }}>
                    {DAY_LABELS[day].slice(0, 3)}
                  </T>
                  {bookedCount > 0 ? (
                    <T variant="caption" color={selected ? "rgba(255,255,255,0.85)" : "muted"} style={{ fontSize: 10 }}>
                      {bookedCount} ক্লাস
                    </T>
                  ) : null}
                </Pressable>
              );
            })}
          </Row>
        ))}
      </View>

      {/* ── Step 2: time ── */}
      <View style={{ gap: 12 }}>
        <T variant="label" color="muted">
          ২. কোন সময়?
        </T>

        {/* Free time on the chosen days: one tap fills the time */}
        <View style={{ gap: 8, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: `${c.success}40`, backgroundColor: c.successSoft }}>
          <T variant="smallStrong" color="success">
            আপনার খালি সময় — ট্যাপ করে বেছে নিন
            {days.length > 1 ? " (সব নির্বাচিত দিনে খালি)" : ""}
          </T>
          {loadState === "loading" ? (
            <Row gap={8} accessibilityLabel="খালি সময় লোড হচ্ছে">
              <Skeleton width={140} height={36} />
              <Skeleton width={140} height={36} />
            </Row>
          ) : loadState === "error" ? (
            <View style={{ gap: 6 }}>
              <T variant="small" color="danger" weight="600">
                খালি সময় আনা যায়নি। নিচে নিজে সময় দিতে পারেন।
              </T>
              <Pressable onPress={retryLoad} hitSlop={10} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 32 }}>
                <Icon name="refresh-cw" size={13} color={c.dangerText} />
                <T variant="smallStrong" color="danger" style={{ textDecorationLine: "underline" }}>
                  আবার চেষ্টা করুন
                </T>
              </Pressable>
            </View>
          ) : days.length === 0 ? (
            <T variant="small" color="muted">
              আগে অন্তত একটি দিন বেছে নিন।
            </T>
          ) : freeChips.length === 0 ? (
            <T variant="small" color="muted">
              নির্বাচিত দিনগুলোতে সবার জন্য মিল আছে এমন খালি সময় নেই। কম দিন বেছে দেখুন।
            </T>
          ) : (
            <Row gap={6} wrap>
              {freeChips.map((gap) => (
                <Pill
                  key={`${gap.startMins}-${gap.endMins}`}
                  label={rangeLabel(gap)}
                  extra={`(${durationLabel(gap.endMins - gap.startMins)})`}
                  icon="clock"
                  tone="success"
                  active={sameRange(gap, current)}
                  onPress={() => pickRange(gap)}
                />
              ))}
            </Row>
          )}
        </View>

        {/* Free choice of start and end */}
        <Row gap={12} align="flex-start">
          <TimeField
            label="শুরু"
            value={toInputValue(startMins)}
            onChange={(value) => {
              const v = fromInputValue(value);
              if (v !== null) setStart(v);
            }}
            containerStyle={{ flex: 1 }}
          />
          <TimeField
            label="শেষ"
            value={toInputValue(endMins)}
            onChange={(value) => {
              const v = fromInputValue(value);
              if (v !== null) {
                setFormError(null);
                setEndMins(v);
              }
            }}
            containerStyle={{ flex: 1 }}
          />
        </Row>

        <Row gap={6} wrap>
          <T variant="smallStrong" color="muted">
            ব্যাপ্তি:
          </T>
          {DURATION_CHOICES.map((m) => (
            <Pill
              key={m}
              label={durationLabel(m)}
              tone="neutral"
              active={duration === m}
              onPress={() => {
                setFormError(null);
                setEndMins(Math.min(startMins + m, 1440));
              }}
            />
          ))}
          {duration > 0 && !DURATION_CHOICES.includes(duration) ? (
            <View style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: c.primarySoft }}>
              <T variant="smallStrong" color="primary">
                {durationLabel(duration)}
              </T>
            </View>
          ) : null}
        </Row>

        <View style={{ gap: 6 }}>
          <T variant="smallStrong" color="muted">
            জনপ্রিয় সময়:
          </T>
          <Row gap={6} wrap>
            {PRESETS.map((p) => {
              const r = { startMins: p.start, endMins: p.start + p.duration };
              const blocked = days.some((d) => (booked[d] || []).some((b) => overlaps(b, r)));
              return (
                <Pill
                  key={`${p.start}-${p.duration}`}
                  label={rangeLabel(r)}
                  icon={blocked ? "lock" : undefined}
                  tone={blocked ? "danger" : "neutral"}
                  strike={blocked}
                  active={!blocked && sameRange(r, current)}
                  onPress={() => pickRange(r)}
                  accessibilityLabel={blocked ? `${rangeLabel(r)}: এই সময়ে ক্লাস আছে` : rangeLabel(r)}
                />
              );
            })}
          </Row>
          {anyPresetBlocked ? (
            <Row gap={6}>
              <Icon name="lock" size={11} color={c.dangerText} />
              <T variant="caption" color="danger">
                এই সময়ে ক্লাস আছে
              </T>
            </Row>
          ) : null}
        </View>

        {/* Why the chosen time cannot be added, shown before the teacher presses anything */}
        {rangeIssue || clashes.length > 0 ? (
          <View accessibilityRole="alert" style={{ gap: 4, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: `${c.danger}40`, backgroundColor: c.dangerSoft }}>
            {rangeIssue ? (
              <T variant="small" color="danger" weight="600">
                {rangeIssue}
              </T>
            ) : null}
            {clashes.map((clash) => (
              <T key={clash} variant="small" color="danger" weight="600">
                {clash}
              </T>
            ))}
          </View>
        ) : null}

        {busyOnSelectedDays.length > 0 ? (
          <View style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt }}>
            <Pressable onPress={() => setShowBusy((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showBusy }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 }}>
              <Icon name="lock" size={12} color={c.textMuted} />
              <T variant="smallStrong" color="muted" style={{ flex: 1 }}>
                এই দিনগুলোর ব্যস্ত সময় দেখুন
              </T>
              <Icon name={showBusy ? "chevron-up" : "chevron-down"} size={15} color={c.textFaint} />
            </Pressable>
            {showBusy ? (
              <View style={{ gap: 6, marginTop: 6 }}>
                {busyOnSelectedDays.map((day) => (
                  <T key={day} variant="small" color="muted">
                    <T variant="smallStrong" weight="800">
                      {DAY_LABELS[day].slice(0, 3)}:
                    </T>{" "}
                    {(booked[day] || []).map((b) => `${rangeLabel(b)} (${b.studentName})`).join(", ")}
                  </T>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <ActionButton title="তালিকায় রাখুন — আরও সময় যোগ করতে চাইলে" icon="plus" tone="warning" look="soft" block disabled={!canUseBuilder} onPress={addToList} />
      </View>

      {/* ── The list so far ── */}
      {pending.length > 0 ? (
        <View style={{ gap: 8, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: `${c.primary}33`, backgroundColor: c.primarySoft }}>
          <T variant="smallStrong" weight="800">
            তালিকায় যোগ করা স্লট ({pending.length} টি)
          </T>
          {SLOT_DAYS.filter((d) => pending.some((s) => s.day === d)).map((day) => (
            <Row key={day} gap={6} wrap>
              <T variant="caption" color="muted" weight="800" style={{ width: 36, textTransform: "uppercase" }}>
                {DAY_LABELS[day].slice(0, 3)}
              </T>
              {pending
                .filter((s) => s.day === day)
                .map((s) => (
                  <View
                    key={`${s.startMins}-${s.endMins}`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingLeft: 10, paddingRight: 4, borderRadius: radius.md, borderWidth: 1, borderColor: `${c.primary}55`, backgroundColor: c.surface }}
                  >
                    <Icon name="clock" size={13} color={c.primary} />
                    <T variant="smallStrong">{rangeLabel(s)}</T>
                    <Pressable
                      onPress={() => removePending(s)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${DAY_LABELS[day]} ${rangeLabel(s)} বাদ দিন`}
                      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="x" size={15} color={c.textMuted} />
                    </Pressable>
                  </View>
                ))}
            </Row>
          ))}
          {canUseBuilder ? (
            <T variant="caption" color="muted">
              উপরে বেছে রাখা সময়টিও চাইলে আগে “তালিকায় রাখুন” চাপুন — না চাপলে শুধু এই তালিকা সাবমিট হবে।
            </T>
          ) : null}
        </View>
      ) : null}

      {/* ── Optional ── */}
      <View style={{ padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt }}>
        <Pressable onPress={() => setShowOptional((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showOptional }} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 }}>
          <T variant="smallStrong" style={{ flex: 1 }}>
            কোর্স / শিক্ষার্থী পছন্দ ও মন্তব্য (ঐচ্ছিক)
          </T>
          <Icon name={showOptional ? "chevron-up" : "chevron-down"} size={16} color={c.textFaint} />
        </Pressable>

        {showOptional ? (
          <View style={{ gap: 12, marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            <View style={{ gap: 6 }}>
              <T variant="smallStrong" color="muted">
                কোর্স পছন্দ (না বাছলে যেকোনো কোর্স):
              </T>
              {courses.length === 0 ? (
                <T variant="small" color="faint">
                  কোনো কোর্স পাওয়া যায়নি।
                </T>
              ) : (
                <Row gap={6} wrap>
                  {courses.map((course) => {
                    const on = selectedCourses.includes(course._id);
                    return (
                      <Pill
                        key={course._id}
                        label={course.title}
                        tone="neutral"
                        active={on}
                        onPress={() => setSelectedCourses((prev) => (on ? prev.filter((id) => id !== course._id) : [...prev, course._id]))}
                      />
                    );
                  })}
                </Row>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <T variant="smallStrong" color="muted">
                কাদের পড়াতে চান:
              </T>
              <Row gap={6} wrap>
                {AUDIENCES.map((a) => (
                  <Pill key={a.key} label={a.label} tone="neutral" active={audience === a.key} onPress={() => setAudience(a.key)} />
                ))}
              </Row>
            </View>

            <Input label="মন্তব্য:" value={note} onChangeText={setNote} maxLength={200} placeholder="যেমন: নতুন শিক্ষার্থীদের তাজবীদ পড়াতে আগ্রহী" />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
