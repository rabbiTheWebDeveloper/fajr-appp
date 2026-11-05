import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { successFeedback } from "@/lib/device";
import { formatDate, formatTime12 } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius, type Tone } from "@/theme/palette";
import { Avatar, Badge, Banner, Button, Field, GradientCard, Icon, Input, Row, Sheet, T } from "@/ui";

import { capitalize, dayShort, photoUrl, scheduleDayTimes, sendJson, type LookupReply } from "@/screens/teacher/students/shared";

function lookupStatusTone(status?: string): Tone {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  return "warning";
}

function Detail({ label, value, valueColor, capitalize, wide }: { label: string; value: string; valueColor?: "primary"; capitalize?: boolean; wide?: boolean }) {
  return (
    <View style={{ width: wide ? "100%" : "47%", flexGrow: 1, gap: 2 }}>
      <T variant="label" color="faint">
        {label}
      </T>
      <T variant="bodyStrong" color={valueColor} numberOfLines={wide ? 2 : 1} selectable style={capitalize ? { textTransform: "capitalize" } : undefined}>
        {value}
      </T>
    </View>
  );
}

interface AssignStudentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called as soon as the student has been assigned to this teacher (reload the list) */
  onAssigned: () => void;
}

/**
 * "Add New Student": look a student up by their Student ID, see whether they are admitted,
 * and assign them to yourself. Only an admitted, active student who is not already yours can be assigned.
 */
export function AssignStudentSheet({ visible, onClose, onAssigned }: AssignStudentSheetProps) {
  const { c } = useTheme();
  const [inputId, setInputId] = useState("");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<LookupReply | null>(null);
  const [lookErr, setLookErr] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignErr, setAssignErr] = useState("");
  const [assignOk, setAssignOk] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Every opening starts from an empty search
  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!visible) return;
    setInputId("");
    setLooking(false);
    setResult(null);
    setLookErr("");
    setAssigning(false);
    setAssignErr("");
    setAssignOk(false);
  }, [visible]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const handleLookup = async () => {
    const id = inputId.trim().toUpperCase();
    if (!id) {
      setLookErr("Please enter a Student ID.");
      return;
    }
    setLooking(true);
    setLookErr("");
    setResult(null);
    setAssignErr("");
    setAssignOk(false);
    const reply = await sendJson<LookupReply>("POST", "/api/teacher-portal/students/lookup", { studentId: id }, "Student not found.");
    if (reply.ok) setResult(reply.data);
    else setLookErr(reply.message);
    setLooking(false);
  };

  const handleAssign = async () => {
    const studentId = result?.student?.studentId;
    if (!studentId) return;
    setAssigning(true);
    setAssignErr("");
    const reply = await sendJson("POST", "/api/teacher-portal/students/assign", { studentId }, "Failed to assign student.");
    setAssigning(false);
    if (!reply.ok) {
      setAssignErr(reply.message);
      return;
    }
    successFeedback();
    setAssignOk(true);
    onAssigned();
    // Leave the success note on screen for a moment, then close
    closeTimer.current = setTimeout(onClose, 1200);
  };

  const stu = result?.student;
  const sch = result?.schedule;
  const canAssign = !!stu && !result?.isAlreadyAssigned && !!result?.isAdmitted && !assignOk;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add New Student"
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" block style={{ flex: 1 }} onPress={onClose} />
          {canAssign ? <Button title={assigning ? "Assigning…" : "Assign to Me"} icon="user-plus" block style={{ flex: 1 }} loading={assigning} onPress={() => void handleAssign()} /> : null}
        </Row>
      }
    >
      <Banner
        tone="primary"
        icon="search"
        title="Search by Student ID"
        message="Enter the student's ID (e.g. STUM08202600001) to look them up. The system will verify their admission status before assigning."
      />

      <Field label="Student ID" required>
        <Row gap={8}>
          <Input
            value={inputId}
            onChangeText={(text) => {
              setInputId(text.toUpperCase());
              setLookErr("");
              setResult(null);
            }}
            placeholder="e.g. STUM08202600001"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void handleLookup()}
            containerStyle={{ flex: 1 }}
          />
          <Button title={looking ? "Searching…" : "Search"} icon="search" loading={looking} disabled={!inputId.trim()} style={{ height: 46 }} onPress={() => void handleLookup()} />
        </Row>
      </Field>
      {lookErr ? <Banner tone="danger" message={lookErr} /> : null}

      {stu ? (
        <>
          {result?.isAdmitted ? (
            <Banner tone="success" title="Student is Admitted & Active ✓" message="This student can be assigned to your class." />
          ) : result?.isSuspended ? (
            <Banner tone="danger" title="Student Suspended" message="Contact admin to resolve." />
          ) : (
            <Banner tone="warning" icon="alert-circle" title="Not Yet Approved / Inactive" message={`Status: ${capitalize(stu.status)}. Must be approved & active first.`} />
          )}

          {result?.isAlreadyAssigned ? <Banner tone="primary" icon="check-circle" message="This student is already assigned to you." /> : null}

          <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, overflow: "hidden" }}>
            <GradientCard gradient="navy" padding={14} style={{ borderRadius: 0 }}>
              <Row gap={12}>
                <Avatar uri={photoUrl(stu.avatar)} name={stu.fullName || "S"} size={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T variant="title" color="onDark" numberOfLines={1}>
                    {stu.fullName}
                  </T>
                  <T variant="mono" color="onDarkMuted" selectable>
                    {stu.studentId}
                  </T>
                </View>
                <Badge tone={lookupStatusTone(stu.status)} solid label={(stu.status ?? "").toUpperCase()} />
              </Row>
            </GradientCard>

            <View style={{ padding: 14, gap: 12 }}>
              <Row wrap gap={12} align="flex-start">
                <Detail label="Gender" value={stu.gender || "—"} capitalize />
                <Detail label="Phone" value={stu.phone || "—"} />
                <Detail label="Course" value={stu.course?.title || "Not assigned"} valueColor="primary" wide />
                {stu.admissionDate ? <Detail label="Admission Date" value={formatDate(stu.admissionDate, "medium")} wide /> : null}
              </Row>

              <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, gap: 8 }}>
                {sch ? (
                  <>
                    <Row gap={6}>
                      <Icon name="calendar" size={12} color={c.textFaint} />
                      <T variant="label" color="faint">
                        Class Schedule
                      </T>
                    </Row>
                    <Row wrap gap={6}>
                      {scheduleDayTimes(sch).map((dt, index) => (
                        <Badge key={`${dt.day ?? ""}-${index}`} tone="warning" icon="clock" label={`${dayShort(dt.day)}: ${formatTime12(dt.startTime)}`} />
                      ))}
                      {sch.duration ? <Badge tone="neutral" label={`${sch.duration} min`} /> : null}
                      {sch.type ? <Badge tone="primary" label={sch.type.toUpperCase()} /> : null}
                    </Row>
                  </>
                ) : (
                  <Row gap={8} align="flex-start">
                    <Icon name="calendar" size={14} color={c.textFaint} style={{ marginTop: 2 }} />
                    <T variant="small" color="faint" style={{ flex: 1, fontStyle: "italic" }}>
                      No schedule set yet — you can set one after assignment.
                    </T>
                  </Row>
                )}
              </View>
            </View>
          </View>

          {assignErr ? <Banner tone="danger" message={assignErr} /> : null}
          {assignOk ? <Banner tone="success" message="Student assigned successfully! Refreshing…" /> : null}
        </>
      ) : null}
    </Sheet>
  );
}
