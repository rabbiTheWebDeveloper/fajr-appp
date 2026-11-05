import React from "react";
import { Pressable, View } from "react-native";

import { darkPalette, radius, toneColors, type Tone } from "@/theme/palette";
import { useTheme } from "@/theme/ThemeContext";
import { Button, Card, Divider, Icon, IconChip, Row, T, type IconName } from "@/ui";

/** A settings card: tinted icon, title and subtitle on top, the fields under a divider */
export function SectionCard({ icon, tone = "primary", title, subtitle, action, children }: { icon: IconName; tone?: Tone; title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card style={{ gap: 14 }}>
      <Row gap={10} align="flex-start">
        <IconChip icon={icon} tone={tone} size={36} />
        <View style={{ flex: 1 }}>
          <T variant="title">{title}</T>
          {subtitle ? (
            <T variant="small" color="muted">
              {subtitle}
            </T>
          ) : null}
        </View>
      </Row>
      {action}
      <Divider />
      {children}
    </Card>
  );
}

/** A small status pill for the navy hero cards (always on a dark background, so it uses the dark tones) */
export function OnDarkPill({ label, tone = "primary", icon, mono, onPress }: { label: string; tone?: Tone; icon?: IconName; mono?: boolean; onPress?: () => void }) {
  const t = toneColors(darkPalette, tone);
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: t.bg, borderWidth: 1, borderColor: `${t.solid}55` }}>
      {icon ? <Icon name={icon} size={11} color={t.fg} /> : null}
      <T variant="caption" color={t.fg} weight="700" style={mono ? { fontFamily: "monospace" } : undefined}>
        {label}
      </T>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Pressable>
  );
}

/** The card at the end of the Personal and Portfolio tabs: whether that tab has unsaved edits, and its save button */
export function SaveStatusCard({ unsaved, title, message, buttonTitle, saving, disabled, onSave }: { unsaved: boolean; title: string; message: string; buttonTitle: string; saving: boolean; disabled: boolean; onSave: () => void }) {
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12} align="flex-start">
        <IconChip icon={unsaved ? "alert-circle" : "check-circle"} tone={unsaved ? "warning" : "success"} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{title}</T>
          <T variant="small" color="muted">
            {message}
          </T>
        </View>
      </Row>
      <Button title={buttonTitle} icon="save" block loading={saving} disabled={disabled} onPress={onSave} />
    </Card>
  );
}

/** The dashed "nothing added yet" box inside a list card */
export function EmptyBox({ icon, title, message }: { icon: IconName; title: string; message?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 4, paddingVertical: 22, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, backgroundColor: c.surfaceAlt }}>
      <Icon name={icon} size={28} color={c.textFaint} />
      <T variant="smallStrong" center>
        {title}
      </T>
      {message ? (
        <T variant="caption" color="faint" center>
          {message}
        </T>
      ) : null}
    </View>
  );
}
