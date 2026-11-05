import React from "react";
import { Text, View } from "react-native";

import { useNow } from "@/lib/hooks";
import { paymentCompletion, paymentWindowStatus, type PaymentForm } from "@/screens/teacher/salary/payment-info";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { GradientCard, Icon, ProgressBar, Row, T } from "@/ui";

/** "Payment Info Completion 67%" with a bar: green when complete, amber from half, red below */
export function CompletionBar({ form }: { form: PaymentForm }) {
  const { c } = useTheme();
  const { done, total, pct } = paymentCompletion(form);
  const color = pct === 100 ? c.success : pct >= 50 ? c.warning : c.danger;
  const textColor = pct === 100 ? c.successText : pct >= 50 ? c.warningText : c.dangerText;
  return (
    <View style={{ gap: 4 }}>
      <Row justify="space-between">
        <Row gap={6}>
          <Icon name="shield" size={14} color={textColor} />
          <T variant="smallStrong" color="muted">
            Payment Info Completion
          </T>
        </Row>
        <T variant="bodyStrong" color={textColor} weight="800">
          {pct}%
        </T>
      </Row>
      <ProgressBar value={pct} color={color} />
      <T variant="caption" color="faint">
        {done} of {total} required fields filled
      </T>
    </View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Whether the monthly update window is open, with a live countdown to when it closes or opens next */
export function PaymentWindowBanner() {
  const { c } = useTheme();
  const status = paymentWindowStatus(useNow(1000));
  const accent = status.isOpen ? c.success : c.danger;
  const units: { value: number; label: string }[] = [
    { value: status.days, label: "Days" },
    { value: status.hours, label: "Hours" },
    { value: status.minutes, label: "Mins" },
    { value: status.seconds, label: "Secs" },
  ];

  return (
    <GradientCard gradient="navyDeep" style={{ gap: 12, borderWidth: 1, borderColor: accent }}>
      <View style={{ gap: 6 }}>
        <Row gap={6} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: accent, backgroundColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
          <T variant="caption" color="onDark" weight="800">
            {status.isOpen ? "উইন্ডো সক্রিয় (Window Open)" : "উইন্ডো বন্ধ (Window Locked)"}
          </T>
        </Row>
        <T variant="caption" color="onDarkMuted">
          {status.isOpen ? "১৫ তারিখ ০০:০০ থেকে ০২ তারিখ রাত ১১:৫৯" : "০৩ তারিখ থেকে ১৪ তারিখ রাত ১১:৫৯ বন্ধ"}
        </T>
      </View>

      <Row gap={8} align="flex-start">
        <Icon name={status.isOpen ? "unlock" : "lock"} size={18} color={accent} style={{ marginTop: 3 }} />
        <T variant="title" color="onDark" style={{ flex: 1, fontSize: 16.5, lineHeight: 24 }}>
          {status.isOpen ? "পেমেন্ট তথ্য আপডেট উইন্ডো এখন চালু আছে" : "পেমেন্ট তথ্য আপডেট উইন্ডো এখন সাময়িক বন্ধ"}
        </T>
      </Row>

      {status.isOpen ? (
        <T variant="small" color="onDarkMuted" style={{ lineHeight: 20 }}>
          পেমেন্ট তথ্য পরিবর্তনের উইন্ডো এখন সক্রিয়। আপনি{" "}
          <T variant="smallStrong" color="onDark" style={{ lineHeight: 20 }}>
            ০২ তারিখ রাত ১১:৫৯
          </T>{" "}
          পর্যন্ত তথ্য আপডেট করতে পারবেন।
        </T>
      ) : (
        <T variant="small" color="onDarkMuted" style={{ lineHeight: 20 }}>
          পেমেন্ট প্রসেসিং ও অডিটের সুবিধার্থে প্রতি মাসের{" "}
          <T variant="smallStrong" color="onDark" style={{ lineHeight: 20 }}>
            ০৩ তারিখ থেকে ১৪ তারিখ রাত ১১:৫৯
          </T>{" "}
          পর্যন্ত উইন্ডো বন্ধ থাকে।
        </T>
      )}

      {/* Live countdown */}
      <View style={{ alignItems: "center", gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(0,0,0,0.25)" }}>
        <Row gap={6}>
          <Icon name="clock" size={14} color={accent} />
          <T variant="smallStrong" color="onDark">
            {status.isOpen ? "উইন্ডো বন্ধ হতে বাকি (Closes In)" : "পরবর্তী উইন্ডো শুরু হতে বাকি (Opens In)"}
          </T>
        </Row>
        <Row gap={6} align="flex-start" accessibilityLabel={`${status.days} days ${status.hours} hours ${status.minutes} minutes ${status.seconds} seconds`}>
          {units.map((unit, index) => (
            <React.Fragment key={unit.label}>
              {index > 0 ? <Text style={{ color: accent, fontSize: 20, fontWeight: "800", lineHeight: 46 }}>:</Text> : null}
              <View style={{ alignItems: "center", gap: 4 }}>
                <View style={{ width: 48, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: accent, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{pad2(unit.value)}</Text>
                </View>
                <T variant="caption" color="onDarkMuted" weight="700" style={{ fontSize: 10, textTransform: "uppercase" }}>
                  {unit.label}
                </T>
              </View>
            </React.Fragment>
          ))}
        </Row>
      </View>
    </GradientCard>
  );
}
