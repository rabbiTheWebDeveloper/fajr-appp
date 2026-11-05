import React, { useMemo, useState } from "react";
import { View } from "react-native";

import { apiRaw } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { PAYMENTS_PATH, cleanAmountInput, currentMonthLabel, monthOptions, type PaymentCourse } from "@/screens/student/payments/types";
import { Banner, Button, Input, Select, T } from "@/ui";

/** The payment methods the Payment model accepts, with the website's labels */
const CHANNELS = [
  { value: "bank-transfer", label: "Bank Transfer (Islami Bank)" },
  { value: "mobile-banking", label: "Mobile Banking (bKash / Nagad / Rocket)" },
  { value: "credit-card", label: "Credit/Debit Card" },
  { value: "cash", label: "Cash at Office" },
  { value: "other", label: "Other" },
];

interface Props {
  courses: PaymentCourse[];
  /** Called after the slip is saved so the screen can reload the history */
  onSubmitted: () => void;
}

/**
 * Tab 2: the payer already paid outside the gateway (bank deposit, personal transfer, cash) and sends the
 * transaction details for the admin to check. The payment is saved as "pending" until it is verified.
 */
export function ManualPaymentForm({ courses, onSubmitted }: Props) {
  const months = useMemo(() => monthOptions().map((m) => ({ value: m, label: m })), []);
  const [course, setCourse] = useState(courses[0]?._id ?? "");
  const [month, setMonth] = useState(currentMonthLabel);
  const [paymentMethod, setPaymentMethod] = useState("bank-transfer");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasCourses = courses.length > 0;
  // The chosen course can leave the list after a reload; fall back to the first one, as the website does
  const selectedCourse = courses.some((item) => item._id === course) ? course : (courses[0]?._id ?? "");

  const submit = async () => {
    if (!amount || !(Number(amount) >= 1)) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!details.trim()) {
      setError("Please enter the transaction details.");
      return;
    }
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const reply = await apiRaw<{ success?: boolean; message?: string }>(PAYMENTS_PATH, {
        method: "POST",
        body: { amount: Number(amount), course: selectedCourse, paymentMethod, paymentMethodDetails: details, notes, month },
      });
      if (reply.data?.success) {
        setMessage("Payment verification submitted successfully!");
        setAmount("");
        setDetails("");
        setNotes("");
        setMonth(currentMonthLabel());
        successFeedback();
        onSubmitted();
      } else {
        setError(reply.data?.message || "Failed to submit.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Banner tone="warning" icon="dollar-sign" message="Paid via direct bank deposit or personal transfer? Submit your transaction details below for admin review (verified in 24 hours)." />

      {error ? <Banner tone="danger" message={error} /> : null}
      {message ? <Banner tone="success" message={message} onClose={() => setMessage("")} /> : null}

      <Select
        label="Enrolled Course"
        value={hasCourses ? selectedCourse : null}
        options={courses.map((item) => ({ value: item._id, label: item.title }))}
        onChange={setCourse}
        placeholder="No enrolled courses"
        disabled={!hasCourses}
        icon="book-open"
      />

      <Select label="Target Month" value={month} options={months} onChange={setMonth} searchable={false} icon="calendar" />

      <Select label="Payment Channel" value={paymentMethod} options={CHANNELS} onChange={setPaymentMethod} icon="credit-card" />

      <Input
        label="Amount (৳ BDT)"
        required
        placeholder="e.g. 3000"
        keyboardType="numeric"
        value={amount}
        onChangeText={(text) => setAmount(cleanAmountInput(text))}
        right={
          <T variant="bodyStrong" color="faint">
            ৳
          </T>
        }
      />

      <Input label="Transaction Details" required multiline placeholder="Transaction ID / TrxID, sender number, branch info..." value={details} onChangeText={setDetails} />

      <Input label="Notes (Optional)" placeholder="Additional remarks..." value={notes} onChangeText={setNotes} />

      <Button title="Submit Slip for Verification" icon="send" size="lg" block loading={submitting} disabled={!hasCourses} onPress={submit} style={{ marginTop: 2 }} />
    </View>
  );
}
