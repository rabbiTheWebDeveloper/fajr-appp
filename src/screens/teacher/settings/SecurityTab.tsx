import React, { useEffect, useRef, useState } from "react";

import { apiRaw } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { Banner, Button, Input } from "@/ui";

import { EmailVerificationCard } from "@/screens/teacher/settings/EmailVerificationCard";
import { SectionCard } from "@/screens/teacher/settings/parts";
import type { SettingsProfile } from "@/screens/teacher/settings/useSettingsProfile";

/** Tab: verify the account's email address, and change the login password */
export function SecurityTab({ settings }: { settings: SettingsProfile }) {
  const { profile } = settings;
  return (
    <>
      <EmailVerificationCard email={profile?.email} verified={!!profile?.emailVerified} verifiedAt={profile?.emailVerifiedAt} onVerified={settings.markEmailVerified} />
      <PasswordCard />
    </>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    []
  );

  const update = async () => {
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setUpdating(true);
    setMessage("");
    setError("");
    try {
      // A wrong current password comes back as 401: that is an answer here, not an ended session
      const res = await apiRaw<{ success?: boolean; message?: string }>("/api/teacher-portal/profile/password", { method: "PUT", body: { currentPassword, newPassword }, keepSessionOn401: true });
      if (res.data?.success) {
        setMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        successFeedback();
        if (messageTimer.current) clearTimeout(messageTimer.current);
        messageTimer.current = setTimeout(() => setMessage(""), 4000);
      } else {
        setError(res.data?.message || "Failed to update password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SectionCard icon="lock" tone="danger" title="Change Account Password" subtitle="Update your login security credentials with a strong password.">
      {error ? <Banner tone="danger" message={error} /> : null}
      {message ? <Banner tone="success" message={message} /> : null}

      <Input label="Current Password" secure value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" autoCapitalize="none" autoComplete="current-password" />
      <Input label="New Password" secure value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password (min 6 chars)" autoCapitalize="none" autoComplete="new-password" />
      <Input label="Confirm New Password" secure value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" autoCapitalize="none" autoComplete="new-password" />

      <Button title={updating ? "Updating Password..." : "Update Password"} icon="lock" variant="navy" block loading={updating} disabled={!currentPassword || !newPassword} onPress={() => void update()} />
    </SectionCard>
  );
}
