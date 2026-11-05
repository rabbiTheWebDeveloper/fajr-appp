import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme/ThemeContext";
import { darkPalette, radius, toneColors, type Tone } from "@/theme/palette";
import { Avatar, GradientCard, MIcon, ProgressBar, ProgressRing, Row, T, type MIconName } from "@/ui";
import { TIMEFRAME_COPY, gemsText, type TeacherEntry, type Timeframe } from "@/screens/teacher/leaderboard/types";

/** Gold, silver and bronze: the same on the light and the dark theme */
const MEDAL: Record<1 | 2 | 3, { color: string; badge: string; badgeText: string; stand: readonly [string, string]; emoji: string; standHeight: number }> = {
  1: { color: "#FFD700", badge: "#facc15", badgeText: "#713f12", stand: ["#facc15", "#f59e0b"], emoji: "🥇", standHeight: 64 },
  2: { color: "#C0C0C0", badge: "#94a3b8", badgeText: "#ffffff", stand: ["#94a3b8", "#64748b"], emoji: "🥈", standHeight: 44 },
  3: { color: "#CD7F32", badge: "#d97706", badgeText: "#ffffff", stand: ["#d97706", "#c2410c"], emoji: "🥉", standHeight: 30 },
};

/* ───────────────────────── Score ring ───────────────────────── */

/** The 0–100 performance score in a ring: green from 85, amber from 70, blue from 50, red below */
export function ScoreRing({ score, size = 48, onDark }: { score: number; size?: number; onDark?: boolean }) {
  const { c } = useTheme();
  // On the navy cards the brighter dark-theme tones stay readable in both themes
  const p = onDark ? darkPalette : c;
  const color = score >= 85 ? p.success : score >= 70 ? p.warning : score >= 50 ? p.primary : p.danger;
  return (
    <ProgressRing percent={score} size={size} strokeWidth={Math.max(4, Math.round(size * 0.11))} color={color} trackColor={onDark ? "rgba(255,255,255,0.14)" : undefined}>
      <Text style={{ color, fontSize: Math.round(size * 0.27), fontWeight: "800" }}>{score}</Text>
    </ProgressRing>
  );
}

/* ───────────────────────── Small pieces ───────────────────────── */

export function YouTag() {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: radius.pill, backgroundColor: c.primary }}>
      <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "900" }}>YOU</Text>
    </View>
  );
}

/** Trophy for first place, medals for second and third, "#N" for the rest */
export function TrophyBadge({ rank }: { rank: number }) {
  const { c } = useTheme();
  if (rank === 1 || rank === 2 || rank === 3) {
    const medal = MEDAL[rank];
    return (
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <MIcon name={rank === 1 ? "trophy" : "medal"} size={rank === 1 ? 30 : 28} color={medal.color} />
        <View style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: medal.badge, borderWidth: 1.5, borderColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: medal.badgeText, fontSize: 8.5, fontWeight: "900" }}>{rank}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "700" }}>#{rank}</Text>
    </View>
  );
}

/** Five stars filled to the rounded rating, with the exact figure underneath */
export function Stars({ rating }: { rating: number }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Row gap={1}>
        {[1, 2, 3, 4, 5].map((i) => (
          <MIcon key={i} name="star" size={11} color={i <= Math.round(rating) ? c.warning : c.borderStrong} />
        ))}
      </Row>
      <T variant="caption" color="muted">
        {rating > 0 ? rating.toFixed(1) : "—"}
      </T>
    </View>
  );
}

/* ───────────────────────── Timeframe tabs ───────────────────────── */

const TABS: { key: Timeframe; label: string; bangla: string; icon: MIconName; tone: Tone }[] = [
  { key: "today", label: "Today", bangla: "আজকের সেরা", icon: "clock-outline", tone: "success" },
  { key: "7days", label: "Last 7 Days", bangla: "গত ৭ দিন", icon: "fire", tone: "warning" },
  { key: "previousMonth", label: "Previous Month", bangla: "পূর্ববর্তী মাস", icon: "trophy", tone: "primary" },
];

export function TimeframeTabs({ value, onChange }: { value: Timeframe; onChange: (next: Timeframe) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, padding: 6, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        const tone = toneColors(c, tab.tone);
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: active ? tone.solid : "transparent" }}
          >
            <MIcon name={tab.icon} size={17} color={active ? "#ffffff" : tone.solid} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: active ? "#ffffff" : c.textMuted, fontSize: 12, fontWeight: "700" }}>
              {tab.label}
            </Text>
            <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: active ? "rgba(255,255,255,0.2)" : c.surfaceAlt }}>
              <Text numberOfLines={1} style={{ color: active ? "#ffffff" : c.textMuted, fontSize: 10, lineHeight: 15, fontWeight: "600" }}>
                {tab.bangla}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── My rank banner ───────────────────────── */

