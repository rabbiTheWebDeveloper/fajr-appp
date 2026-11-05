import React, { useCallback, useMemo, useRef, useState } from "react";
import { AppState, View } from "react-native";

import { apiRaw, errorMessage } from "@/api/client";
import { openInApp } from "@/lib/device";
import { formatNumber } from "@/lib/format";
import { useAppForeground } from "@/lib/hooks";
import { cleanAmountInput, currentMonthLabel, monthOptions, type PaymentCourse, type StudentPaymentInfo } from "@/screens/student/payments/types";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Banner, Button, Chip, Icon, Input, KeyValue, Row, Select, T } from "@/ui";

interface InitReply {
  success?: boolean;
  message?: string;
  transactionId?: string;
  /** The SSLCommerz gateway page to send the payer to */
  url?: string;
}

/** What the screen shows after the payer comes back from the gateway */
export interface GatewayNotice {
  tone: "success" | "info";
  title: string;
  message: string;
}

interface Props {
  info: StudentPaymentInfo | null;
  courses: PaymentCourse[];
  /** The amount box is owned by the screen so "Pay Due Balance Now" can fill it */
  amount: string;
  onAmountChange: (value: string) => void;
  notice: GatewayNotice | null;
  onDismissNotice: () => void;
  /** Called once the payer is back from the gateway page, with the transaction id of that attempt */
  onGatewayClosed: (transactionId: string) => void;
}

const QUICK_AMOUNTS = [1000, 2000, 3000, 5000];

/** Tab 1: pay the tuition fee online through the SSLCommerz gateway (bKash, Nagad, Rocket, cards…) */
export function OnlinePaymentForm({ info, courses, amount, onAmountChange, notice, onDismissNotice, onGatewayClosed }: Props) {
  const { c } = useTheme();
  const months = useMemo(() => monthOptions().map((m) => ({ value: m, label: m })), []);
  const [month, setMonth] = useState(currentMonthLabel);
  const [course, setCourse] = useState(courses[0]?._id ?? "");
  const [phone, setPhone] = useState(info?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const monthlyFee = info?.monthlyFee || 0;
  const monthlyDue = info?.monthlyDue || 0;

  // The attempt whose gateway page is open right now
  const attempt = useRef<{ transactionId: string } | null>(null);
  const finishAttempt = useCallback(() => {
    const open = attempt.current;
    if (!open) return;
    attempt.current = null;
    onGatewayClosed(open.transactionId);
  }, [onGatewayClosed]);

  // On Android the browser tab opens over the app and the "opened" promise settles at once,
  // so returning to the app is the dependable sign that the payer has left the gateway page.
  useAppForeground(finishAttempt);

  const pay = async () => {
    setError("");
    onDismissNotice();

    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount) || numAmount < 10) {
      setError("Please enter a valid amount (minimum ৳10 BDT).");
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      setError("Please provide a valid phone number for SMS receipt.");
      return;
    }

    const courseTitle = courses.find((item) => item._id === course)?.title || info?.course || "Educational Fee";
    const purpose = `Tuition Fee - ${month} (${courseTitle})`;

    setLoading(true);
    try {
      const reply = await apiRaw<InitReply>("/api/payment/sslcommerz/init", {
        method: "POST",
        body: {
          name: (info?.fullName || "Student").trim(),
          amount: numAmount,
          phone: cleanPhone,
          // The gateway hands this id back so the paid amount is booked against the right student
          studentId: info?.studentId || "",
          purpose,
          email: info?.email || undefined,
        },
      });
      const data = reply.data;
      if (!data) throw new Error("Invalid response received from server. Please try again.");

      if (reply.ok && data.success && data.url) {
        attempt.current = { transactionId: data.transactionId || "" };
        const openedAt = Date.now();
        await openInApp(data.url);
        // Still in front after a real wait: the tab was closed (or never left the app), so check now.
        // Otherwise the return-to-app handler above does it.
        if (AppState.currentState === "active" && Date.now() - openedAt > 1500) finishAttempt();
      } else {
        setError(data.message || "Failed to initialize SSLCommerz gateway. Please try again.");
      }
    } catch (e) {
      setError(errorMessage(e, "Network error. Please check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const payLabel = amount && Number(amount) > 0 ? formatNumber(Number(amount)) : "0";

  return (
    <View style={{ gap: 14 }}>
      <Banner tone="primary" icon="shield" message="You will be redirected to the secure SSLCommerz gateway to pay via bKash, Nagad, Rocket, or Card. Receipt is issued instantly." />

      {notice ? <Banner tone={notice.tone} title={notice.title} message={notice.message} onClose={onDismissNotice} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}

      {/* The verified student the payment is booked for */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.md, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
        <KeyValue label="Student Name:" value={info?.fullName || "Student"} />
        {info?.studentId ? <KeyValue label="Student ID:" value={info.studentId} mono valueColor="primary" /> : null}
      </View>

      <Select label="For Month" value={month} options={months} onChange={setMonth} searchable={false} icon="calendar" />

      {courses.length > 0 ? (
        <Select label="Program / Course" value={course} options={courses.map((item) => ({ value: item._id, label: item.title }))} onChange={setCourse} icon="book-open" />
      ) : null}

      <View style={{ gap: 8 }}>
        <Input
          label="Amount (৳ BDT)"
          required
          hint="Min ৳10"
          placeholder="e.g. 3000"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => onAmountChange(cleanAmountInput(text))}
          right={
            <T variant="bodyStrong" color="faint">
              ৳
            </T>
          }
        />
        {/* Quick amounts */}
        <Row gap={6} wrap>
          {monthlyFee > 0 ? <Chip label={`Monthly (৳${monthlyFee})`} selected={Number(amount) === monthlyFee} onPress={() => onAmountChange(String(monthlyFee))} /> : null}
          {monthlyDue > 0 && monthlyDue !== monthlyFee ? <Chip label={`Full Due (৳${monthlyDue})`} selected={Number(amount) === monthlyDue} onPress={() => onAmountChange(String(monthlyDue))} /> : null}
          {QUICK_AMOUNTS.map((preset) => (
            <Chip key={preset} label={`৳${formatNumber(preset)}`} selected={Number(amount) === preset} onPress={() => onAmountChange(String(preset))} />
          ))}
        </Row>
      </View>

      <Input label="Contact Phone (for SMS receipt)" required icon="smartphone" placeholder="017XXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <View style={{ gap: 8, marginTop: 2 }}>
        <Button title={loading ? "Connecting SSLCommerz..." : `Pay ৳${payLabel} via SSLCommerz`} icon="lock" iconRight="arrow-right" variant="navy" size="lg" block loading={loading} onPress={pay} />
        <Row gap={5} justify="center">
          <Icon name="shield" size={13} color={c.success} />
          <T variant="caption" color="faint">
            256-bit Encrypted SSL Payment
          </T>
        </Row>
      </View>
    </View>
  );
}
