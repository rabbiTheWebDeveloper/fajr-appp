import React from "react";
import { View } from "react-native";

import { copyText } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type Tone } from "@/theme/palette";
import { Card, GradientCard, Icon, IconButton, Row, T } from "@/ui";

interface Account {
  emoji: string;
  title: string;
  tone: Tone;
  /** Lines of "label: value" above the copyable number */
  lines?: { label: string; value: string }[];
  numberLabel: string;
  number: string;
  /** What goes on the clipboard (the number without spaces or dashes) */
  copyValue: string;
  note: string;
}

/** The academy's own accounts, for people who pay outside the SSLCommerz gateway and then send a slip */
const ACCOUNTS: Account[] = [
  {
    emoji: "🏦",
    title: "Islami Bank Bangladesh Limited",
    tone: "primary",
    lines: [{ label: "Account Name:", value: "Fajr Academy" }],
    numberLabel: "Account No:",
    number: "20502900100141913",
    copyValue: "20502900100141913",
    note: "Branch: Panthapath Branch · Routing: 125263614",
  },
  {
    emoji: "💳",
    title: "bKash Merchant Payment",
    tone: "danger",
    numberLabel: "Merchant No:",
    number: "01410764581",
    copyValue: "01410764581",
    note: 'Use "Make Payment" in the bKash App, enter merchant number and reference your Student ID.',
  },
  {
    emoji: "📲",
    title: "bKash Send Money",
    tone: "violet",
    numberLabel: "Personal No:",
    number: "+880 1634-813888",
    copyValue: "+8801634813888",
    note: 'Use "Send Money" in bKash App with your name or Student ID in reference.',
  },
];

export function AccountsReference() {
  const { c } = useTheme();
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <GradientCard gradient="navyDeep" padding={14} style={{ borderRadius: 0 }}>
        <Row gap={8}>
          <Icon name="home" size={15} color={c.onDarkMuted} />
          <T variant="bodyStrong" color="onDark" style={{ flex: 1 }}>
            {"Manual Bank & MFS Reference Details"}
          </T>
        </Row>
        <T variant="caption" color="onDarkMuted" style={{ marginTop: 2 }}>
          Use if paying outside SSL gateway
        </T>
      </GradientCard>

      <View style={{ padding: 14, gap: 12 }}>
        {ACCOUNTS.map((account) => {
          const tone = toneColors(c, account.tone);
          return (
            <View key={account.title} style={{ padding: 12, gap: 6, borderRadius: radius.md, backgroundColor: tone.bg }}>
              <T variant="bodyStrong" color={tone.fg}>
                {account.emoji} {account.title}
              </T>
              {account.lines?.map((line) => (
                <T key={line.label} variant="small" color="muted">
                  {line.label}{" "}
                  <T variant="smallStrong" color="text">
                    {line.value}
                  </T>
                </T>
              ))}
              <Row gap={6} justify="space-between">
                <T variant="small" color="muted" style={{ flex: 1 }}>
                  {account.numberLabel}{" "}
                  <T variant="mono" color={tone.fg} selectable>
                    {account.number}
                  </T>
                </T>
                <IconButton icon="copy" size={34} color={tone.fg} accessibilityLabel={`Copy ${account.numberLabel} ${account.number}`} onPress={() => void copyText(account.copyValue, "Number copied")} />
              </Row>
              <T variant="caption" color="muted">
                {account.note}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
