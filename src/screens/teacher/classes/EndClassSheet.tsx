import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useNow } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Avatar, Badge, Banner, Button, GradientCard, Icon, Input, Row, Sheet, T, type IconName } from "@/ui";

import { ActionButton, useLast } from "@/screens/teacher/classes/parts";
import { avatarUri, classStudent, type Attendance, type ClassSession } from "@/screens/teacher/classes/types";

interface EndClassSheetProps {
  /** The class being ended; null closes the sheet */
  cls: ClassSession | null;
  acting: boolean;
  /** A failed "End & Save" or topic update, kept on show above the buttons */
  error: string;
  onClose: () => void;
  onConfirm: (attendance: Attendance, topic: string) => void;
  /** Saves the topic straight away; resolves true when it was saved */
  onUpdateTopic: (classId: string, topic: string) => Promise<boolean>;
}

function AttendanceChoice({ selected, tone, icon, title, caption, onPress }: { selected: boolean; tone: "success" | "danger"; icon: IconName; title: string; caption: string; onPress: () => void }) {
  const { c } = useTheme();
  const solid = tone === "success" ? c.success : c.danger;
  const soft = tone === "success" ? c.successSoft : c.dangerSoft;
  const fg = tone === "success" ? c.successText : c.dangerText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}: ${caption}`}
      style={{ flex: 1, alignItems: "center", gap: 6, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: selected ? solid : c.border, backgroundColor: selected ? soft : "transparent" }}
    >
      {selected ? (
        <View style={{ position: "absolute", top: 8, right: 8 }}>
          <Icon name="check-circle" size={16} color={solid} />
        </View>
      ) : null}
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: selected ? `${solid}33` : c.surfaceAlt }}>
        <Icon name={icon} size={22} color={selected ? fg : c.textFaint} />
      </View>
      <T variant="bodyStrong" color={selected ? fg : "muted"}>
        {title}
      </T>
      <T variant="caption" color="faint" center>
        {caption}
      </T>
    </Pressable>
  );
}

/** "End Class": confirm or correct the topic, mark the student present or absent, then end and save */
export function EndClassSheet({ cls, acting, error, onClose, onConfirm, onUpdateTopic }: EndClassSheetProps) {
  const shown = useLast(cls);
  const now = useNow(15_000);
  const [attendance, setAttendance] = useState<Attendance>("present");
  const [topic, setTopic] = useState("");
  const [updatingTopic, setUpdatingTopic] = useState(false);
  const [topicSaved, setTopicSaved] = useState(false);

  // A newly opened class starts from its own topic and "Present". Keyed on the class id only:
  // saving the topic replaces the class object and must not reset the attendance choice.
  const openId = cls?._id ?? null;
  const openTopic = useRef("");
  openTopic.current = cls?.topic || "";
  useEffect(() => {
    if (!openId) return;
    setTopic(openTopic.current);
    setAttendance("present");
    setTopicSaved(false);
  }, [openId]);

  useEffect(() => {
    if (!topicSaved) return undefined;
    const timer = setTimeout(() => setTopicSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [topicSaved]);

  const student = shown ? classStudent(shown) : null;
  const startedMs = shown?.startedAt ? new Date(shown.startedAt).getTime() : NaN;
  const elapsedMins = Number.isFinite(startedMs) ? Math.max(0, Math.round((now.getTime() - startedMs) / 60000)) : 0;
  const isTopicModified = topic.trim() !== (shown?.topic || "").trim();

  const saveTopic = async () => {
    if (!shown || updatingTopic || !isTopicModified) return;
    setUpdatingTopic(true);
    try {
      if (await onUpdateTopic(shown._id, topic.trim())) setTopicSaved(true);
    } finally {
      setUpdatingTopic(false);
    }
  };

  return (
    <Sheet
      visible={!!cls}
      onClose={onClose}
      title="End Class"
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          <Button title="End & Save" icon="stop-circle" variant={attendance === "present" ? "success" : "danger"} block style={{ flex: 1 }} loading={acting} onPress={() => onConfirm(attendance, topic.trim())} />
        </Row>
      }
    >
      {shown ? (
        <>
          <GradientCard gradient="navy" padding={14}>
            <Row gap={12}>
              <Avatar uri={avatarUri(student?.avatar)} name={student?.fullName} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {student?.fullName || "—"}
                </Text>
                <Row gap={6} wrap>
                  <T variant="small" color="onDarkMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {shown.course?.title || "—"}
                  </T>
                  {shown.classId ? (
                    <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700", fontFamily: "monospace" }}>{shown.classId}</Text>
                    </View>
                  ) : null}
                </Row>
              </View>
            </Row>
            <Row gap={8} style={{ marginTop: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Icon name="clock" size={15} color="#ffffff" />
              <T variant="small" color="onDarkMuted">
                Session ran for{" "}
                <T variant="smallStrong" color="onDark">
                  {elapsedMins} min
                </T>
              </T>
            </Row>
          </GradientCard>

          {/* Topic */}
          <View style={{ gap: 6 }}>
            <Row justify="space-between">
              <Row gap={8}>
                <Icon name="book-open" size={15} />
                <T variant="bodyStrong">Class Topic</T>
              </Row>
              {topicSaved ? <Badge label="Topic updated!" tone="success" icon="check" /> : null}
            </Row>
            <Row gap={8} align="flex-start">
              <Input
                containerStyle={{ flex: 1 }}
                value={topic}
                onChangeText={setTopic}
                placeholder="Type or update topic (e.g., Surah Al-Baqarah Ayah 1-10...)"
                returnKeyType="done"
                onSubmitEditing={() => void saveTopic()}
              />
              <TopicSaveButton saved={topicSaved} modified={isTopicModified} loading={updatingTopic} onPress={() => void saveTopic()} />
            </Row>
            <T variant="caption" color="faint">
              Update what was covered today. This will be saved with the completed class.
            </T>
          </View>

          {/* Attendance */}
          <View style={{ gap: 8 }}>
            <Row gap={8}>
              <Icon name="clipboard" size={15} />
              <T variant="bodyStrong">Mark Student Attendance</T>
            </Row>
            <Row gap={12} align="stretch">
              <AttendanceChoice selected={attendance === "present"} tone="success" icon="user-check" title="Present" caption="Student attended" onPress={() => setAttendance("present")} />
              <AttendanceChoice selected={attendance === "absent"} tone="danger" icon="user-x" title="Absent" caption="Didn't attend" onPress={() => setAttendance("absent")} />
            </Row>
          </View>

          {error ? <Banner tone="danger" message={error} /> : null}
        </>
      ) : null}
    </Sheet>
  );
}

/** "Update" beside the topic box: grey until the text changes, blue while there is something to save, green once saved */
function TopicSaveButton({ saved, modified, loading, onPress }: { saved: boolean; modified: boolean; loading: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const active = saved || modified;
  return (
    <ActionButton
      title={saved ? "Saved" : "Update"}
      icon={saved ? "check" : "save"}
      bg={saved ? c.success : modified ? c.primary : c.surfaceAlt}
      fg={active ? "#ffffff" : c.textFaint}
      loading={loading}
      disabled={!active}
      onPress={onPress}
      style={{ height: 46 }}
    />
  );
}
