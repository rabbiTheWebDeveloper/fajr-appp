import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { tapFeedback } from "@/lib/device";
import { formatDate, formatMoney } from "@/lib/format";
import { useFetch } from "@/lib/hooks";
import { AccountsReference } from "@/screens/student/payments/AccountsReference";
import { ManualPaymentForm } from "@/screens/student/payments/ManualPaymentForm";
import { OnlinePaymentForm, type GatewayNotice } from "@/screens/student/payments/OnlinePaymentForm";
import { PaymentCard, PaymentDetailSheet } from "@/screens/student/payments/PaymentCard";
import { loadReceiptSchedule, shareReceipt, type ReceiptSchedule } from "@/screens/student/payments/receipt";
import { PAYMENTS_PATH, defaultPayAmount, type PaymentRecord, type PaymentsReply } from "@/screens/student/payments/types";
import { useTheme } from "@/theme/ThemeContext";
import { darkPalette, radius } from "@/theme/palette";
import { Badge, Button, Card, EmptyState, ErrorState, GradientCard, Icon, IconChip, Row, Screen, SectionHeader, Segmented, Skeleton, SkeletonList, SkeletonTiles, StatTile, T, TileGrid, toast } from "@/ui";

type PayTab = "online" | "manual";

/** The channels the SSLCommerz gateway offers, shown as pills under its banner */
const GATEWAY_CHANNELS = [
  { label: "bKash", tone: "danger" },
  { label: "Nagad", tone: "warning" },
  { label: "Rocket", tone: "violet" },
  { label: "Upay", tone: "info" },
  { label: "Visa / Master", tone: "primary" },
  { label: "Islami Bank", tone: "success" },
] as const;

/**
 * Student > Payments: fee summary, online payment through SSLCommerz, the offline slip form,
 * the payment history with money receipts, and the academy's bank / bKash details.
 */
