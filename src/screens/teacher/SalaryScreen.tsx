import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { formatDateTime, formatMonthKey } from "@/lib/format";
import { useFetch, useNow } from "@/lib/hooks";
import PaymentInfoSheet from "@/screens/teacher/salary/PaymentInfoSheet";
import { CompletionBar, PaymentWindowBanner } from "@/screens/teacher/salary/parts";
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  DEFAULT_BANK,
  EMPTY_PAYMENT_FORM,
  MAX_PAYMENT_UPDATES,
  METHOD_OPTIONS,
  MFS_ACCOUNT_TYPE_OPTIONS,
  accountNumberLabel,
  formFromSaved,
  formatBdt,
  isMobileWallet,
  isOtherBank,
  paymentWindowStatus,
  type PaymentForm,
  type SavedPaymentInfo,
} from "@/screens/teacher/salary/payment-info";
import { ActionButton } from "@/screens/teacher/schedule/parts";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Card, Divider, EmptyState, ErrorState, Icon, IconChip, KeyValue, Row, Screen, SectionHeader, Skeleton, SkeletonList, T, toast, type Option } from "@/ui";

/** One TeacherSalary document, as far as the salary page shows it */
interface SalaryRecord {
  _id: string;
  /** "YYYY-MM" */
  month: string;
  calculatedAmount: number;
  status: "pending" | "paid";
  createdAt?: string;
}

interface SalaryReply {
  success?: boolean;
  salaries?: SalaryRecord[];
  message?: string;
}

interface ProfileReply {
  success?: boolean;
  teacher?: { paymentInfo?: SavedPaymentInfo };
}

const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value;

