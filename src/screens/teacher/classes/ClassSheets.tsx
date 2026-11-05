import React, { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import { Button, Icon, Input, Row, Sheet, T } from "@/ui";

import { useLast } from "@/screens/teacher/classes/parts";
import { CLASS_TYPES, classStudent, classTypeTone, type ClassSession, type ClassType } from "@/screens/teacher/classes/types";

/* ───────────────────────── Meeting link editor ───────────────────────── */

interface MeetLinkSheetProps {
  cls: ClassSession | null;
  onClose: () => void;
  /** Saves the link; resolves "" when saved, or the message to show */
  onSave: (cls: ClassSession, meetLink: string) => Promise<string>;
}

/** Add or change the meeting link of a class (the website edits it inline on the card) */
export function MeetLinkSheet({ cls, onClose, onSave }: MeetLinkSheetProps) {
  const shown = useLast(cls);
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openId = cls?._id ?? null;
  const openLink = useRef("");
  openLink.current = cls?.meetLink || "";
  useEffect(() => {
    if (!openId) return;
    setLink(openLink.current);
    setError("");
  }, [openId]);

  const save = async () => {
    if (!shown || saving) return;
    setSaving(true);
    setError("");
    try {
      setError(await onSave(shown, link));
    } finally {
      setSaving(false);
    }
  };

  const student = shown ? classStudent(shown) : null;

  return (
    <Sheet
      visible={!!cls}
      onClose={onClose}
      title={shown?.meetLink ? "Edit meeting link" : "Add meeting link"}
      subtitle={shown ? [student?.fullName, shown.classId].filter(Boolean).join(" · ") : undefined}
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          <Button title="Save Link" icon="check" block style={{ flex: 1 }} loading={saving} disabled={!link.trim()} onPress={() => void save()} />
        </Row>
      }
    >
      <Input
        label="Meeting Link"
        required
        icon="video"
        value={link}
        onChangeText={setLink}
        placeholder="https://meet.google.com/xxx-xxxx-xxx"
        hint="Meeting link is required. Paste your Google Meet, Zoom, or video call link here."
        error={error || undefined}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
    </Sheet>
  );
}

/* ───────────────────────── Class type picker ───────────────────────── */

interface ClassTypeSheetProps {
  cls: ClassSession | null;
  onClose: () => void;
  onPick: (cls: ClassSession, classType: ClassType) => void;
}

/** Regular / Retake / Make-up: can be changed until the class starts */
export function ClassTypeSheet({ cls, onClose, onPick }: ClassTypeSheetProps) {
  const { c } = useTheme();
  const shown = useLast(cls);
  const current = shown?.classType || "regular";

  return (
    <Sheet visible={!!cls} onClose={onClose} title="Class Type" subtitle={shown?.classId || undefined}>
      {CLASS_TYPES.map((option) => {
        const active = option.value === current;
        const tone = toneColors(c, classTypeTone(option.value));
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (shown) onPick(shown, option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: active ? 2 : 1, borderColor: active ? tone.solid : c.border, backgroundColor: active ? tone.bg : "transparent" }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone.solid }} />
            <T variant="bodyStrong" color={active ? tone.fg : "text"} style={{ flex: 1 }}>
              {option.label}
            </T>
            {active ? <Icon name="check" size={18} color={tone.fg} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}