export default function StudentPaymentsScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const { data, loading, refreshing, error, refresh, reload, retry, setData } = useFetch<PaymentsReply>(PAYMENTS_PATH);

  const [tab, setTab] = useState<PayTab>("online");
  const [sslAmount, setSslAmount] = useState("");
  const [gatewayNotice, setGatewayNotice] = useState<GatewayNotice | null>(null);
  const [detail, setDetail] = useState<PaymentRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const listRef = useRef<FlatList<PaymentRecord>>(null);
  const formTop = useRef(0);
  const amountSeeded = useRef(false);
  // The class schedule only feeds the teacher / routine lines of a receipt, so once loaded it serves every receipt
  const schedule = useRef<ReceiptSchedule | null>(null);

  const info = data?.studentInfo ?? null;
  const payments = data?.payments ?? [];
  const courses = data?.enrolledCourses ?? [];
  const monthlyFee = info?.monthlyFee || 0;
  const monthlyDue = info?.monthlyDue || 0;

  // The online form starts with what is due (or the monthly fee when nothing is due)
  useEffect(() => {
    if (amountSeeded.current || !data?.success) return;
    amountSeeded.current = true;
    const amount = defaultPayAmount(data.studentInfo);
    if (amount > 0) setSslAmount(String(amount));
  }, [data]);

  const goToOnlinePayment = useCallback(() => {
    tapFeedback();
    setTab("online");
    listRef.current?.scrollToOffset({ offset: Math.max(0, formTop.current + 8), animated: true });
  }, []);

  // Back from the gateway page: reload, and say whether this attempt's payment has arrived
  const onGatewayClosed = useCallback(
    async (transactionId: string) => {
      try {
        const fresh = await api.get<PaymentsReply>(PAYMENTS_PATH);
        setData(fresh);
        const amount = defaultPayAmount(fresh.studentInfo);
        if (amount > 0) setSslAmount(String(amount));
        // A successful gateway payment is saved under the transaction id the init call returned
        const paid = !!transactionId && (fresh.payments ?? []).some((payment) => payment.transactionId === transactionId);
        if (paid) {
          setGatewayNotice({ tone: "success", title: "Payment received", message: `Transaction ${transactionId} is now in your Payment History below. You can download its receipt there.` });
          toast.success("Payment received");
        } else {
          setGatewayNotice({
            tone: "info",
            title: "Check your payment status",
            message: "If you completed the payment, it will appear in Payment History below. Pull down to refresh if it is not there yet. A cancelled or failed payment is not recorded, and you can try again.",
          });
          toast.info("Check your payment status in Payment History");
        }
      } catch {
        setGatewayNotice({ tone: "info", title: "Check your payment status", message: "Your payments could not be refreshed just now. Pull down to refresh and look for the payment in Payment History below." });
      }
    },
    [setData]
  );

  const downloadInvoice = useCallback(
    async (payment: PaymentRecord) => {
      if (downloadingId) return;
      setDownloadingId(payment._id);
      try {
        const studentRef = typeof payment.student === "string" ? payment.student : payment.student?._id;
        if (!schedule.current) schedule.current = await loadReceiptSchedule(studentRef || user?._id);
        await shareReceipt(payment, info, schedule.current);
      } catch {
        toast.error("Could not generate invoice. Please try again.");
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, info, user?._id]
  );

  if (loading) {
    return (
      <Screen>
        <Skeleton height={132} rounded={16} />
        <SkeletonTiles count={2} />
        <Skeleton height={76} rounded={16} />
        <Skeleton height={260} rounded={16} />
        <SkeletonList count={3} lines={3} />
      </Screen>
    );
  }

  if (!data?.success) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <ErrorState title="Could not load your payments" message={error || data?.message} onRetry={retry} />
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: 16 }}>
      {/* Hero */}
      <GradientCard gradient="navyDeep" padding={18} style={{ gap: 14 }}>
        <Row gap={12} align="flex-start">
          <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.navy, borderWidth: 2, borderColor: "rgba(223,183,108,0.4)" }}>
            <Icon name="credit-card" size={22} color={c.gold} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: darkPalette.successSoft }}>
              <T variant="label" color={darkPalette.successText}>
                SSL Secure
              </T>
            </View>
            <T variant="small" color="onDarkMuted">
              Pay tuition fees online instantly or track your payment history
            </T>
          </View>
        </Row>
        <Button title="Pay Tuition Online" icon="zap" variant="gold" onPress={goToOnlinePayment} />
      </GradientCard>

      {/* Fee summary */}
      <TileGrid>
        <StatTile label="Monthly Tuition" value={formatMoney(monthlyFee)} sub="Standard monthly fee" mIcon="cash-multiple" gradient="navy" />
        <StatTile
          label="Current Balance Due"
          value={formatMoney(monthlyDue)}
          sub={monthlyDue > 0 ? "Pending payment due" : "All cleared, Alhamdulillah!"}
          icon={monthlyDue > 0 ? "alert-circle" : "check-circle"}
          gradient={monthlyDue > 0 ? "amber" : "emerald"}
        />
      </TileGrid>
      {monthlyDue > 0 ? (
        <Button
          title="Pay Due Balance Now"
          iconRight="arrow-right"
          variant="outline"
          block
          onPress={() => {
            setSslAmount(String(monthlyDue));
            goToOnlinePayment();
          }}
        />
      ) : null}
      <Card>
        <Row gap={12}>
          <IconChip icon="calendar" tone="primary" />
          <View style={{ flex: 1 }}>
            <T variant="label" color="muted">
              Class Start Date
            </T>
            <T variant="title">{info?.joinDate ? formatDate(info.joinDate, "medium") : "—"}</T>
            <T variant="caption" color="faint">
              {info?.course || "Academic Program"}
            </T>
          </View>
        </Row>
      </Card>

      {/* Online payment highlights */}
      <Card tone="success" style={{ gap: 12 }}>
        <Row gap={12} align="flex-start">
          <IconChip icon="shield" tone="success" size={44} />
          <View style={{ flex: 1, gap: 6 }}>
            <T variant="title">Instant Online Payment via SSLCommerz</T>
            <Badge label="Zero Wait Time" tone="success" solid />
            <T variant="small" color="muted">
              Supports bKash, Nagad, Rocket, Upay, Visa, MasterCard, Islami Bank, and 30+ payment channels.
            </T>
            <Row gap={6} wrap>
              {GATEWAY_CHANNELS.map((channel) => (
                <Badge key={channel.label} label={channel.label} tone={channel.tone} />
              ))}
            </Row>
          </View>
        </Row>
        <Button title="Pay Online Now" iconRight="arrow-right" variant="navy" block onPress={goToOnlinePayment} />
      </Card>

      {/* Pay online / send an offline slip */}
      <View onLayout={(event) => (formTop.current = event.nativeEvent.layout.y)}>
        <Card style={{ gap: 14 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "online", label: "Pay Online (SSL)", icon: "zap" },
              { value: "manual", label: "Offline Slip", icon: "send" },
            ]}
          />
          {/* Both forms stay mounted so switching tabs keeps what was typed */}
          <View style={tab === "online" ? undefined : { display: "none" }}>
            <OnlinePaymentForm
              info={info}
              courses={courses}
              amount={sslAmount}
              onAmountChange={setSslAmount}
              notice={gatewayNotice}
              onDismissNotice={() => setGatewayNotice(null)}
              onGatewayClosed={onGatewayClosed}
            />
          </View>
          <View style={tab === "manual" ? undefined : { display: "none" }}>
            <ManualPaymentForm courses={courses} onSubmitted={reload} />
          </View>
        </Card>
      </View>

      <SectionHeader title="Payment History" icon="clock" action={<Badge label={`${payments.length} records`} tone="primary" />} />
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        ref={listRef}
        data={payments}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 4 }}
        ListEmptyComponent={
          <Card padding={0}>
            <EmptyState icon="clock" title="No payment records found" message="Pay online or submit a slip to record your first tuition payment." compact />
          </Card>
        }
        ListFooterComponent={<AccountsReference />}
        ListFooterComponentStyle={{ marginTop: 8 }}
        renderItem={({ item }) => (
          <PaymentCard payment={item} fallbackCourse={info?.course} downloading={downloadingId === item._id} onOpen={() => setDetail(item)} onInvoice={() => void downloadInvoice(item)} />
        )}
      />

      <PaymentDetailSheet payment={detail} fallbackCourse={info?.course} downloading={!!detail && downloadingId === detail._id} onClose={() => setDetail(null)} onInvoice={(payment) => void downloadInvoice(payment)} />
    </Screen>
  );
}
