import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { ApiError, apiRaw } from "@/api/client";
import { useTheme } from "@/theme/ThemeContext";
import { Banner, Button, Input, Row, T } from "@/ui";

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_BYTES = 72;

type Step = "email" | "code" | "password" | "done";

const STEPS: { id: Exclude<Step, "done">; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "code", label: "Verify" },
  { id: "password", label: "New password" },
];

interface ApiReply {
  success?: boolean;
  message?: string;
  retryAfterSeconds?: number;
  data?: { resendAfterSeconds?: number; resetToken?: string };
}

const NETWORK_ERROR = "Network error. Please check your connection and try again.";

async function post(path: string, body: unknown): Promise<{ status: number; reply: ApiReply }> {
  const result = await apiRaw<ApiReply>(path, { method: "POST", body, keepSessionOn401: true });
  return { status: result.status, reply: result.data ?? {} };
}

/** UTF-8 length, which is what the server's 72-byte limit counts */
function byteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

interface Props {
  /** Pre-fills the email box, e.g. with what was typed on the login form */
  initialEmail?: string;
  /** Called from the success screen; the host closes itself and goes back to the login form */
  onDone: (email: string) => void;
}

/** Forgot password: email -> 6-digit code -> new password (the same three steps as the website) */
export default function PasswordResetFlow({ initialEmail = "", onDone }: Props) {
  const { c } = useTheme();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  /** Sends (or re-sends) the code. From the email step it also moves on to the code step. */
  const sendCode = async () => {
    if (!email.trim()) return;
    setBusy(true);
    clearMessages();
    try {
      const { status, reply } = await post("/api/auth/password-reset/send-otp", { email: email.trim() });
      if (reply.success) {
        setStep("code");
        setOtp("");
        setNotice("We sent a 6-digit code to your email. It is valid for 10 minutes. Check your spam folder if you can't see it.");
        setResendIn(reply.data?.resendAfterSeconds ?? 60);
      } else {
        // 429: a code went out a moment ago, so let them enter it instead of leaving them stuck
        if (status === 429 && reply.retryAfterSeconds) {
          setStep("code");
          setResendIn(reply.retryAfterSeconds);
        }
        setError(reply.message || "Could not send the verification code.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setBusy(true);
    clearMessages();
    try {
      const { reply } = await post("/api/auth/password-reset/verify-otp", { email: email.trim(), otp });
      if (reply.success && reply.data?.resetToken) {
        setResetToken(reply.data.resetToken);
        setStep("password");
      } else {
        setError(reply.message || "Could not verify the code.");
        setOtp("");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    clearMessages();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (byteLength(newPassword) > MAX_PASSWORD_BYTES) {
      setError(`Password is too long (at most ${MAX_PASSWORD_BYTES} characters).`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { status, reply } = await post("/api/auth/password-reset/reset", { resetToken, newPassword });
      if (reply.success) {
        setNewPassword("");
        setConfirmPassword("");
        setResetToken("");
        setStep("done");
      } else if (status === 401) {
        // The reset session ran out (10 minutes) or was already used: the only way forward is a new code
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("email");
        setError(reply.message || "Your reset session has expired. Please start again.");
      } else {
        setError(reply.message || "Could not reset the password.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = () => {
    clearMessages();
    setOtp("");
    setResendIn(0);
    setStep("email");
  };

  if (step === "done") {
    return (
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 8 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Feather name="check-circle" size={32} color={c.success} />
        </View>
        <View style={{ gap: 4 }}>
          <T variant="h2" center>
            Password reset successful
          </T>
          <T color="muted" center>
            Your password has been changed. Sign in with your new password.
          </T>
        </View>
        <Button title="Back to Login" icon="log-in" variant="navy" block onPress={() => onDone(email.trim())} />
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <View style={{ gap: 16 }}>
      {/* Progress */}
      <Row gap={0} accessibilityLabel={`Step ${currentIndex + 1} of ${STEPS.length}: ${STEPS[currentIndex]?.label}`}>
        {STEPS.map((s, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          return (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", flex: index < STEPS.length - 1 ? 1 : undefined }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: complete ? c.success : active ? c.navy : c.surfaceAlt }}>
                {complete ? (
                  <Feather name="check" size={13} color="#ffffff" />
                ) : (
                  <T variant="caption" weight="800" color={active ? "#ffffff" : "muted"}>
                    {index + 1}
                  </T>
                )}
              </View>
              <T variant="caption" weight="700" color={active ? "text" : "muted"} style={{ marginLeft: 6 }}>
                {s.label}
              </T>
              {index < STEPS.length - 1 ? <View style={{ flex: 1, height: 1, marginHorizontal: 8, backgroundColor: complete ? c.success : c.border }} /> : null}
            </View>
          );
        })}
      </Row>

      {error ? <Banner tone="danger" message={error} /> : null}
      {notice ? <Banner tone="success" message={notice} /> : null}

      {step === "email" ? (
        <>
          <Input
            label="Registered email address"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            autoFocus
            disabled={busy}
            hint="We will email a 6-digit code to this address."
            returnKeyType="send"
            onSubmitEditing={() => void sendCode()}
          />
          <Button title={busy ? "Sending code…" : "Send verification code"} icon="send" variant="navy" block loading={busy} disabled={!email.trim()} onPress={() => void sendCode()} />
        </>
      ) : null}

      {step === "code" ? (
        <>
          <Input
            label={`Enter the code sent to ${email.trim()}`}
            icon="key"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            placeholder={"0".repeat(OTP_LENGTH)}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            autoFocus
            disabled={busy}
            returnKeyType="done"
            onSubmitEditing={() => void verifyCode()}
          />
          <Button title={busy ? "Verifying…" : "Verify code"} icon="check-circle" variant="navy" block loading={busy} disabled={otp.length !== OTP_LENGTH} onPress={() => void verifyCode()} />
          <Row justify="space-between">
            <Button title="Use a different email" icon="arrow-left" variant="ghost" size="sm" disabled={busy} onPress={changeEmail} />
            <Button title={resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"} icon="refresh-cw" variant="ghost" size="sm" disabled={busy || resendIn > 0} onPress={() => void sendCode()} />
          </Row>
        </>
      ) : null}

      {step === "password" ? (
        <>
          <Input label="New password" icon="lock" secure value={newPassword} onChangeText={setNewPassword} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} autoComplete="new-password" autoCapitalize="none" autoFocus disabled={busy} />
          <Input
            label="Confirm new password"
            icon="lock"
            secure
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter the new password"
            autoComplete="new-password"
            autoCapitalize="none"
            disabled={busy}
            returnKeyType="done"
            onSubmitEditing={() => void resetPassword()}
          />
          <Button title={busy ? "Resetting password…" : "Reset password"} icon="lock" variant="navy" block loading={busy} disabled={!newPassword || !confirmPassword} onPress={() => void resetPassword()} />
        </>
      ) : null}
    </View>
  );
}
