import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { apiRaw } from "@/api/client";
import { successFeedback, warningFeedback } from "@/lib/device";
import type { PageMessage } from "@/screens/student/settings/types";
import { useTheme } from "@/theme/ThemeContext";
import type { Palette } from "@/theme/palette";
import { Banner, Button, Card, Divider, Input, Row, T, toast } from "@/ui";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY: PasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** The website's strength meter: one point each for 6+ characters, 10+ characters, a capital, a digit and a symbol */
function passwordStrength(password: string, c: Palette): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: "Very Weak", color: c.danger },
    { label: "Weak", color: c.danger },
    { label: "Fair", color: c.warning },
    { label: "Good", color: c.success },
    { label: "Strong", color: c.success },
  ];
  return { score, ...levels[Math.min(score, 4)] };
}

/** "Password & Security": change the account password */
export function SecurityTab() {
  const { c } = useTheme();
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  const strength = passwordStrength(form.newPassword, c);

  // The result stays on the page for five seconds, as on the website
  const show = (next: PageMessage) => {
    setMessage(next);
    if (next.ok) {
      successFeedback();
      toast.success(next.text);
    } else {
      warningFeedback();
      toast.error(next.text);
    }
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setMessage(null), 5000);
  };

  const submit = async () => {
    // The same checks, in the same order and words, as the form and the server make
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) return show({ text: "All password fields are required.", ok: false });
    if (form.newPassword !== form.confirmPassword) return show({ text: "New passwords do not match.", ok: false });
    if (form.newPassword.length < 6) return show({ text: "New password must be at least 6 characters long.", ok: false });
    if (form.newPassword === form.currentPassword) return show({ text: "New password must be different from the current password.", ok: false });

    setSaving(true);
    setMessage(null);
    try {
      // The server answers a wrong current password with 401; that is an answer here, not an ended session
      const reply = await apiRaw<{ success?: boolean; message?: string }>("/api/student-portal/profile/password", { method: "PUT", body: form, keepSessionOn401: true });
      if (reply.data?.success) {
        show({ text: reply.data.message || "Password changed successfully!", ok: true });
        setForm(EMPTY);
      } else {
        show({ text: reply.data?.message || "Failed to update password.", ok: false });
      }
    } catch {
      show({ text: "Network error. Please try again.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <View>
        <T variant="title">Change Account Password</T>
        <T variant="small" color="muted">
          Ensure your student account uses a strong, secure password
        </T>
      </View>
      <Divider />

      {message ? <Banner tone={message.ok ? "success" : "danger"} message={message.text} /> : null}

      <Input
        label="Current Password"
        required
        secure
        icon="lock"
        value={form.currentPassword}
        onChangeText={(currentPassword) => setForm((prev) => ({ ...prev, currentPassword }))}
        placeholder="Enter current password"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={{ gap: 8 }}>
        <Input
          label="New Password"
          required
          secure
          icon="key"
          value={form.newPassword}
          onChangeText={(newPassword) => setForm((prev) => ({ ...prev, newPassword }))}
          placeholder="Enter new password (min 6 characters)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {form.newPassword ? (
          <Row gap={8} accessibilityLabel={`Password strength: ${strength.label}`}>
            <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((level) => (
                <View key={level} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: level <= strength.score ? strength.color : c.border }} />
              ))}
            </View>
            <T variant="caption" color={strength.color} weight="700">
              {strength.label}
            </T>
          </Row>
        ) : null}
      </View>

      <Input
        label="Confirm New Password"
        required
        secure
        icon="key"
        value={form.confirmPassword}
        onChangeText={(confirmPassword) => setForm((prev) => ({ ...prev, confirmPassword }))}
        placeholder="Re-enter new password"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Divider />
      <Button title={saving ? "Updating Password..." : "Update Password"} icon="key" block loading={saving} onPress={() => void submit()} />
    </Card>
  );
}
