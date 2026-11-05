import React, { useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useNow } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import { Avatar, Badge, Banner, Button, GradientCard, Icon, Row, Sheet, T, type IconName } from "@/ui";

/** The class the student is about to join, or has joined */
export interface Meeting {
  id: string;
  courseTitle: string;
  teacherName: string;
  /** "Monday · 2:00 PM – 2:45 PM" */
  scheduleLabel: string;
  meetLink: string | null;
}

/** 75 -> "01:15", 3725 -> "01:02:05" */
function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface LiveClassBannerProps {
  meeting: Meeting;
  /** When the student opened the classroom (ms) */
  startedAt: number;
  /** Opens the meeting again */
  onReturn: () => void;
  onEnd: () => void;
}

/**
 * Shown after the student has opened the classroom (Zoom / Meet), so the way back to it is one tap away.
 * The time is counted from the moment of joining, not by ticks: the app's timers sleep while the meeting app is in front.
 */
export function LiveClassBanner({ meeting, startedAt, onReturn, onEnd }: LiveClassBannerProps) {
  const { c } = useTheme();
  const now = useNow(1000);
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000));

  return (
    <GradientCard gradient="navy" style={{ gap: 14, borderWidth: 1, borderColor: "rgba(223,183,108,0.3)" }}>
      <Row gap={12} align="flex-start">
        <View style={{ width: 46, height: 46, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="video" size={22} color={c.gold} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={8} wrap>
            <Row gap={6} style={{ backgroundColor: c.success, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.onDark }} />
              <T variant="caption" color="onDark" weight="800">
                LIVE CLASS IN PROGRESS
              </T>
            </Row>
            <Row gap={5} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Icon name="clock" size={12} color={c.gold} />
              <T variant="mono" color="gold" accessibilityLabel={`Time in class ${formatElapsed(elapsed)}`}>
                {formatElapsed(elapsed)}
              </T>
            </Row>
          </Row>
          <T variant="title" color="onDark">
            {meeting.courseTitle || "Live Classroom"}
          </T>
          <T variant="small" color="onDarkMuted">
            Instructor: {meeting.teacherName || "FAJR Academy Teacher"}
          </T>
        </View>
      </Row>
      <Row gap={8} wrap>
        <Button title="Return to Classroom" icon="external-link" variant="gold" style={{ flexGrow: 1 }} onPress={onReturn} />
        <Button title="End Class" icon="phone-off" variant="danger" style={{ flexGrow: 1 }} onPress={onEnd} />
      </Row>
    </GradientCard>
  );
}

function ReadinessTile({ icon, label, checked, onToggle }: { icon: IconName; label: string; checked: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const on = toneColors(c, "success");
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: checked ? on.solid : c.border,
        backgroundColor: checked ? on.bg : c.surfaceAlt,
      }}
    >
      <Row gap={8} style={{ flex: 1 }}>
        <Icon name={icon} size={16} color={checked ? on.fg : c.textFaint} />
        <T variant="smallStrong" color={checked ? on.fg : "muted"} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </T>
      </Row>
      <Icon name="check-circle" size={16} color={checked ? on.fg : c.borderStrong} />
    </Pressable>
  );
}

interface JoinSheetProps {
  /** The class to join; null keeps the sheet closed */
  meeting: Meeting | null;
  onClose: () => void;
  /** Opens the meeting link */
  onJoin: (meeting: Meeting) => void;
}

/** The "Live Classroom Hub": who teaches, when, a device checklist, and the button that opens the class. */
export function JoinSheet({ meeting, onClose, onJoin }: JoinSheetProps) {
  const { c, isDark } = useTheme();
  const [micChecked, setMicChecked] = useState(true);
  const [cameraChecked, setCameraChecked] = useState(true);
  // The sheet slides away after `meeting` is cleared: keep showing the class it was opened for until it is gone
  const last = useRef<Meeting | null>(null);
  if (meeting) last.current = meeting;
  const shown = meeting ?? last.current;

  return (
    <Sheet
      visible={!!meeting}
      onClose={onClose}
      title={shown?.courseTitle || "Live Class Session"}
      footer={
        <>
          {shown?.meetLink ? (
            <Button title="Join Live Classroom" icon="video" iconRight="external-link" variant={isDark ? "primary" : "navy"} size="lg" block onPress={() => onJoin(shown)} />
          ) : (
            <View style={{ minHeight: 48, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }}>
              <T variant="bodyStrong" color="faint" center>
                Session link not yet provided by teacher
              </T>
            </View>
          )}
          <Button title="Close" variant="ghost" block onPress={onClose} />
        </>
      }
    >
      <Row gap={8} wrap>
        <Badge label="LIVE CLASSROOM HUB" tone="warning" />
        <Badge label="Session Ready" tone="success" icon="radio" />
      </Row>

      {/* Teacher and class timing */}
      <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: 14, gap: 12 }}>
        <Row gap={12}>
          <Avatar name={shown?.teacherName || "T"} size={40} />
          <View style={{ flex: 1 }}>
            <T variant="caption" color="muted">
              Assigned Instructor
            </T>
            <T variant="bodyStrong" weight="800">
              {shown?.teacherName || "FAJR Certified Teacher"}
            </T>
          </View>
        </Row>
        {shown?.scheduleLabel ? (
          <View>
            <T variant="label" color="faint">
              Class Schedule
            </T>
            <T variant="smallStrong" weight="800">
              {shown.scheduleLabel}
            </T>
          </View>
        ) : null}
      </View>

      <Banner
        tone="violet"
        icon="shield"
        title="In-App Secure Access Active"
        message="This meeting link is securely bound to your student profile. Direct links are kept private to protect classroom safety and student privacy."
      />

      {/* Pre-class readiness checklist */}
      <View style={{ gap: 10 }}>
        <T variant="label" color="faint">
          Pre-Class Device Readiness
        </T>
        <Row gap={10}>
          <ReadinessTile icon="mic" label="Microphone" checked={micChecked} onToggle={() => setMicChecked((v) => !v)} />
          <ReadinessTile icon="camera" label="Camera" checked={cameraChecked} onToggle={() => setCameraChecked((v) => !v)} />
        </Row>
      </View>
    </Sheet>
  );
}