export default function TeacherSalaryScreen() {
  const { c } = useTheme();
  const { refreshProfile } = useTeacher();
  const salary = useFetch<SalaryReply>("/api/teacher-portal/salary");
  // The payout details are read once (and on pull-to-refresh), so a quiet reload never changes them under the teacher
  const profile = useFetch<ProfileReply>("/api/teacher-portal/profile", undefined, { refetchOnFocus: false });

  const [form, setForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [hasSaved, setHasSaved] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const syncFromServer = useRef(true);

  useEffect(() => {
    const data = profile.data;
    if (!data || !syncFromServer.current) return;
    syncFromServer.current = false;
    const saved = data.success ? data.teacher?.paymentInfo : undefined;
    setForm(saved ? formFromSaved(saved) : EMPTY_PAYMENT_FORM);
    setHasSaved(!!saved);
    setUpdateCount(saved?.updateCount || 0);
  }, [profile.data]);

  // Whether the monthly update window is open (the banner keeps its own per-second countdown)
  const windowOpen = paymentWindowStatus(useNow(15000)).isOpen;
  const limitReached = updateCount >= MAX_PAYMENT_UPDATES;

  const onRefresh = async () => {
    syncFromServer.current = true;
    await Promise.all([salary.refresh(), profile.refresh()]);
  };

  const salaries = salary.data?.success && Array.isArray(salary.data.salaries) ? salary.data.salaries : [];
  const wallet = isMobileWallet(form.method);
  const otherBank = isOtherBank(form);

  return (
    <Screen onRefresh={onRefresh} refreshing={salary.refreshing || profile.refreshing}>
      <SectionHeader title="Salary Dashboard" subtitle="Generate your monthly salary requests and track your payment history." icon="credit-card" />

      {/* ── Payment information ── */}
      <Card style={{ gap: 14 }}>
        <Row gap={8}>
          <Icon name="user" size={18} color={c.primary} />
          <T variant="title" style={{ flex: 1 }}>
            Payment Information
          </T>
        </Row>

        {profile.loading ? (
          <View style={{ gap: 10 }} accessibilityLabel="Loading">
            <Skeleton height={12} width="55%" />
            <Skeleton height={8} />
            <Skeleton height={150} rounded={16} />
            <Skeleton height={44} rounded={12} />
          </View>
        ) : !profile.data ? (
          <ErrorState compact title="Could not load your payment information" message={profile.error} onRetry={profile.retry} />
        ) : (
          <>
            <CompletionBar form={form} />

            <PaymentWindowBanner />

            {hasSaved ? (
              <View>
                <KeyValue label="Payment Method" value={labelOf(METHOD_OPTIONS, form.method)} />
                <Divider />
                <KeyValue label="Bank / Provider Name" value={(form.bankName === "Other" ? form.customBankName : form.bankName) || "—"} />
                <Divider />
                <KeyValue label="Account Holder Name" value={form.accountName || "—"} />
                <Divider />
                <KeyValue label={accountNumberLabel(form.method)} value={form.accountNumber || "—"} mono />
                {otherBank ? (
                  <>
                    <Divider />
                    <KeyValue label="Account Type (হিসাবের ধরন)" value={labelOf(BANK_ACCOUNT_TYPE_OPTIONS, form.accountType || "Savings")} />
                    <Divider />
                    <KeyValue label="Branch Name (শাখার নাম)" value={form.branchName || "—"} />
                    <Divider />
                    <KeyValue label="Routing Number (রাউটিং নম্বর)" value={form.routingNumber || "—"} mono />
                  </>
                ) : null}
                {form.method === "Bank_Transfer" && form.bankName === DEFAULT_BANK ? (
                  <>
                    <Divider />
                    <KeyValue label="Routing Number / Branch (Optional)" value={form.routingNumber || "—"} />
                  </>
                ) : null}
                {wallet ? (
                  <>
                    <Divider />
                    <KeyValue label="Account Type (অ্যাকাউন্ট টাইপ)" value={labelOf(MFS_ACCOUNT_TYPE_OPTIONS, form.accountType || "Personal")} />
                  </>
                ) : null}
              </View>
            ) : (
              <EmptyState compact icon="credit-card" title="No payment information saved yet" message="Add the bank or mobile wallet account your salary should be sent to." />
            )}

            <Divider />

            {/* How many changes are left, or why the details cannot be changed right now */}
            <View style={{ gap: 8 }}>
              <Badge label={`পরিবর্তন করা হয়েছে: ${updateCount} / ৪`} tone="warning" />
              {!windowOpen ? (
                <Row gap={6} align="flex-start">
                  <Icon name="lock" size={13} color={c.dangerText} style={{ marginTop: 2 }} />
                  <T variant="smallStrong" color="danger" style={{ flex: 1 }}>
                    উইন্ডো বন্ধ রয়েছে (১৫ থেকে ০২ তারিখের মধ্যে আপডেট করুন)
                  </T>
                </Row>
              ) : limitReached ? (
                <Row gap={6} align="flex-start">
                  <Icon name="alert-circle" size={13} color={c.dangerText} style={{ marginTop: 2 }} />
                  <T variant="smallStrong" color="danger" style={{ flex: 1 }}>
                    সর্বোচ্চ ৪ বার আপডেট এর লিমিট শেষ হয়ে গেছে
                  </T>
                </Row>
              ) : (
                <T variant="smallStrong" color="muted">
                  অবশিষ্ট আপডেটের সুযোগ: <T variant="smallStrong">{MAX_PAYMENT_UPDATES - updateCount}</T>/৪
                </T>
              )}
            </View>

            <ActionButton
              title={!windowOpen ? "উইন্ডো বন্ধ (১৫-০২ তারিখ উন্মুক্ত)" : limitReached ? "আপডেট সীমা শেষ (৪/৪)" : hasSaved ? "Edit Payment Info" : "Add Payment Info"}
              icon={!windowOpen ? "lock" : "edit-2"}
              block
              disabled={!windowOpen || limitReached}
              onPress={() => setEditing(true)}
            />
          </>
        )}
      </Card>

      {/* ── Salary history ── */}
      <SectionHeader title="Salary History" icon="trending-up" />

      {salary.loading ? (
        <SkeletonList count={3} />
      ) : !salary.data ? (
        <Card padding={0}>
          <ErrorState message={salary.error || "Failed to load salary history"} onRetry={salary.retry} />
        </Card>
      ) : salaries.length === 0 ? (
        <Card padding={0}>
          <EmptyState mIcon="cash-multiple" title="No salary history" message="You haven't generated any salary requests yet." />
        </Card>
      ) : (
        <Card padding={0}>
          {salaries.map((record, index) => {
            const paid = record.status === "paid";
            return (
              <View key={record._id}>
                {index > 0 ? <Divider /> : null}
                <Row gap={12} align="flex-start" style={{ padding: 14 }}>
                  <IconChip mIcon="cash" tone={paid ? "success" : "warning"} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <T variant="bodyStrong">{formatMonthKey(record.month)}</T>
                    <T variant="title" selectable>
                      {formatBdt(record.calculatedAmount)}
                    </T>
                    <T variant="caption" color="muted">
                      Generated On: {formatDateTime(record.createdAt, "N/A")}
                    </T>
                  </View>
                  <Badge label={paid ? "Paid" : "Pending"} tone={paid ? "success" : "warning"} icon={paid ? "check-circle" : "clock"} />
                </Row>
              </View>
            );
          })}
        </Card>
      )}

      <PaymentInfoSheet
        visible={editing}
        onClose={() => setEditing(false)}
        initial={form}
        updateCount={updateCount}
        onSaved={(saved, serverCount) => {
          setForm(saved);
          setHasSaved(true);
          setUpdateCount((prev) => serverCount ?? prev + 1);
          toast.success("Payment information saved successfully!");
          void refreshProfile();
        }}
      />
    </Screen>
  );
}