interface MyRankBannerProps {
  entry: TeacherEntry;
  rank: number;
  totalTeachers: number;
  timeframe: Timeframe;
  periodLabel?: string;
}

/** The signed-in teacher's own place in the period, shown even when they are outside the top ten */
export function MyRankBanner({ entry, rank, totalTeachers, timeframe, periodLabel }: MyRankBannerProps) {
  const { c } = useTheme();
  // 100 = first place, 0 = last place
  const pct = totalTeachers > 1 ? Math.round(((totalTeachers - rank) / (totalTeachers - 1)) * 100) : 100;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "📊";

  return (
    <GradientCard gradient="navy">
      <Row gap={10}>
        <View>
          <Avatar name={entry.fullName} size={46} style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.65)" }} />
          <Text style={{ position: "absolute", right: -6, bottom: -5, fontSize: 16 }}>{medal}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="label" color="onDarkMuted" style={{ letterSpacing: 0.4 }}>
            {TIMEFRAME_COPY[timeframe].rankTitle}
          </T>
          <T variant="title" color="onDark" numberOfLines={2}>
            {entry.fullName}
          </T>
          {entry.designation ? (
            <T variant="small" color="onDarkMuted" numberOfLines={1}>
              {entry.designation}
            </T>
          ) : null}
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: c.gold, fontSize: 28, fontWeight: "900" }}>#{rank}</Text>
          <T variant="caption" color="onDarkMuted">
            of {totalTeachers}
          </T>
        </View>
        <View style={{ alignItems: "center", gap: 2 }}>
          <ScoreRing score={entry.score} size={46} onDark />
          <T variant="caption" color="onDarkMuted">
            Score
          </T>
        </View>
      </Row>

      {periodLabel ? (
        <View style={{ alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.1)" }}>
          <T variant="caption" color="onDarkMuted">
            {periodLabel}
          </T>
        </View>
      ) : null}

      <View style={{ marginTop: 12, gap: 5 }}>
        <Row justify="space-between">
          <T variant="caption" color="onDarkMuted">
            Percentile position
          </T>
          <T variant="caption" color="onDarkMuted">
            Top {100 - pct}%
          </T>
        </Row>
        <ProgressBar value={pct} height={8} color={c.gold} style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        <Row justify="space-between" wrap gap={8}>
          <T variant="caption" color="onDarkMuted">
            Classes: {entry.completedSessions}/{entry.totalSessions} ({entry.completionRate}%)
          </T>
          <T variant="caption" color="onDarkMuted">
            Students: {entry.studentCount}
          </T>
          <T variant="caption" color="onDarkMuted">
            Gems: {gemsText(entry)} 💎
          </T>
        </Row>
      </View>
    </GradientCard>
  );
}

/* ───────────────────────── Podium ───────────────────────── */

