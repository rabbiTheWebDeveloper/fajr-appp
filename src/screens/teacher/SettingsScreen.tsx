import React, { useEffect, useState } from "react";

import { calcTeacherPortalCompletion } from "@/lib/teacher-profile-helper";
import { useRouteParams } from "@/navigation/nav";
import { RemindersCard } from "@/notifications/RemindersCard";
import { loadTeacherReminderSlots } from "@/screens/teacher/schedule/reminder-slots";
import { IdCardTab } from "@/screens/teacher/settings/IdCardTab";
import { PersonalTab } from "@/screens/teacher/settings/PersonalTab";
import { PortfolioTab } from "@/screens/teacher/settings/PortfolioTab";
import { ProfileHero } from "@/screens/teacher/settings/ProfileHero";
import { SaveBar } from "@/screens/teacher/settings/SaveBar";
import { SecurityTab } from "@/screens/teacher/settings/SecurityTab";
import { SettingsTabs } from "@/screens/teacher/settings/SettingsTabs";
import { SlotsTab, useTeacherSlots } from "@/screens/teacher/settings/SlotsTab";
import { parseTab, type SettingsTab } from "@/screens/teacher/settings/types";
import { useSettingsProfile } from "@/screens/teacher/settings/useSettingsProfile";
import { Banner, ErrorState, Screen, Skeleton, SkeletonList } from "@/ui";

/**
 * Teacher settings: Personal & Contact, Portfolio & Career, My Slots, Notifications, Digital ID Card and
 * Security & Password. Opens on the tab named in the `tab` route param (the website's `?tab=` keys).
 */
export default function TeacherSettingsScreen() {
  const params = useRouteParams<{ tab?: string }>();
  const [tab, setTab] = useState<SettingsTab>(() => parseTab(params.tab) ?? "personal");
  const settings = useSettingsProfile();
  const slots = useTeacherSlots(tab === "slots");
  const { profile, unsaved } = settings;

  // A shortcut can re-open this screen on another tab while it is already on show
  useEffect(() => {
    const next = parseTab(params.tab);
    if (next) setTab(next);
  }, [params.tab]);

  if (settings.loading) {
    return (
      <Screen>
        <Skeleton height={260} rounded={16} />
        <SkeletonList count={3} lines={3} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <ErrorState title="Could not load your profile" message={settings.loadError} onRetry={settings.retry} />
      </Screen>
    );
  }

  const completion = calcTeacherPortalCompletion(profile);
  // The save bar belongs to the Personal and Portfolio tabs; on another tab it only appears while an edit
  // (for example a new photo picked from the header) is still waiting to be saved
  const saveMode = tab === "personal" || tab === "portfolio" ? tab : unsaved.personal ? "personal" : unsaved.portfolio ? "portfolio" : null;
  const onSlots = tab === "slots";

  return (
    <Screen
      onRefresh={onSlots ? slots.refresh : settings.refresh}
      refreshing={onSlots ? slots.refreshing : settings.refreshing}
      header={
        <SettingsTabs
          active={tab}
          onChange={setTab}
          personalPct={completion.modes.personal.pct}
          portfolioPct={completion.modes.portfolio.pct}
          unsavedPersonal={unsaved.personal}
          unsavedPortfolio={unsaved.portfolio}
          idCardStatus={profile.idCardStatus}
          emailUnverified={!!profile.email && !profile.emailVerified}
        />
      }
      footer={saveMode ? <SaveBar mode={saveMode} unsaved={unsaved} savingMode={settings.savingMode} disabled={settings.busy} onSave={(mode) => void settings.save(mode)} /> : undefined}
    >
      <ProfileHero profile={profile} activeTab={tab} uploadingImage={settings.uploadingImage} onChangePhoto={() => void settings.uploadAvatar()} onSwitchTab={setTab} />

      {settings.error ? <Banner tone="danger" message={settings.error} onClose={settings.clearError} /> : null}

      {tab === "personal" ? <PersonalTab settings={settings} onSwitchTab={setTab} /> : null}
      {tab === "portfolio" ? <PortfolioTab settings={settings} /> : null}
      {tab === "slots" ? <SlotsTab slots={slots} /> : null}
      {tab === "notifications" ? <RemindersCard loadSlots={loadTeacherReminderSlots} /> : null}
      {tab === "idcard" ? <IdCardTab profile={profile} /> : null}
      {tab === "security" ? <SecurityTab settings={settings} /> : null}
    </Screen>
  );
}
