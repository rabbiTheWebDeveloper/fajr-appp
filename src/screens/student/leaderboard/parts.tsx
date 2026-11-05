import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { absoluteUrl } from "@/api/client";
import { MEDAL_EMOJI, attendanceColor, medalColor, scoreColor, statusTone, type LeaderboardEntry } from "@/screens/student/leaderboard/shared";
import { useTheme } from "@/theme/ThemeContext";
import { gradients } from "@/theme/palette";
import { Avatar, Badge, Card, GradientCard, Icon, MIcon, ProgressBar, ProgressRing, Row, T } from "@/ui";

function avatarUri(entry: LeaderboardEntry): string | null {
  return entry.avatar ? absoluteUrl(entry.avatar) : null;
}

/** The performance score (0-100) inside a ring coloured by how good it is */
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const { c } = useTheme();
  const color = scoreColor(c, score);
  return (
    <ProgressRing percent={score} size={size} strokeWidth={5} color={color}>
      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>{score}</Text>
    </ProgressRing>
  );
}

/** Trophy for first place, medals for second and third, "#N" for everyone else */
export function TrophyBadge({ rank }: { rank: number }) {
  const { c } = useTheme();
  if (rank >= 1 && rank <= 3) {
    const color = medalColor(c, rank);
    return (
      <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
        <MIcon name={rank === 1 ? "trophy" : "medal"} size={rank === 1 ? 28 : 26} color={color} />
        <View style={{ position: "absolute", top: 0, right: 0, width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color, borderWidth: 1.5, borderColor: c.surface }}>
          <Text style={{ color: rank === 1 ? c.navy : "#ffffff", fontSize: 8, fontWeight: "900" }}>{rank}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceAlt, paddingHorizontal: 2 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.textMuted, fontSize: 12.5, fontWeight: "700" }}>
        #{rank}
      </Text>
    </View>
  );
}

const STAND_HEIGHT: Record<1 | 2 | 3, number> = { 1: 72, 2: 48, 3: 40 };
const STAND_GRADIENT: Record<1 | 2 | 3, readonly [string, string]> = { 1: gradients.gold, 2: gradients.slate, 3: gradients.amber };

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const { c } = useTheme();
  const color = medalColor(c, rank);
  const stand = STAND_GRADIENT[rank];
  return (
    <View style={{ flex: 1, maxWidth: 132, alignItems: "center", gap: 8 }}>
      <View style={{ alignSelf: "stretch", alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, borderColor: color, backgroundColor: c.surface }}>
        <Text style={{ fontSize: 22 }}>{MEDAL_EMOJI[rank]}</Text>
        <View style={{ padding: 2, borderRadius: 999, borderWidth: 3, borderColor: color }}>
          <Avatar uri={avatarUri(entry)} name={entry.fullName} size={rank === 1 ? 56 : 44} />
        </View>
        <T variant="smallStrong" center numberOfLines={2} weight="800">
          {entry.fullName}
        </T>
        <T variant="caption" color="muted" center numberOfLines={1}>
          {entry.studentId || entry.studentNumber || ""}
        </T>
        <ScoreRing score={entry.score} size={44} />
        <View style={{ position: "absolute", top: -9, right: -6, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: color, borderWidth: 2, borderColor: c.surface }}>
          <Text style={{ color: rank === 1 ? c.navy : "#ffffff", fontSize: 12, fontWeight: "900" }}>{rank}</Text>
        </View>
      </View>

      {/* Podium stand */}
      <LinearGradient colors={[stand[0], stand[1]]} style={{ width: "82%", height: STAND_HEIGHT[rank], borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 22, fontWeight: "900" }}>{rank}</Text>
      </LinearGradient>
    </View>
  );
}

/** The three best students by performance score: second, first, third, as on a winners' podium */
export function Podium({ top3 }: { top3: LeaderboardEntry[] }) {
  return (
    <GradientCard gradient="navy" padding={14} style={{ paddingBottom: 0 }}>
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <T color="gold" weight="900" style={{ fontSize: 17, letterSpacing: 0.6 }}>
          🏆 TOP PERFORMERS 🏆
        </T>
        <T variant="small" color="onDarkMuted">
          Best students by performance score
        </T>
      </View>
      <Row gap={8} align="flex-end" justify="center">
        {top3[1] ? <PodiumCard entry={top3[1]} rank={2} /> : null}
        {top3[0] ? <PodiumCard entry={top3[0]} rank={1} /> : null}
        {top3[2] ? <PodiumCard entry={top3[2]} rank={3} /> : null}
      </Row>
    </GradientCard>
  );
}

function Metric({ label, rate, color, detail }: { label: string; rate: number; color: string; detail: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <T variant="label" color="muted">
        {label}
      </T>
      <T variant="h2">{rate}%</T>
      <ProgressBar value={rate} color={color} height={6} />
      <T variant="caption" color="muted">
        {detail}
      </T>
    </View>
  );
}

/** One student in the rankings. Tap to open the attendance, session and status figures the website shows in its wide table. */
export function RankRow({ entry, expanded, onToggle }: { entry: LeaderboardEntry; expanded: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const tint = entry.rank === 1 || entry.rank === 3 ? c.warningSoft : entry.rank === 2 ? c.surfaceAlt : undefined;
  const idLine = [entry.studentId || entry.studentNumber, entry.course].filter(Boolean).join(" · ");

  return (
    <Card padding={12} onPress={onToggle} style={tint ? { backgroundColor: tint } : undefined}>
      <Row gap={10}>
        <TrophyBadge rank={entry.rank} />
        <Avatar uri={avatarUri(entry)} name={entry.fullName} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={1}>
            {entry.fullName}
            {MEDAL_EMOJI[entry.rank] ? ` ${MEDAL_EMOJI[entry.rank]}` : ""}
          </T>
          {idLine ? (
            <T variant="caption" color="muted" numberOfLines={1}>
              {idLine}
            </T>
          ) : null}
        </View>
        <View style={{ alignItems: "center", gap: 2 }}>
          <ScoreRing score={entry.score} size={44} />
          <T variant="caption" color="muted">
            {entry.attendanceRate}% att
          </T>
        </View>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={c.textFaint} />
      </Row>

      {expanded ? (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 12 }}>
          <Row gap={16} align="flex-start">
            <Metric label="Attendance" rate={entry.attendanceRate} color={attendanceColor(c, entry.attendanceRate)} detail={`${entry.presentCount}/${entry.totalAttendance} present`} />
            <Metric label="Sessions" rate={entry.sessionRate} color={c.primary} detail={`${entry.sessionPresent}/${entry.totalSessions} sessions`} />
          </Row>
          <Row justify="space-between" gap={12}>
            <T variant="small" color="muted">
              Performance score: <T variant="smallStrong">{entry.score}</T>
            </T>
            {entry.status ? <Badge label={entry.status.toUpperCase()} tone={statusTone(entry.status)} style={{ alignSelf: "center" }} /> : null}
          </Row>
        </View>
      ) : null}
    </Card>
  );
}
