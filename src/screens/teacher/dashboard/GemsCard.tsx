import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { formatNumber } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { darkPalette, gradients, type GradientName } from "@/theme/palette";
import { Button, Card, ErrorState, GradientCard, MIcon, Sheet, Skeleton, T } from "@/ui";

/** GET /api/teacher-portal/gems: the teacher's gems, monthly gain, streak and tier */
export interface GemsReply {
  success?: boolean;
  totalGems?: number;
  monthlyGems?: number;
  streak?: number;
  tier?: {
    name?: string;
    label?: string;
    emoji?: string;
    /** 0-100 towards the next tier (100 on the last tier) */
    progressToNext?: number;
    next?: { label?: string; emoji?: string; minGems?: number } | null;
  };
}

const TIER_GRADIENTS: Record<string, GradientName> = {
  starter: "emerald",
  bronze: "amber",
  silver: "slate",
  gold: "gold",
  diamond: "sky",
  elite: "violet",
};

const QUICK_RULES = [
  { label: "Schedule class", gems: "+1", gain: true },
  { label: "Complete class", gems: "+3", gain: true },
  { label: "Student present", gems: "+2", gain: true },
  { label: "Cancel / Reset", gems: "-2 / -1", gain: false },
];

const HOW_TO_EARN = [
  "Complete modules or class sessions on time to collect module completion gems.",
  "Ensure students are present and active to score quiz/attendance gems.",
  "Win catch-up challenges or meet class targets to receive challenge-based gems.",
  "Earn extra gems from special instructor incubator programs or special manual rewards.",
];

const HOW_TO_USE = [
  "Spend gems to unlock rewards, certification content, and extra training resources.",
  "Use gems for scheduling late submissions or assignment resubmissions.",
  "Revive missed daily teaching streaks or restart special monthly catch-up challenges.",
  "Use gems to request an exclusive meeting with the CEO.",
  "Spend gems to submit priority support tickets or request bank account changes.",
];

// The card is dark in both themes, so the colours on it come from the dark palette
const ON_CARD = darkPalette;

function NumberedList({ items, tone }: { items: string[]; tone: "primary" | "warning" }) {
  const { c } = useTheme();
  return (
    <>
      {items.map((text, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 12, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong }}>
            <T variant="bodyStrong" color={tone} weight="800">
              {index + 1}
            </T>
          </View>
          <T style={{ flex: 1, lineHeight: 21 }}>{text}</T>
        </View>
      ))}
    </>
  );
}

interface GemsCardProps {
  gems: GemsReply | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onLeaderboard: () => void;
}

/** Gems points: total, tier and progress to the next tier, this month's gain, the streak, and how gems are earned and used */
export function GemsCard({ gems, loading, error, onRetry, onLeaderboard }: GemsCardProps) {
  const [earnOpen, setEarnOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);

  if (!gems) {
    if (loading) return <Skeleton height={230} rounded={16} />;
    return (
      <Card padding={0}>
        <ErrorState compact title="Could not load your gems" message={error || "Please try again."} onRetry={onRetry} />
      </Card>
    );
  }

  const totalGems = gems.totalGems ?? 0;
  const monthlyGems = gems.monthlyGems ?? 0;
  const streak = gems.streak ?? 0;
  const tier = gems.tier ?? {};
  const progressPct = Math.max(0, Math.min(100, tier.progressToNext ?? 0));
  const tierGradient = gradients[TIER_GRADIENTS[tier.name ?? ""] ?? "emerald"];
  const next = tier.next;

  return (
    <GradientCard gradient="navyDeep" style={{ gap: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <LinearGradient colors={[tierGradient[0], tierGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 25 }}>{tier.emoji ?? "🌱"}</Text>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MIcon name="star-four-points" size={13} color={ON_CARD.gold} />
            <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>GEMS POINTS</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 24, fontWeight: "900" }}>
            {formatNumber(totalGems)} 💎
          </Text>
          {tier.label ? <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 12 }}>{tier.label}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" }}>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
            {monthlyGems >= 0 ? "+" : ""}
            {formatNumber(monthlyGems)}
          </Text>
          <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 10.5, fontWeight: "600" }}>This Month</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MIcon name="fire" size={17} color={ON_CARD.warning} />
            <Text style={{ color: ON_CARD.warning, fontSize: 18, fontWeight: "900" }}>{formatNumber(streak)}</Text>
          </View>
          <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 10.5, fontWeight: "600" }}>Day Streak</Text>
        </View>
        <Pressable
          onPress={onLeaderboard}
          accessibilityRole="button"
          accessibilityLabel="Leaderboard"
          style={({ pressed }) => ({ flex: 1.15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "stretch", minHeight: 44, borderRadius: 12, backgroundColor: ON_CARD.primary, opacity: pressed ? 0.85 : 1 })}
        >
          <MIcon name="trophy" size={15} color="#ffffff" />
          <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>
            Leaderboard
          </Text>
        </Pressable>
      </View>

      {/* Progress to next tier (absent on the last tier) */}
      {next ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", columnGap: 8 }}>
            <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 11 }}>
              Progress to {next.emoji ?? ""} {next.label}
            </Text>
            <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 11 }}>
              {progressPct}% • {formatNumber((next.minGems ?? 0) - totalGems)} gems to go
            </Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progressPct }} style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <LinearGradient colors={[tierGradient[0], tierGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${progressPct}%`, height: "100%", borderRadius: 4 }} />
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => setEarnOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, paddingHorizontal: 8, borderRadius: 12, backgroundColor: ON_CARD.primary, opacity: pressed ? 0.85 : 1 })}>
          <MIcon name="star-four-points" size={14} color="#ffffff" />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 12, fontWeight: "800", flexShrink: 1 }}>
            How you earn gem
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setUseOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, paddingHorizontal: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", opacity: pressed ? 0.85 : 1 })}
        >
          <MIcon name="fire" size={15} color={ON_CARD.warning} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 12, fontWeight: "800", flexShrink: 1 }}>
            How you use gems
          </Text>
        </Pressable>
      </View>

      {/* Quick rules */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {QUICK_RULES.map((rule) => (
          <View key={rule.label} style={{ width: "47%", flexGrow: 1, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <Text style={{ color: rule.gain ? ON_CARD.successText : ON_CARD.dangerText, fontSize: 14, fontWeight: "900" }}>{rule.gems} 💎</Text>
            <Text style={{ color: ON_CARD.onDarkMuted, fontSize: 10.5, marginTop: 2 }}>{rule.label}</Text>
          </View>
        ))}
      </View>

      <Sheet visible={earnOpen} onClose={() => setEarnOpen(false)} title="How You Earn Gems" footer={<Button title="Got it!" block onPress={() => setEarnOpen(false)} />}>
        <NumberedList items={HOW_TO_EARN} tone="primary" />
      </Sheet>

      <Sheet visible={useOpen} onClose={() => setUseOpen(false)} title="How You Use Gems" footer={<Button title="Got it!" block onPress={() => setUseOpen(false)} />}>
        <NumberedList items={HOW_TO_USE} tone="warning" />
      </Sheet>
    </GradientCard>
  );
}
