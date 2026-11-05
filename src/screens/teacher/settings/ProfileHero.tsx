import React, { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { openInApp } from "@/lib/device";
import { calcTeacherPortalCompletion, type TeacherPortalCheckItem, type TeacherPortalModeStats } from "@/lib/teacher-profile-helper";
import { useNav } from "@/navigation/nav";
import { darkPalette, type Tone } from "@/theme/palette";
import { useTheme } from "@/theme/ThemeContext";
import { Avatar, Badge, Button, GradientCard, Icon, Row, Sheet, T, type IconName } from "@/ui";

import { OnDarkPill } from "@/screens/teacher/settings/parts";
import { getServiceDuration, parseTab, type SettingsTab, type TeacherProfileData } from "@/screens/teacher/settings/types";

interface ProfileHeroProps {
  profile: TeacherProfileData | null;
  activeTab: SettingsTab;
  uploadingImage: boolean;
  onChangePhoto: () => void;
  onSwitchTab: (tab: SettingsTab) => void;
}

/**
 * The navy card on top of every settings tab: photo (with the change-photo button), ID and status pills,
 * name, designation, service time, the public-portfolio link and the profile-completeness meter.
 */
export function ProfileHero({ profile, activeTab, uploadingImage, onChangePhoto, onSwitchTab }: ProfileHeroProps) {
  const { c } = useTheme();
  const nav = useNav();
  const [showChecklist, setShowChecklist] = useState(false);

  const completion = calcTeacherPortalCompletion(profile);
  const { overallPct, modes, done, total } = completion;
  const statusTone: Tone = overallPct >= 85 ? "success" : overallPct >= 50 ? "warning" : "danger";
  const barColor = overallPct === 100 ? darkPalette.success : overallPct >= 70 ? darkPalette.primary : overallPct >= 40 ? darkPalette.warning : darkPalette.danger;
  const idStatus = profile?.idCardStatus;

  /** A checklist row leads to the place where that step is filled in */
  const openCheck = (item: TeacherPortalCheckItem) => {
    setShowChecklist(false);
    if (item.mode !== "payment") {
      onSwitchTab(item.mode);
      return;
    }
    const href = item.href || "/teacher/salary";
    const ownTab = href.startsWith("/teacher/settings") ? parseTab(href.split("tab=")[1]) : null;
    if (ownTab) onSwitchTab(ownTab);
    else nav.openPath(href);
  };

  return (
    <GradientCard gradient="navy" style={{ gap: 14 }}>
      <Row gap={14} align="flex-start">
        <View>
          <Avatar uri={profile?.avatar || null} name={profile?.fullName || "T"} size={84} square />
          {uploadingImage ? (
            <View style={{ position: "absolute", top: 0, left: 0, width: 84, height: 84, borderRadius: 25, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={c.gold} />
            </View>
          ) : null}
          <Pressable
            onPress={uploadingImage ? undefined : onChangePhoto}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Change Photo"
            style={{ position: "absolute", right: -8, bottom: -8, width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, borderWidth: 2, borderColor: c.navy }}
          >
            <Icon name="camera" size={15} color="#ffffff" />
          </Pressable>
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Row gap={6} wrap>
            <OnDarkPill label={profile?.teacherId || "FJRT-PENDING"} mono />
            <OnDarkPill label={(profile?.status || "Active").toUpperCase()} tone="success" />
            {idStatus === "approved" ? (
              <OnDarkPill label="ID Card Approved" tone="warning" icon="shield" onPress={() => onSwitchTab("idcard")} />
            ) : (
              <OnDarkPill label={`ID Card ${idStatus === "rejected" ? "Rejected" : "Pending"}`} tone="neutral" icon="lock" onPress={() => onSwitchTab("idcard")} />
            )}
          </Row>
          <T variant="h2" color="onDark" numberOfLines={2}>
            {profile?.fullName || "Teacher Profile"}
          </T>
          <T variant="small" color="onDarkMuted">
            {profile?.designation || "Faculty Instructor"}
          </T>
          <T variant="small" color="onDarkMuted" numberOfLines={1}>
            {profile?.email || "No email"}
          </T>
        </View>
      </Row>

      {profile?.joinDate ? (
        <Row gap={6}>
          <Icon name="star" size={13} color={darkPalette.successText} />
          <T variant="smallStrong" color={darkPalette.successText} style={{ flex: 1 }}>
            Current Service: {getServiceDuration(profile.joinDate)}
          </T>
        </Row>
      ) : null}

      {profile?.portfolioHeadline ? (
        <T variant="small" color="onDarkMuted" numberOfLines={2} style={{ fontStyle: "italic" }}>
          “{profile.portfolioHeadline}”
        </T>
      ) : null}

      <Button title="View Portfolio" icon="eye" iconRight="external-link" variant="gold" size="sm" onPress={() => void openInApp("/teacher-portfolio")} />

      {/* Profile completeness: overall, per mode, and the full checklist in a sheet */}
      <View style={{ gap: 10, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
        <Row justify="space-between" gap={8}>
          <Row gap={6} style={{ flexShrink: 1 }}>
            <Icon name="shield" size={14} color={c.gold} />
            <T variant="smallStrong" color="onDark" numberOfLines={1} style={{ flexShrink: 1 }}>
              Profile Completeness
            </T>
          </Row>
          <Row gap={6}>
            <OnDarkPill label={completion.status.label} tone={statusTone} />
            <T variant="bodyStrong" color="onDark" weight="800">
              {overallPct}%
            </T>
          </Row>
        </Row>

        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: overallPct }} style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <View style={{ width: `${overallPct}%`, height: "100%", borderRadius: 4, backgroundColor: barColor }} />
        </View>

        <Row gap={6}>
          <ModePill label="Personal" pct={modes.personal.pct} active={activeTab === "personal"} onPress={() => onSwitchTab("personal")} />
          <ModePill label="Portfolio" pct={modes.portfolio.pct} active={activeTab === "portfolio"} onPress={() => onSwitchTab("portfolio")} />
          <ModePill label="Payout" pct={modes.payment.pct} active={false} onPress={() => nav.go("TeacherSalary")} />
        </Row>

        <Row justify="space-between">
          <T variant="caption" color="onDarkMuted">
            {done} of {total} steps completed
          </T>
          <Pressable onPress={() => setShowChecklist(true)} hitSlop={10} accessibilityRole="button">
            <T variant="caption" color={c.gold} weight="700" style={{ textDecorationLine: "underline" }}>
              View Checklist
            </T>
          </Pressable>
        </Row>
      </View>

      <Sheet visible={showChecklist} onClose={() => setShowChecklist(false)} title="Mode-Wise Completeness" subtitle={`${done}/${total} (${overallPct}%) · Tap any incomplete step to jump directly to it`}>
        <ChecklistGroup icon="user" tone="primary" stats={modes.personal} onOpen={openCheck} />
        <ChecklistGroup icon="award" tone="warning" stats={modes.portfolio} onOpen={openCheck} />
        <ChecklistGroup
          icon="credit-card"
          tone="success"
          stats={modes.payment}
          onOpen={openCheck}
          action={
            <Button
              title="Edit"
              size="sm"
              variant="ghost"
              onPress={() => {
                setShowChecklist(false);
                nav.go("TeacherSalary");
              }}
            />
          }
        />
      </Sheet>
    </GradientCard>
  );
}

function ModePill({ label, pct, active, onPress }: { label: string; pct: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} completion ${pct}%`}
      style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: active ? "rgba(223,183,108,0.6)" : "rgba(255,255,255,0.12)", backgroundColor: active ? "rgba(223,183,108,0.16)" : "transparent" }}
    >
      <T variant="caption" color="onDarkMuted">
        {label}
      </T>
      <T variant="smallStrong" color="onDark">
        {pct}%
      </T>
    </Pressable>
  );
}

function ChecklistGroup({ icon, tone, stats, onOpen, action }: { icon: IconName; tone: Tone; stats: TeacherPortalModeStats; onOpen: (item: TeacherPortalCheckItem) => void; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Row justify="space-between" gap={8}>
        <Badge label={stats.label} tone={tone} icon={icon} />
        <Row gap={4}>
          <T variant="smallStrong" color="muted">
            {stats.done}/{stats.total} ({stats.pct}%)
          </T>
          {action}
        </Row>
      </Row>
      {stats.checks.map((item) => (
        <Pressable key={item.key} onPress={() => onOpen(item)} android_ripple={{ color: c.border }} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 40, paddingHorizontal: 6 }}>
          <T variant={item.done ? "small" : "smallStrong"} color={item.done ? "text" : "warning"} style={{ flex: 1 }}>
            {item.label}
          </T>
          <Icon name={item.done ? "check" : item.mode === "payment" ? "external-link" : "circle"} size={15} color={item.done ? c.success : c.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}
