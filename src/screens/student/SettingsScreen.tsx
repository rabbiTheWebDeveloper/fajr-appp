import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { ApiError, api, errorMessage } from "@/api/client";
import { successFeedback, warningFeedback } from "@/lib/device";
import { pickImage, uploadFile, type PickedFile } from "@/lib/files";
import { useFetch } from "@/lib/hooks";
import { useRouteParams } from "@/navigation/nav";
import { useStudent } from "@/screens/student/StudentContext";
import { IdCardTab } from "@/screens/student/settings/IdCardTab";
import { NotificationsTab } from "@/screens/student/settings/NotificationsTab";
import { ProfileTab, type ProfileErrors } from "@/screens/student/settings/ProfileTab";
import { SecurityTab } from "@/screens/student/settings/SecurityTab";
import { TabStrip } from "@/screens/student/settings/TabStrip";
import { EMPTY_FORM, SETTINGS_TABS, formFromStudent, isSettingsTab, type PageMessage, type ProfileForm, type ProfileReply, type SettingsTab, type StudentRecord } from "@/screens/student/settings/types";
import { useTheme } from "@/theme/ThemeContext";
import { Banner, Card, ErrorState, GradientCard, Icon, Row, Screen, Skeleton, SkeletonCard, T, toast } from "@/ui";

function Hero({ studentId }: { studentId?: string }) {
  const { c } = useTheme();
  return (
    <GradientCard gradient="navyDeep" padding={18} style={{ gap: 12 }}>
      <Row gap={14} align="flex-start">
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(59,130,246,0.2)", borderWidth: 1, borderColor: "rgba(96,165,250,0.3)" }}>
          <Icon name="shield" size={22} color="#93c5fd" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2" color="onDark">
            Student Account & ID Card
          </T>
          <T variant="small" color="onDarkMuted">
            Manage student & guardian information, official digital ID pass, and security
          </T>
        </View>
      </Row>
      {studentId ? (
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
          <T variant="mono" color={c.gold} selectable>
            ID: {studentId}
          </T>
        </View>
      ) : null}
    </GradientCard>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Card style={{ gap: 14 }}>
        <Row justify="space-between">
          <Skeleton width="55%" height={16} />
          <Skeleton width={64} height={64} rounded={19} />
        </Row>
        <Skeleton height={46} rounded={12} />
        <Skeleton height={46} rounded={12} />
        <Skeleton height={46} rounded={12} />
        <Skeleton height={46} rounded={12} />
      </Card>
      <SkeletonCard lines={3} />
    </>
  );
}

export default function StudentSettingsScreen() {
  const { tab } = useRouteParams<{ tab?: string }>();
  const { student: portalStudent, refreshStudent } = useStudent();
  // No quiet reload on return to the screen: it would wipe what the student is typing in the profile form
  const { data, loading, refreshing, error, refresh, retry } = useFetch<ProfileReply>("/api/student-portal/profile", undefined, { refetchOnFocus: false });

  // The bell's "Notification settings" link opens this screen on that tab ({ tab: "notifications" })
  const [activeTab, setActiveTab] = useState<SettingsTab>(isSettingsTab(tab) ? tab : "profile");
  useEffect(() => {
    if (isSettingsTab(tab)) setActiveTab(tab);
  }, [tab]);

  const [profile, setProfile] = useState<StudentRecord | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    []
  );

  // Each fresh copy of the record (first load, pull-to-refresh, retry) refills the form
  const loaded = data?.success ? (data.student ?? null) : null;
  useEffect(() => {
    if (!loaded) return;
    setProfile(loaded);
    setForm(formFromStudent(loaded));
    setErrors({});
  }, [loaded]);

  /** Shows a result on the form and as a toast; `clearAfterMs` takes it off the form again, as the website does after saving */
  const note = (next: PageMessage, clearAfterMs?: number) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = null;
    setMessage(next);
    if (next.ok) {
      successFeedback();
      toast.success(next.text);
    } else {
      warningFeedback();
      toast.error(next.text);
    }
    if (clearAfterMs) messageTimer.current = setTimeout(() => setMessage(null), clearAfterMs);
  };

  const pickPhoto = async () => {
    let picked: PickedFile | null;
    try {
      picked = await pickImage({ square: true });
    } catch (e) {
      toast.error(errorMessage(e, "Could not open your photos."));
      return;
    }
    if (!picked) return;

    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadFile(picked);
      // Shown straight away (also on the ID card), but only kept once the form is saved
      setForm((prev) => ({ ...prev, avatar: url }));
      setProfile((prev) => (prev ? { ...prev, avatar: url } : prev));
      note({ text: "Profile photo uploaded! Tap 'Save Changes' to apply.", ok: true });
    } catch (e) {
      note({ text: e instanceof ApiError && e.isNetwork ? "Upload failed due to network error." : errorMessage(e, "Upload failed."), ok: false });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    // The website's form rules: the name is required, the age (when given) is a whole number from 3 to 100
    const nextErrors: ProfileErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Please enter the student's full name.";
    if (form.age) {
      const age = Number(form.age);
      if (!Number.isInteger(age) || age < 3 || age > 100) nextErrors.age = "Age must be between 3 and 100.";
    }
    setErrors(nextErrors);
    const firstError = nextErrors.fullName || nextErrors.age;
    if (firstError) {
      warningFeedback();
      toast.error(firstError);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const reply = await api.put<ProfileReply>("/api/student-portal/profile", form);
      if (reply.success && reply.student) {
        setProfile(reply.student);
        note({ text: "Profile updated successfully!", ok: true }, 4000);
        // The header, the More tab and the dashboard show the new name and photo
        void refreshStudent();
      } else {
        note({ text: reply.message || "Failed to update profile.", ok: false }, 4000);
      }
    } catch (e) {
      note({ text: e instanceof ApiError && e.isNetwork ? "Network error occurred while saving." : errorMessage(e, "Failed to update profile."), ok: false }, 4000);
    } finally {
      setSaving(false);
    }
  };

  // The profile and ID card tabs need the record; the other two work without it
  const waiting = loading || (!!loaded && !profile);
  const recordFallback = waiting ? (
    <ProfileSkeleton />
  ) : (
    <Card>
      <ErrorState title="Could not load your profile" message={error || data?.message || "Your student record was not found. Please try again."} onRetry={retry} />
    </Card>
  );

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Hero studentId={profile?.studentId || portalStudent?.studentId} />
      <TabStrip value={activeTab} onChange={setActiveTab} options={SETTINGS_TABS} />

      {/* A refresh that failed keeps the record on screen: say so instead of failing silently */}
      {error && profile && !waiting ? <Banner tone="warning" title="Could not refresh your profile" message={error} /> : null}

      {activeTab === "profile" ? (
        profile && !waiting ? (
          <ProfileTab
            profile={profile}
            form={form}
            errors={errors}
            message={message}
            saving={saving}
            uploading={uploading}
            onChange={(patch) => {
              setForm((prev) => ({ ...prev, ...patch }));
              if (patch.fullName !== undefined || patch.age !== undefined) setErrors({});
            }}
            onPickPhoto={() => void pickPhoto()}
            onSave={() => void save()}
          />
        ) : (
          recordFallback
        )
      ) : null}

      {activeTab === "idcard" ? profile && !waiting ? <IdCardTab profile={profile} /> : recordFallback : null}

      {activeTab === "notifications" ? <NotificationsTab /> : null}

      {activeTab === "security" ? <SecurityTab /> : null}
    </Screen>
  );
}