function PodiumCard({ entry, rank, isMe }: { entry: TeacherEntry; rank: 1 | 2 | 3; isMe: boolean }) {
  const { c } = useTheme();
  const medal = MEDAL[rank];
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View style={{ alignSelf: "stretch", alignItems: "center", gap: 4, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 5, borderRadius: 14, borderWidth: isMe ? 2 : 1.5, borderColor: isMe ? c.primary : medal.color, backgroundColor: "rgba(255,255,255,0.08)" }}>
        {isMe ? (
          <View style={{ position: "absolute", top: 4, left: 4 }}>
            <YouTag />
          </View>
        ) : null}
        <View style={{ position: "absolute", top: -9, right: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: medal.badge, borderWidth: 2, borderColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: medal.badgeText, fontSize: 11, fontWeight: "900" }}>{rank}</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{medal.emoji}</Text>
        <Avatar name={entry.fullName} size={rank === 1 ? 52 : 42} style={{ borderWidth: 2, borderColor: medal.color }} />
        <T variant="caption" color="onDark" center numberOfLines={2} weight="800" style={{ minHeight: 30 }}>
          {entry.fullName}
        </T>
        <Text numberOfLines={1} style={{ color: darkPalette.textMuted, fontSize: 9, fontWeight: "500" }}>
          {entry.teacherId || " "}
        </Text>
        <ScoreRing score={entry.score} size={40} onDark />
      </View>
      <LinearGradient colors={[medal.stand[0], medal.stand[1]]} style={{ alignSelf: "stretch", height: medal.standHeight, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#ffffff", opacity: 0.35, fontSize: 20, fontWeight: "900" }}>{rank}</Text>
      </LinearGradient>
    </View>
  );
}

/** The top three of the period on a podium (first, second, third from the left, as on the website) */
export function Podium({ top3, timeframe, periodLabel, isMe }: { top3: TeacherEntry[]; timeframe: Timeframe; periodLabel?: string; isMe: (entry: TeacherEntry) => boolean }) {
  const { c } = useTheme();
  const subtitle =
    timeframe === "today" ? "Best performing teachers today" : timeframe === "7days" ? "Top performing teachers across the last 7 days" : `Top champions of ${periodLabel || "previous month"}`;
  return (
    <GradientCard gradient="navyDeep" padding={14} style={{ paddingBottom: 0 }}>
      <Text style={{ color: c.gold, fontSize: 14.5, fontWeight: "900", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 }}>🏆 {TIMEFRAME_COPY[timeframe].podiumTitle} 🏆</Text>
      <T variant="small" color="onDarkMuted" center style={{ marginTop: 3, marginBottom: 20 }}>
        {subtitle}
      </T>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8 }}>
        {top3.map((entry, index) => (
          <PodiumCard key={entry._id} entry={entry} rank={(index + 1) as 1 | 2 | 3} isMe={isMe(entry)} />
        ))}
        {/* Fewer than three teachers: keep the cards the same width */}
        {Array.from({ length: Math.max(0, 3 - top3.length) }, (_, i) => (
          <View key={`gap-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
    </GradientCard>
  );
}

/* ───────────────────────── Ranking row ───────────────────────── */

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
      <T variant="caption" color="faint" numberOfLines={1}>
        {label}
      </T>
      {children}
    </View>
  );
}

/** One teacher of the top ten with every column of the website's table */
export function RankRow({ entry, isMe, timeframe, striped }: { entry: TeacherEntry; isMe: boolean; timeframe: Timeframe; striped: boolean }) {
  const { c } = useTheme();
  const background = isMe ? c.primarySoft : entry.rank === 1 || entry.rank === 3 ? c.warningSoft : entry.rank === 2 ? c.neutralSoft : striped ? c.surfaceAlt : "transparent";
  const idLine = [entry.teacherId, entry.designation].filter(Boolean).join(" · ");
  return (
    <View style={{ backgroundColor: background, borderLeftWidth: 3, borderLeftColor: isMe ? c.primary : "transparent", paddingLeft: 11, paddingRight: 14, paddingVertical: 12, gap: 10 }}>
      <Row gap={10}>
        <TrophyBadge rank={entry.rank} />
        <Avatar name={entry.fullName} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Row gap={6}>
            <T variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {entry.fullName}
            </T>
            {isMe ? <YouTag /> : null}
          </Row>
          {idLine ? (
            <T variant="caption" color="muted" numberOfLines={1}>
              {idLine}
            </T>
          ) : null}
          {entry.tierEmoji || entry.tierLabel ? (
            <T variant="caption" color="muted" numberOfLines={1}>
              {[entry.tierEmoji, entry.tierLabel].filter(Boolean).join(" ")}
            </T>
          ) : null}
        </View>
        <View style={{ alignItems: "center", gap: 1 }}>
          <ScoreRing score={entry.score} size={46} />
          <T variant="caption" color="faint">
            performance
          </T>
        </View>
      </Row>

      <Row gap={6} align="flex-start">
        <Metric label="Classes">
          <T variant="bodyStrong">{entry.completionRate}%</T>
          <ProgressBar value={entry.completionRate} height={5} style={{ alignSelf: "stretch", marginHorizontal: 6 }} />
          <T variant="caption" color="faint">
            {entry.completedSessions}/{entry.totalSessions}
          </T>
        </Metric>
        <Metric label="💎 Gems">
          <T variant="bodyStrong" color="warning" numberOfLines={1}>
            {gemsText(entry)} 💎
          </T>
          <T variant="caption" color="faint">
            {TIMEFRAME_COPY[timeframe].gemsPeriod}
          </T>
        </Metric>
        <Metric label="Students">
          <T variant="bodyStrong">{entry.studentCount}</T>
          <T variant="caption" color="faint">
            students
          </T>
        </Metric>
        <Metric label="Rating">
          <Stars rating={entry.rating} />
        </Metric>
      </Row>
    </View>
  );
}
