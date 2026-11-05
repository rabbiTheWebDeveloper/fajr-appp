import React from "react";
import { Pressable, View } from "react-native";

import { openExternal } from "@/lib/device";
import { Badge, Button, Field, Icon, Input, Row, Select, T, type Option } from "@/ui";
import { useTheme } from "@/theme/ThemeContext";

import { JoinDateField } from "@/screens/teacher/settings/JoinDateField";
import { SaveStatusCard, SectionCard } from "@/screens/teacher/settings/parts";
import { getJoinDateInputValue, getServiceDuration, type SettingsTab } from "@/screens/teacher/settings/types";
import type { SettingsProfile } from "@/screens/teacher/settings/useSettingsProfile";

const GENDERS: Option[] = [
  { value: "male", label: "Male (Ustadh)" },
  { value: "female", label: "Female (Ustadha / Purdah Observed)" },
];

const BLOOD_GROUPS: Option[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({ value: group, label: group }));

/** Tab 1: identity, contact numbers, addresses, the NID / birth certificate and the biography */
export function PersonalTab({ settings, onSwitchTab }: { settings: SettingsProfile; onSwitchTab: (tab: SettingsTab) => void }) {
  const { c } = useTheme();
  const { profile, updatePersonal, unsaved, savingMode, busy, uploadingNID } = settings;
  const nidValue = profile?.nidOrBirthCertificatePicture || "";
  const nidIsLink = /^https?:\/\//i.test(nidValue.trim());

  return (
    <>
      <SectionCard icon="user" title="Basic Information" subtitle="Official identity and academic assignment parameters.">
        {/* Assigned by the academy: shown, never edited here */}
        <Input label="Teacher ID" icon="book-open" value={profile?.teacherId || "Auto-assigned"} disabled />
        <Input label="Official Designation" icon="briefcase" value={profile?.designation || ""} disabled />

        <Input label="Full Name" required icon="user" value={profile?.fullName || ""} onChangeText={(text) => updatePersonal("fullName", text)} autoCapitalize="words" />

        <View style={{ gap: 6 }}>
          <Row justify="space-between" gap={8}>
            <T variant="smallStrong" color="muted">
              Official Email
            </T>
            {profile?.email ? (
              profile.emailVerified ? (
                <Badge label="Verified" tone="success" icon="check-circle" />
              ) : (
                <Pressable onPress={() => onSwitchTab("security")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Verify your email address">
                  <Badge label="Not verified · Verify now" tone="warning" icon="alert-circle" />
                </Pressable>
              )
            ) : null}
          </Row>
          <Input icon="mail" value={profile?.email || ""} disabled />
        </View>

        <Select label="Gender" value={profile?.gender || "male"} options={GENDERS} onChange={(value) => updatePersonal("gender", value)} />
        <Select label="Blood Group" required value={profile?.bloodGroup || "A+"} options={BLOOD_GROUPS} onChange={(value) => updatePersonal("bloodGroup", value)} searchable={false} />

        <View style={{ gap: 6 }}>
          {profile?.joinDate ? <Badge label={getServiceDuration(profile.joinDate)} tone="primary" icon="clock" /> : null}
          <JoinDateField
            label="Current Service of Fajr Academy (Joining Date)"
            required
            value={getJoinDateInputValue(profile?.joinDate)}
            onChange={(dateKey) => updatePersonal("joinDate", dateKey)}
            hint={profile?.joinDate ? `Active service tenure at Fajr Academy: ${getServiceDuration(profile.joinDate)}.` : "Official joining date of service at Fajr Academy."}
          />
        </View>

        <Input
          label="Current Service & Role at Fajr Academy"
          icon="home"
          value={profile?.currentService || ""}
          onChangeText={(text) => updatePersonal("currentService", text)}
          placeholder="e.g. Senior Faculty - Quran Recitation, Tajweed & Hifz Department"
          hint="Specific department, instructional capacity, or ongoing service role at Fajr Academy."
        />
      </SectionCard>

      <SectionCard icon="map-pin" tone="success" title="Contact & Address Details" subtitle="Contact telephone, emergency numbers, and resident addresses.">
        <Input label="Primary Phone Number" icon="phone" value={profile?.phone || ""} onChangeText={(text) => updatePersonal("phone", text)} placeholder="+8801..." keyboardType="phone-pad" />
        <Input
          label="Emergency Contact Number"
          required
          icon="phone"
          value={profile?.emergencyContactNumber || ""}
          onChangeText={(text) => updatePersonal("emergencyContactNumber", text)}
          placeholder="+8801..."
          keyboardType="phone-pad"
        />
        <Input label="Present Address" required multiline value={profile?.presentAddress || ""} onChangeText={(text) => updatePersonal("presentAddress", text)} placeholder="House, Road, Area, City..." />
        <Input label="Permanent Address" required multiline value={profile?.permanentAddress || ""} onChangeText={(text) => updatePersonal("permanentAddress", text)} placeholder="Village, Police Station, District..." />

        <Field label="NID / Birth Certificate Verification (Link or File)">
          <Input value={nidValue} onChangeText={(text) => updatePersonal("nidOrBirthCertificatePicture", text)} placeholder="Enter Document URL or NID number..." autoCapitalize="none" autoCorrect={false} />
          <Button title={uploadingNID ? "Uploading..." : "Upload Document"} icon="upload-cloud" variant="secondary" block loading={uploadingNID} onPress={() => void settings.uploadNid()} />
          {nidValue ? (
            <Row gap={10} wrap>
              <Row gap={5}>
                <Icon name="check-circle" size={14} color={c.success} />
                <T variant="smallStrong" color="success">
                  Document attached
                </T>
              </Row>
              {/* A typed NID number is not a file: only an uploaded or pasted link can be opened */}
              {nidIsLink ? <Button title="Preview Document" iconRight="external-link" variant="ghost" size="sm" onPress={() => void openExternal(nidValue.trim())} /> : null}
            </Row>
          ) : null}
        </Field>
      </SectionCard>

      <SectionCard icon="file-text" tone="warning" title="Personal Biography & Philosophy" subtitle="Brief narrative about your teaching approach, background, and mindset.">
        <Input
          multiline
          value={profile?.bio || ""}
          onChangeText={(text) => updatePersonal("bio", text)}
          placeholder="Introduce your academic background, teaching style, passion for Quranic education, and student mentoring approach..."
          accessibilityLabel="Personal biography"
        />
      </SectionCard>

      <SaveStatusCard
        unsaved={unsaved.personal}
        title={unsaved.personal ? "Unsaved Personal Details" : "Personal Information Up to Date"}
        message={unsaved.personal ? "Save changes to ensure your contact details remain accurate." : "All your basic and contact information is saved."}
        buttonTitle={savingMode === "personal" ? "Saving Personal Changes..." : "Save Personal Changes"}
        saving={savingMode === "personal"}
        disabled={busy}
        onSave={() => void settings.save("personal")}
      />
    </>
  );
}
