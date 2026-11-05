import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { MONTH_NAMES, academyClock, formatNumber } from "@/lib/format";
import { courseNameOf, type PageMessage, type ProfileForm, type StudentRecord } from "@/screens/student/settings/types";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Avatar, Banner, Button, Card, Divider, Icon, IconChip, Input, Row, Select, T, type Option } from "@/ui";

const GENDER_OPTIONS: Option[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/** "November 5, 2026" in academy time, as the website writes the admission date */
function longDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const clock = academyClock(date);
  return `${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()}`;
}

/** One read-only line of the academy's own record */
function RecordTile({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: "primary" | "warning" | "success" | "faint" }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, gap: 2 }}>
      <T variant="label" color="faint">
        {label}
      </T>
      <T variant={mono ? "mono" : "bodyStrong"} color={color} selectable style={mono ? { fontSize: 14, fontWeight: "800" } : undefined}>
        {value}
      </T>
    </View>
  );
}

export interface ProfileErrors {
  fullName?: string;
  age?: string;
}

interface ProfileTabProps {
  profile: StudentRecord;
  form: ProfileForm;
  errors: ProfileErrors;
  message: PageMessage | null;
  saving: boolean;
  uploading: boolean;
  onChange: (patch: Partial<ProfileForm>) => void;
  onPickPhoto: () => void;
  onSave: () => void;
}

/** "Profile & Guardian Info": the editable student and guardian details, and the read-only academic record */
export function ProfileTab({ profile, form, errors, message, saving, uploading, onChange, onPickPhoto, onSave }: ProfileTabProps) {
  const { c } = useTheme();
  const course = courseNameOf(profile);
  const admission = profile.admissionDate ? longDate(profile.admissionDate) : "";
  const monthlyFee = Number(profile.monthlyFee) || 0;

  return (
    <>
      <Card style={{ gap: 16 }}>
        <Row gap={12} align="center">
          <View style={{ flex: 1 }}>
            <T variant="title">Student & Guardian Details</T>
            <T variant="small" color="muted">
              Update student profile according to academy records
            </T>
          </View>
          <Pressable onPress={uploading ? undefined : onPickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo" accessibilityState={{ busy: uploading }} style={{ alignItems: "center", gap: 4 }}>
            <View>
              <Avatar uri={form.avatar || null} name={form.fullName || "S"} size={64} square style={{ borderWidth: 2, borderColor: c.primary }} />
              {uploading ? (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.overlay }}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              ) : (
                <View style={{ position: "absolute", right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, borderWidth: 2, borderColor: c.surface }}>
                  <Icon name="camera" size={12} color="#ffffff" />
                </View>
              )}
            </View>
            <T variant="caption" color="primary" style={{ marginTop: 4 }}>
              {uploading ? "Uploading..." : "Change"}
            </T>
          </Pressable>
        </Row>
        <Divider />

        {message ? <Banner tone={message.ok ? "success" : "danger"} message={message.text} /> : null}

        <Input label="Student Full Name" required value={form.fullName} onChangeText={(fullName) => onChange({ fullName })} placeholder="Enter student full name" error={errors.fullName} autoCapitalize="words" />
        <Select label="Gender" required title="Gender" value={form.gender} options={GENDER_OPTIONS} onChange={(gender) => onChange({ gender })} />
        <Input label="Father's Name" value={form.fatherName} onChangeText={(fatherName) => onChange({ fatherName })} placeholder="Father / Guardian name" autoCapitalize="words" />
        <Input label="Mother's Name" value={form.motherName} onChangeText={(motherName) => onChange({ motherName })} placeholder="Mother's name" autoCapitalize="words" />
        <Input label="Contact Phone Number" icon="phone" value={form.phone} onChangeText={(phone) => onChange({ phone })} placeholder="+880 1800 000000" keyboardType="phone-pad" />
        <Input label="WhatsApp Number (For Updates)" icon="message-circle" value={form.whatsappNumber} onChangeText={(whatsappNumber) => onChange({ whatsappNumber })} placeholder="WhatsApp number" keyboardType="phone-pad" />
        <Input
          label="Age (Years)"
          value={form.age}
          onChangeText={(age) => onChange({ age: age.replace(/[^0-9]/g, "") })}
          placeholder="e.g. 10"
          keyboardType="number-pad"
          maxLength={3}
          error={errors.age}
        />
        <Input label="Account Email (Verified Login)" icon="mail" value={profile.email || ""} disabled hint="This is your login email. It cannot be changed here." />

        <Divider />
        <Button title={saving ? "Saving Changes..." : "Save Changes"} icon="save" block loading={saving} disabled={uploading} onPress={onSave} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Row gap={10}>
          <IconChip mIcon="school-outline" size={36} />
          <View style={{ flex: 1 }}>
            <T variant="title">Academic Records</T>
            <T variant="caption" color="muted">
              Official Academy Assignment
            </T>
          </View>
        </Row>
        <Divider />
        <RecordTile label="Student ID" value={profile.studentId || "—"} mono color="primary" />
        <RecordTile label="Enrolled Course" value={course || "Not assigned yet"} color={course ? undefined : "faint"} />
        <RecordTile label="Assigned Teacher" value={profile.teacherName || "Not assigned yet"} color={profile.teacherName ? "warning" : "faint"} />
        {admission ? <RecordTile label="Admission Date" value={admission} /> : null}
        {monthlyFee > 0 ? <RecordTile label="Monthly Tuition Fee" value={`BDT ${formatNumber(monthlyFee)}`} color="success" /> : null}
      </Card>
    </>
  );
}
