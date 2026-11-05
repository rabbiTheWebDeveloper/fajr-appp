import React from "react";
import { Pressable, Text, View } from "react-native";

import { calcTeacherPortalCompletion } from "@/lib/teacher-profile-helper";
import { useNav } from "@/navigation/nav";
import type { TeacherProfile } from "@/screens/teacher/TeacherContext";
import { useTheme } from "@/theme/ThemeContext";
import { Button, Card, ErrorState, Icon, ProgressBar, ProgressRing, Row, Skeleton, T } from "@/ui";

/**
 * Profile completion: how many of the profile, portfolio and payment fields are filled in, the first few that
 * are still missing (each opens the place to fill it), and shortcuts to Settings and Payment Info.
 */
export function ProfileCompletionCard({ profile, loading, onRetry }: { profile: TeacherProfile | null; loading: boolean; onRetry: () => void }) {
  const { c } = useTheme();
  const nav = useNav();

  // Without the profile there is nothing true to count
  if (!profile && !loading) {
    return (
      <Card padding={0}>
        <ErrorState compact title="Could not load your profile" message="Check your internet connection and try again." onRetry={onRetry} />
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card style={{ gap: 14 }}>
        <View accessibilityLabel="Loading profile completion" style={{ gap: 14 }}>
          <Skeleton width="55%" height={16} />
          <Row gap={16}>
            <Skeleton width={80} height={80} rounded={40} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="50%" height={12} />
              <Skeleton height={8} />
            </View>
          </Row>
        </View>
      </Card>
    );
  }

  const result = calcTeacherPortalCompletion(profile);
  const pct = result.overallPct;
  const incomplete = result.checks.filter((check) => !check.done);
  // Green when complete, blue from 70%, amber from 40%, red below
  const color = pct === 100 ? c.success : pct >= 70 ? c.primary : pct >= 40 ? c.warning : c.danger;
  const textColor = pct === 100 ? c.successText : pct >= 70 ? c.primaryText : pct >= 40 ? c.warningText : c.dangerText;

  return (
    <Card style={{ gap: 16 }}>
      <View>
        <Row gap={10}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
            <Icon name="shield" size={16} color="#ffffff" />
          </View>
          <T variant="title" accessibilityRole="header">
            Profile Completion
          </T>
        </Row>
        <T variant="small" color="faint" style={{ paddingLeft: 40 }}>
          Complete your profile to get the best experience.
        </T>
      </View>

      <Row gap={18}>
        <ProgressRing percent={pct} size={80} strokeWidth={7} color={color}>
          <Text style={{ color: textColor, fontSize: 18, fontWeight: "900" }}>{pct}%</Text>
        </ProgressRing>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <T variant="small" color="muted">
            {result.done} of {result.total} fields
          </T>
          <ProgressBar value={pct} color={color} />
          {pct === 100 ? (
            <Row gap={5}>
              <Icon name="check-circle" size={13} color={c.successText} />
              <T variant="caption" color="success" weight="700">
                Profile fully complete!
              </T>
            </Row>
          ) : (
            <T variant="caption" color="faint">
              {incomplete.length} items remaining
            </T>
          )}
        </View>
      </Row>

      {incomplete.length > 0 ? (
        <View>
          {incomplete.slice(0, 4).map((check) => (
            <Pressable key={check.key} onPress={() => nav.openPath(check.href)} accessibilityRole="button" accessibilityLabel={`Complete: ${check.label}`} android_ripple={{ color: c.border }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, paddingHorizontal: 6, borderRadius: 8 }}>
              <Icon name="circle" size={13} color={c.borderStrong} />
              <T variant="small" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                {check.label}
              </T>
              <Icon name="chevron-right" size={15} color={c.textFaint} />
            </Pressable>
          ))}
          {incomplete.length > 4 ? (
            <T variant="caption" color="faint" style={{ paddingLeft: 29, paddingTop: 4 }}>
              +{incomplete.length - 4} more to complete
            </T>
          ) : null}
        </View>
      ) : null}

      <Row gap={10} style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border }}>
        <Button title="Account Settings" variant="secondary" size="sm" block style={{ flex: 1, height: 40 }} onPress={() => nav.go("TeacherSettings")} />
        <Button title="Payment Info" variant="secondary" size="sm" block style={{ flex: 1, height: 40 }} onPress={() => nav.go("TeacherSalary")} />
      </Row>
    </Card>
  );
}
