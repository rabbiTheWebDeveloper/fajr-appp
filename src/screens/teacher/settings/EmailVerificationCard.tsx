import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { apiRaw } from "@/api/client";
import { warningFeedback } from "@/lib/device";
import { formatDate } from "@/lib/format";
import { Badge, Banner, Button, Card, Divider, IconChip, Input, Row, T } from "@/ui";

const OTP_LENGTH = 6;

interface EmailVerificationCardProps {
  email?: string;
  verified: boolean;
  verifiedAt?: string | null;
  /** Called once the server confirmed the code, so the screen can update its copy of the profile */
  onVerified: (verifiedAt: string) => void;
}

interface OtpReply {
  success?: boolean;
  message?: string;
  retryAfterSeconds?: number;
  attemptsLeft?: number;
  data?: { resendAfterSeconds?: number; verifiedAt?: string };
}

/** POST that hands back the status too: a 429 here is an answer ("a code went out recently"), not a failure to hide */
async function post(path: string, body?: unknown): Promise<{ status: number; reply: OtpReply }> {
  const res = await apiRaw<OtpReply>(path, { method: "POST", body });
  return { status: res.status, reply: res.data ?? {} };
}

/**
 * Email verification: a 6-digit code is emailed to the address on file (one per minute, five per hour),
 * valid for 10 minutes; five wrong guesses burn it. The address itself is only changed by the administration.
 */
export function EmailVerificationCard({ email, verified, verifiedAt, onVerified }: EmailVerificationCardProps) {
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // Bumped to put the cursor back in the code box after a wrong code
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const { status, reply } = await post("/api/teacher-portal/profile/email/send-otp");
      if (reply.success) {
        setShowCodeEntry(true);
        setOtp("");
        setNotice(reply.message || "We sent you a verification code.");
        setResendIn(reply.data?.resendAfterSeconds ?? 60);
      } else {
        // 429 means a code went out recently, so let the teacher enter it instead of leaving them stuck
        if (status === 429) {
          setShowCodeEntry(true);
          setResendIn(reply.retryAfterSeconds ?? 60);
        }
        setError(reply.message || "Could not send the verification code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setVerifying(true);
    setError("");
    setNotice("");
    try {
      const { reply } = await post("/api/teacher-portal/profile/email/verify-otp", { otp });
      if (reply.success) {
        onVerified(reply.data?.verifiedAt ?? new Date().toISOString());
      } else {
        setError(reply.message || "Could not verify the code.");
        setOtp("");
        setFocusKey((key) => key + 1);
        warningFeedback();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const since = formatDate(verifiedAt, "short", "");
  const resendLabel = resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code";

  return (
    <Card style={{ gap: 14 }}>
      <Row gap={10} align="flex-start">
        <IconChip icon={verified ? "check-circle" : "mail"} tone={verified ? "success" : "primary"} size={36} />
        <View style={{ flex: 1 }}>
          <T variant="title">Email Verification</T>
          <T variant="small" color="muted">
            Confirm that you own the email address on your account.
          </T>
        </View>
        <Badge label={verified ? "Verified" : email ? "Not verified" : "No email"} tone={verified ? "success" : email ? "warning" : "neutral"} />
      </Row>
      <Divider />

      {!email ? <Banner tone="warning" message="No email address is on file for your account. Please ask the administration to add one, then come back to verify it." /> : null}

      {email && verified ? (
        <Banner tone="success" message={`${email} is verified${since ? ` (since ${since})` : ""}. If the administration changes this address, you will be asked to verify the new one.`} />
      ) : null}

      {email && !verified ? (
        <>
          <T variant="body" color="muted">
            We will email a {OTP_LENGTH}-digit code to <T variant="bodyStrong">{email}</T>. Enter it here to verify the address.
          </T>

          {error ? <Banner tone="danger" message={error} /> : null}
          {notice ? <Banner tone="success" message={`${notice} The code is valid for 10 minutes.`} /> : null}

          {!showCodeEntry ? (
            <>
              <Button title={sending ? "Sending code..." : "Send verification code"} icon="send" block loading={sending} onPress={() => void sendCode()} />
              <Button title="I already have a code" variant="ghost" block onPress={() => setShowCodeEntry(true)} />
            </>
          ) : (
            <>
              <Input
                key={focusKey}
                label="Verification code"
                icon="key"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                placeholder={"0".repeat(OTP_LENGTH)}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={OTP_LENGTH}
                autoFocus
                disabled={verifying}
                returnKeyType="done"
                onSubmitEditing={() => void verifyCode()}
              />
              <Button title={verifying ? "Verifying..." : "Verify email"} icon="check-circle" block loading={verifying} disabled={otp.length !== OTP_LENGTH} onPress={() => void verifyCode()} />
              <Button title={sending ? "Sending..." : resendLabel} icon="refresh-cw" variant="secondary" block loading={sending} disabled={verifying || resendIn > 0} onPress={() => void sendCode()} />
            </>
          )}
        </>
      ) : null}
    </Card>
  );
}
