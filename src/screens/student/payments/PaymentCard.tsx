import React from "react";
import { View } from "react-native";

import { formatDate, formatNumber } from "@/lib/format";
import { channelLabel, statusTone, type PaymentRecord } from "@/screens/student/payments/types";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Button, Card, Divider, Icon, KeyValue, Row, Sheet, T } from "@/ui";

/** "৳3,000 BDT", as the history table shows amounts */
function amountLabel(payment: PaymentRecord): string {
  return `৳${formatNumber(Number(payment.amount || 0))} BDT`;
}

/** The day the payment was made, or recorded when it has no paid date */
function dateLabel(payment: PaymentRecord): string {
  return formatDate(payment.paidAt || payment.createdAt, "short");
}

/** Online gateway payments carry a FAJR- transaction id */
function isGatewayPayment(payment: PaymentRecord): boolean {
  return !!payment.transactionId?.startsWith("FAJR-");
}

interface CardProps {
  payment: PaymentRecord;
  /** The course shown when the payment itself has none */
  fallbackCourse?: string;
  downloading: boolean;
  onOpen: () => void;
  onInvoice: () => void;
}

/** One payment in the history list (a row of the website's table) */
export function PaymentCard({ payment, fallbackCourse, downloading, onOpen, onInvoice }: CardProps) {
  const { c } = useTheme();
  return (
    <Card onPress={onOpen} style={{ gap: 10 }}>
      <Row justify="space-between" align="flex-start" gap={12}>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={6} wrap>
            <T variant="mono" numberOfLines={1} style={{ flexShrink: 1 }}>
              {payment.transactionId || "—"}
            </T>
            {isGatewayPayment(payment) ? <Badge label="SSL" tone="success" /> : null}
          </Row>
          <T variant="small" color="muted" numberOfLines={1}>
            {payment.course?.title || fallbackCourse || "Tuition"}
          </T>
        </View>
        <View style={{ alignItems: "flex-end", gap: 5 }}>
          <T variant="title" weight="800">
            {amountLabel(payment)}
          </T>
          <Badge label={(payment.status || "").toUpperCase()} tone={statusTone(payment.status)} style={{ alignSelf: "flex-end" }} />
        </View>
      </Row>

      <Row gap={8} wrap>
        {payment.month ? <Badge label={payment.month} tone="primary" icon="calendar" /> : null}
        <Row gap={5} style={{ flexShrink: 1 }}>
          <Icon name="credit-card" size={12} color={c.textFaint} />
          <T variant="caption" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {channelLabel(payment)}
          </T>
        </Row>
      </Row>

      <Divider />

      <Row justify="space-between">
        <Row gap={6}>
          <Icon name="clock" size={13} color={c.textFaint} />
          <T variant="small" color="muted">
            {dateLabel(payment)}
          </T>
        </Row>
        <Button title={downloading ? "PDF..." : "Invoice"} icon="file-text" variant="outline" size="sm" loading={downloading} onPress={onInvoice} accessibilityLabel="Download Official Money Receipt PDF" />
      </Row>
    </Card>
  );
}

interface SheetProps {
  payment: PaymentRecord | null;
  fallbackCourse?: string;
  downloading: boolean;
  onClose: () => void;
  onInvoice: (payment: PaymentRecord) => void;
}

/** Every column of the history table for one payment, with the full (untruncated) transaction details */
export function PaymentDetailSheet({ payment, fallbackCourse, downloading, onClose, onInvoice }: SheetProps) {
  return (
    <Sheet
      visible={!!payment}
      onClose={onClose}
      title="Payment details"
      subtitle={payment?.transactionId}
      footer={payment ? <Button title="Download Official Money Receipt PDF" icon="file-text" block loading={downloading} onPress={() => onInvoice(payment)} /> : undefined}
    >
      {payment ? (
        <View>
          <KeyValue label="Transaction" value={payment.transactionId || "—"} mono />
          {payment.month ? <KeyValue label="Month" value={payment.month} /> : null}
          <KeyValue label="Course" value={payment.course?.title || fallbackCourse || "Tuition"} />
          <KeyValue label="Channel" value={channelLabel(payment)} />
          <KeyValue label="Amount" value={amountLabel(payment)} />
          <KeyValue label="Date" value={dateLabel(payment)} />
          <KeyValue label="Status" value={<Badge label={(payment.status || "").toUpperCase()} tone={statusTone(payment.status)} style={{ alignSelf: "flex-end" }} />} />
          {isGatewayPayment(payment) ? <KeyValue label="Gateway" value={<Badge label="SSL" tone="success" style={{ alignSelf: "flex-end" }} />} /> : null}
        </View>
      ) : null}
    </Sheet>
  );
}
