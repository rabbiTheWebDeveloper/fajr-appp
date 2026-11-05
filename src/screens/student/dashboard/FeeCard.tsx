import React from "react";
import { View } from "react-native";

import type { FeeSummary } from "@/lib/student-dashboard-shared";
import { useNav } from "@/navigation/nav";
import { GradientButton, onGradient } from "@/screens/student/dashboard/parts";
import { academyMonthDay, taka } from "@/screens/student/dashboard/utils";
import { gradients, type GradientName } from "@/theme/palette";
import { GradientCard, Icon, MIcon, Row, T, type IconName, type MIconName } from "@/ui";

/** Whether the fee needs the student's attention (a balance is due, or a payment is waiting to be confirmed). */
export const feeNeedsAttention = (fee: FeeSummary) => fee.monthlyDue > 0 || fee.underReview !== null;

interface FeeBannerProps {
  gradient: GradientName;
  icon?: IconName;
  mIcon?: MIconName;
  label: string;
  title: string;
  message: string;
  action: string;
  /** The quiet see-through button (nothing to do) instead of the solid one */
  quiet?: boolean;
}

function FeeBanner({ gradient, icon, mIcon, label, title, message, action, quiet }: FeeBannerProps) {
  const nav = useNav();
  return (
    <GradientCard gradient={gradient}>
      <Row gap={12} align="flex-start" accessibilityLabel={label}>
        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.chip }}>
          {mIcon ? <MIcon name={mIcon} size={21} color={onGradient.text} /> : <Icon name={icon ?? "circle"} size={20} color={onGradient.text} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <T variant="title" color={onGradient.text} weight="800">
            {title}
          </T>
          <T variant="small" color={onGradient.soft} weight="500">
            {message}
          </T>
          <View style={{ marginTop: 8 }}>
            <GradientButton title={action} iconRight={quiet ? undefined : "arrow-right"} soft={quiet} color={gradients[gradient][1]} onPress={() => nav.go("StudentPayments")} />
          </View>
        </View>
      </Row>
    </GradientCard>
  );
}

/**
 * The fee status, taken from the same figure the Payments page shows ("current balance due"),
 * not guessed from the calendar: a student who owes nothing is never told to pay.
 */
export default function FeeCard({ fee }: { fee: FeeSummary }) {
  if (fee.underReview) {
    return (
      <FeeBanner
        gradient="amber"
        mIcon="timer-sand"
        label="Payment under review"
        title="Payment under review"
        message={`${taka(fee.underReview.amount)}${fee.underReview.month ? ` for ${fee.underReview.month}` : ""} was received. The academy will confirm it soon.`}
        action="View"
      />
    );
  }

  if (fee.monthlyDue > 0) {
    return (
      <FeeBanner
        gradient="rose"
        icon="alert-circle"
        label="Fee due"
        title={`Fee due: ${taka(fee.monthlyDue)}`}
        message={`${fee.monthlyFee > 0 && fee.monthlyFee !== fee.monthlyDue ? `Your monthly fee is ${taka(fee.monthlyFee)}. ` : ""}Pay online in a minute with bKash, Nagad, card and more.`}
        action="Pay now"
      />
    );
  }

  const paidOn = fee.lastPaid ? academyMonthDay(fee.lastPaid.at) : null;
  return (
    <FeeBanner
      gradient="emerald"
      icon="check-circle"
      label="Fee status"
      title="Fees all cleared"
      message={fee.lastPaid ? `Last payment ${taka(fee.lastPaid.amount)}${paidOn ? ` on ${paidOn.month} ${paidOn.day}` : ""}. Alhamdulillah!` : "Nothing is due. Alhamdulillah!"}
      action="Payments"
      quiet
    />
  );
}
