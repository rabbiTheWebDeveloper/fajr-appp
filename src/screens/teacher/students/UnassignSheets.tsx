import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { copyText, openWhatsApp } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Button, Input, MIcon, Row, Sheet, T } from "@/ui";

import { buildUnassignMessage, useLast, type UnassignStatement, type UnassignTarget } from "@/screens/teacher/students/shared";

interface ConfirmUnassignSheetProps {
  /** The student about to be unassigned; null keeps the sheet closed */
  student: UnassignTarget | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

/** "Unassign Student?": asks for an optional reason before the student is removed from the teacher's list */
export function ConfirmUnassignSheet({ student, loading, onCancel, onConfirm }: ConfirmUnassignSheetProps) {
  const { c } = useTheme();
  const [note, setNote] = useState("");
  const shown = useLast(student);

  useEffect(() => {
    if (student) setNote("");
  }, [student]);

  // While the request is in flight the sheet cannot be dismissed, as the web disables Cancel
  const close = loading ? () => {} : onCancel;

  return (
    <Sheet
      visible={!!student}
      onClose={close}
      title="Unassign Student?"
      subtitle="This action will be logged to history"
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} disabled={loading} onPress={onCancel} />
          <Button title={loading ? "Unassigning..." : "Yes, Unassign"} icon="user-minus" variant="danger" block style={{ flex: 1 }} loading={loading} onPress={() => onConfirm(note)} />
        </Row>
      }
    >
      <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.warningSoft, borderWidth: 1, borderColor: `${c.warning}33`, gap: 2 }}>
        <T variant="bodyStrong">{shown?.fullName}</T>
        <T variant="mono" color="muted">
          {shown?.studentId}
        </T>
      </View>
      <Input label="Reason (optional)" value={note} onChangeText={setNote} placeholder="e.g. Course completed, transferred..." multiline editable={!loading} />
    </Sheet>
  );
}

interface UnassignStatementSheetProps {
  /** What the statement is about; null keeps the sheet closed */
  data: UnassignStatement | null;
  onClose: () => void;
}

/** After an unassign: the official statement, ready to send to the student on WhatsApp or to copy */
export function UnassignStatementSheet({ data, onClose }: UnassignStatementSheetProps) {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the text on screen while the sheet slides away
  const shown = useLast(data);
  const message = useMemo(() => (shown ? buildUnassignMessage(shown) : ""), [shown]);
  const phone = shown?.student.phone || "";

  useEffect(() => {
    setCopied(false);
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, [data]);

  const handleCopy = async () => {
    await copyText(message, "Copied!");
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet
      visible={!!data}
      onClose={onClose}
      title="Student Unassigned"
      subtitle="Send the official statement via WhatsApp"
      footer={
        <>
          {/* With no phone on file WhatsApp opens its own contact picker with the text filled in */}
          <Button title="Send on WhatsApp" icon="send" variant="success" block onPress={() => void openWhatsApp(phone, message)} />
          <Row gap={10}>
            <Button title={copied ? "Copied!" : "Copy Text"} icon={copied ? "check-circle" : "copy"} variant="outline" block style={{ flex: 1 }} onPress={() => void handleCopy()} />
            <Button title="Done" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          </Row>
        </>
      }
    >
      <View style={{ padding: 14, borderRadius: radius.md, backgroundColor: c.successSoft, borderWidth: 1, borderColor: `${c.success}33`, gap: 8 }}>
        <Row gap={8}>
          <MIcon name="whatsapp" size={18} color={c.success} />
          <T variant="smallStrong" color="success">
            WhatsApp Message Preview
          </T>
        </Row>
        <T variant="small" selectable style={{ lineHeight: 19 }}>
          {message}
        </T>
      </View>

      {phone ? (
        <Row gap={8} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
          <MIcon name="whatsapp" size={16} color={c.success} />
          <T variant="small" color="muted" style={{ flex: 1 }}>
            Sending to:{" "}
            <T variant="smallStrong" selectable>
              {phone}
            </T>
          </T>
        </Row>
      ) : null}
    </Sheet>
  );
}
