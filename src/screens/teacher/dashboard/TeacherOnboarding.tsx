import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

import { isOpenDuringOnboarding, youtubeWatchUrl } from "@/config/teacher-onboarding";
import { openExternal } from "@/lib/device";
import { formatDate } from "@/lib/format";
import { useNav } from "@/navigation/nav";
import type { OnboardingStepState, TeacherOnboardingController } from "@/screens/teacher/shell/onboarding";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Banner, Button, Card, GradientCard, Icon, MIcon, ProgressBar, Row, Sheet, Skeleton, T, type IconName } from "@/ui";

/** "5 Nov", or nothing for a missing date */
const shortDate = (value: string | null) => formatDate(value, "dayMonth", "");

/* ───────────────────────── Tutorial player ───────────────────────── */

interface VideoSheetProps {
  step: OnboardingStepState | undefined;
  busy: boolean;
  error: string;
  onClose: () => void;
  onMarkWatched: () => void;
}

/** The tutorial video: a preview card that plays the video in YouTube, and the "I have watched this" action */
function VideoSheet({ step, busy, error, onClose, onMarkWatched }: VideoSheetProps) {
  const { c } = useTheme();
  const video = step?.video;

  return (
    <Sheet
      visible={!!step && !!video}
      onClose={onClose}
      title={step?.title}
      footer={
        step?.done ? (
          <Row gap={6} justify="center" style={{ minHeight: 44 }}>
            <Icon name="check-circle" size={16} color={c.success} />
            <T variant="bodyStrong" color="success">
              Marked as watched
            </T>
          </Row>
        ) : (
          <Button title="I have watched this" icon="check-circle" variant="success" block loading={busy} onPress={onMarkWatched} />
        )
      }
    >
      {video ? <T variant="title">{video.title}</T> : null}

      {video ? (
        <Pressable
          onPress={() => void openExternal(youtubeWatchUrl(video.id))}
          accessibilityRole="button"
          accessibilityLabel={`Play video: ${video.title}`}
          style={({ pressed }) => ({ borderRadius: 14, overflow: "hidden", backgroundColor: c.navyDeep, aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.9 : 1 })}
        >
          <Image source={{ uri: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` }} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,13,32,0.35)" }} />
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.danger, alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={28} color="#ffffff" style={{ marginLeft: 4 }} />
          </View>
        </Pressable>
      ) : null}

      {video ? (
        <Pressable onPress={() => void openExternal(youtubeWatchUrl(video.id))} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 }}>
          <Icon name="external-link" size={14} color={c.primaryText} />
          <T variant="smallStrong" color="primary">
            View full video on YouTube
          </T>
        </Pressable>
      ) : null}

      {error ? (
        <T variant="small" color="danger" accessibilityRole="alert">
          {error}
        </T>
      ) : null}
    </Sheet>
  );
}

/* ───────────────────────── Small pieces ───────────────────────── */

/** A text link with an icon, for the secondary actions of a step */
function TextAction({ label, icon, color, onPress, busy }: { label: string; icon: IconName; color: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={busy ? undefined : onPress} hitSlop={6} accessibilityRole="button" accessibilityState={{ busy: !!busy }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 34, opacity: busy ? 0.6 : pressed ? 0.7 : 1 })}>
      {busy ? <ActivityIndicator size="small" color={color} /> : <Icon name={icon} size={14} color={color} />}
      <Text style={{ color, fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

/* ───────────────────────── Checklist ───────────────────────── */

/**
 * The first-week "Get Started" checklist of a new teacher. Tutorial steps are marked by the teacher; every
 * other step completes by itself once the task is done (the server checks the real data). When everything is
 * finished it becomes the "all set" panel, which the teacher can hide for good.
 */
export function TeacherOnboarding({ onboarding }: { onboarding: TeacherOnboardingController }) {
  const { c } = useTheme();
  const nav = useNav();
  const { state, loadError, busyKey, actionError, retry, clearActionError, markWatched, dismiss } = onboarding;
  const [watching, setWatching] = useState<string | null>(null);

  const closeVideo = useCallback(() => {
    setWatching(null);
    clearActionError();
  }, [clearActionError]);

  // ── Loading and error ──
  if (!state) {
    if (loadError) {
      return (
        <Card>
          <Row gap={10} align="flex-start">
            <Icon name="alert-circle" size={17} color={c.dangerText} style={{ marginTop: 2 }} />
            <T variant="bodyStrong" color="danger" style={{ flex: 1 }} accessibilityRole="alert">
              {loadError}
            </T>
          </Row>
          <Button title="Retry" icon="refresh-cw" variant="secondary" size="sm" onPress={retry} style={{ marginTop: 12 }} />
        </Card>
      );
    }
    return (
      <Card style={{ gap: 14 }}>
        <View accessibilityLabel="Loading your getting-started checklist" style={{ gap: 14 }}>
          <Row gap={12}>
            <Skeleton width={40} height={40} rounded={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="60%" height={15} />
              <Skeleton width="85%" height={11} />
            </View>
          </Row>
          <Skeleton height={8} />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} height={56} rounded={12} />
          ))}
        </View>
      </Card>
    );
  }

  const watchingStep = watching ? state.steps.find((step) => step.key === watching) : undefined;
  const videoSheet = (
    <VideoSheet
      step={watchingStep}
      busy={!!watchingStep && busyKey === watchingStep.key}
      error={actionError}
      onClose={closeVideo}
      onMarkWatched={() => {
        if (watchingStep) void markWatched(watchingStep.key).then((ok) => ok && closeVideo());
      }}
    />
  );

  // ── Everything done ──
  if (state.allDone) {
    if (state.dismissed) return null;
    return (
      <>
        <GradientCard gradient="emerald" style={{ gap: 16 }}>
          <Row gap={12} align="flex-start">
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="party-popper" size={24} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={{ color: "#ffffff", fontSize: 19, fontWeight: "800" }}>
                You&apos;re all set!
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, lineHeight: 19, marginTop: 2 }}>
                You finished all {state.total} getting-started steps{state.completedAt ? ` on ${shortDate(state.completedAt)}` : ""}. You are ready to teach.
              </Text>
            </View>
          </Row>

          <View style={{ gap: 8 }}>
            {state.steps.map((step) => (
              <View key={step.key} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Icon name="check-circle" size={16} color="#ffffff" />
                <Text numberOfLines={1} style={{ flex: 1, color: "#ffffff", fontSize: 12.5, fontWeight: "600" }}>
                  {step.title}
                </Text>
                {step.video ? (
                  <Pressable onPress={() => setWatching(step.key)} hitSlop={8} accessibilityRole="button">
                    <Text style={{ color: "#ffffff", fontSize: 11.5, fontWeight: "700", textDecorationLine: "underline" }}>Watch again</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5 }}>{shortDate(step.completedAt)}</Text>
                )}
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <Pressable onPress={() => nav.go("TeacherClasses")} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, backgroundColor: "#ffffff", opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: c.navy, fontSize: 13, fontWeight: "800" }}>Go to my classes</Text>
              <Icon name="arrow-right" size={15} color={c.navy} />
            </Pressable>
            <Pressable
              onPress={busyKey === "dismiss" ? undefined : () => void dismiss()}
              accessibilityRole="button"
              accessibilityState={{ busy: busyKey === "dismiss" }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", opacity: busyKey === "dismiss" ? 0.6 : pressed ? 0.8 : 1 })}
            >
              {busyKey === "dismiss" ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>Hide this panel</Text>
            </Pressable>
          </View>

          {actionError && !watching ? (
            <Text accessibilityRole="alert" style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "600" }}>
              {actionError}
            </Text>
          ) : null}
        </GradientCard>
        {videoSheet}
      </>
    );
  }

  // ── In progress ──
  const nextKey = state.steps.find((step) => !step.done)?.key;
  const stepsToUnlock = state.steps.filter((step) => step.blocksDashboard && !step.done).length;

  return (
    <>
      <Card style={{ gap: 16 }}>
        <Row gap={12} align="flex-start">
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
            <MIcon name="rocket-launch" size={21} color="#ffffff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="title" accessibilityRole="header">
              Get started with FAJR Academy
            </T>
            <T variant="small" color="muted">
              {state.unlocked ? "Finish the last steps to set up your teaching account." : `Finish ${stepsToUnlock} more ${stepsToUnlock === 1 ? "step" : "steps"} to unlock your dashboard.`}
            </T>
          </View>
          <View style={{ alignItems: "flex-end" }} accessibilityLabel={`${state.completedCount} of ${state.total} steps done`}>
            <T variant="h1" style={{ lineHeight: 26 }}>
              {state.completedCount}
              <T variant="h1" color="faint">
                /{state.total}
              </T>
            </T>
            <T variant="caption" color="muted">
              steps done
            </T>
          </View>
        </Row>

        <ProgressBar value={state.completedCount} max={state.total} />

        <View style={{ gap: 8 }}>
          {state.steps.map((step, index) => {
            const isNext = step.key === nextKey;
            const pageLocked = !step.done && !state.unlocked && !isOpenDuringOnboarding(step.href);
            return (
              <View
                key={step.key}
                style={{ gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, borderColor: step.done ? c.success + "55" : isNext ? c.primary + "77" : c.border, backgroundColor: step.done ? c.successSoft : isNext ? c.primarySoft : c.surface }}
              >
                <Row gap={10} align="flex-start">
                  {step.done ? (
                    <Icon name="check-circle" size={24} color={c.success} />
                  ) : (
                    <View accessibilityLabel="Not done yet" style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isNext ? c.primary : c.borderStrong, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: isNext ? c.primaryText : c.textFaint, fontSize: 11, fontWeight: "800" }}>{index + 1}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Row gap={6} wrap>
                      <T variant="bodyStrong" color={step.done ? "muted" : "text"} weight="700" style={{ flexShrink: 1 }}>
                        {step.title}
                      </T>
                      {isNext ? <Badge label="NEXT" tone="primary" solid /> : null}
                      {!state.unlocked && !step.blocksDashboard && !step.done ? <Badge label="Not needed to unlock" tone="neutral" /> : null}
                      {step.done && step.completedAt ? (
                        <T variant="caption" color="success">
                          Done {shortDate(step.completedAt)}
                        </T>
                      ) : null}
                    </Row>
                    <T variant="small" color="muted">
                      {step.description}
                    </T>
                    {step.hint ? <Banner tone="warning" icon="info" message={step.hint} style={{ marginTop: 6, paddingVertical: 8 }} /> : null}
                  </View>
                </Row>

                {step.video ? (
                  <Row gap={14} wrap style={{ paddingLeft: 34 }}>
                    <Button title={step.done ? "Watch again" : "Watch"} icon="play-circle" size="sm" variant={step.done ? "secondary" : "primary"} onPress={() => setWatching(step.key)} />
                    <TextAction label="Full video" icon="external-link" color={c.primaryText} onPress={() => void openExternal(youtubeWatchUrl(step.video?.id ?? ""))} />
                    {!step.done ? <TextAction label="Mark watched" icon="check-circle" color={c.successText} busy={busyKey === step.key} onPress={() => void markWatched(step.key)} /> : null}
                  </Row>
                ) : pageLocked ? (
                  // The page for this step is itself locked until the dashboard unlocks
                  <Row gap={6} style={{ paddingLeft: 34 }}>
                    <Icon name="lock" size={13} color={c.textFaint} />
                    <T variant="caption" color="faint" style={{ flex: 1 }}>
                      Opens when your dashboard unlocks
                    </T>
                  </Row>
                ) : !step.done ? (
                  <View style={{ paddingLeft: 34 }}>
                    <Button title={step.actionLabel} iconRight="arrow-right" size="sm" variant={isNext ? "primary" : "secondary"} onPress={() => nav.openPath(step.href)} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {actionError && !watching ? (
          <T variant="small" color="danger" accessibilityRole="alert">
            {actionError}
          </T>
        ) : null}
      </Card>
      {videoSheet}
    </>
  );
}
