import React from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { humanizeMins, type DashboardStats } from "@/lib/student-dashboard-shared";
import { useNav } from "@/navigation/nav";
import { onGradient } from "@/screens/student/dashboard/parts";
import { classWord } from "@/screens/student/dashboard/utils";
import { gradients, radius, type GradientName } from "@/theme/palette";
import { Icon, MIcon, T, type IconName, type MIconName } from "@/ui";

interface Tile {
  key: string;
  label: string;
  value: string;
  sub: string;
  icon?: IconName;
  mIcon?: MIconName;
  gradient: GradientName;
  /** 0-100: draws a thin progress bar under the numbers */
  progress?: number | null;
  /** Names the bar (and shows its percentage) when it is not simply the big number again */
  progressLabel?: string;
}

function tilesFor(stats: DashboardStats): Tile[] {
  const att = stats.monthlyAttendance;
  const marked = att.present + att.absent;
  return [
    {
      key: "courses",
      label: "Courses",
      value: String(stats.enrolledCourses),
      sub: stats.weeklyClasses > 0 ? `${stats.weeklyClasses} ${classWord(stats.weeklyClasses)} every week` : "No weekly routine yet",
      icon: "book-open",
      gradient: "blue",
      progress: stats.avgProgress && stats.avgProgress > 0 ? stats.avgProgress : null,
      progressLabel: "Average progress",
    },
    {
      key: "attendance",
      label: `${att.monthLabel} attendance`,
      value: att.percentage === null ? "—" : `${att.percentage}%`,
      sub: att.percentage !== null ? `${att.present} of ${marked} ${classWord(marked)} present` : att.held > 0 ? `${att.held} ${classWord(att.held)} not marked yet` : "No classes held yet this month",
      icon: "user-check",
      gradient: "emerald",
      progress: att.percentage,
    },
    {
      key: "streak",
      label: "Class streak",
      value: String(stats.streakCount),
      sub: stats.streakCount > 0 ? `${classWord(stats.streakCount)} in a row` : "Attend a class to start one",
      mIcon: "fire",
      gradient: "amber",
    },
    {
      key: "learning",
      label: "Classes completed",
      value: String(stats.completedClasses),
      sub: stats.completedClasses > 0 ? `${humanizeMins(stats.learningMinutes)} of learning` : "Your first class is coming",
      icon: "clock",
      gradient: "violet",
    },
  ];
}

function KpiTile({ tile, onPress }: { tile: Tile; onPress: () => void }) {
  const colors = gradients[tile.gradient];
  const hasBar = typeof tile.progress === "number";
  const percent = hasBar ? Math.min(100, Math.max(0, tile.progress as number)) : 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tile.label}: ${tile.value}. ${tile.sub}`} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.9 : 1 })}>
      <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, minHeight: 132, borderRadius: radius.lg, padding: 14, justifyContent: "space-between", overflow: "hidden" }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.chip }}>
          {tile.mIcon ? <MIcon name={tile.mIcon} size={19} color={onGradient.text} /> : <Icon name={tile.icon ?? "circle"} size={17} color={onGradient.text} />}
        </View>

        <View style={{ marginTop: 12 }}>
          <T color={onGradient.text} weight="900" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.5 }}>
            {tile.value}
          </T>
          <T variant="smallStrong" color={onGradient.text} weight="700" numberOfLines={1} style={{ marginTop: 3 }}>
            {tile.label}
          </T>
          <T variant="caption" color={onGradient.soft} numberOfLines={2}>
            {tile.sub}
          </T>

          {hasBar ? (
            <View style={{ marginTop: 8 }}>
              {tile.progressLabel ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                  <T variant="caption" color={onGradient.soft} weight="600" numberOfLines={1} style={{ flexShrink: 1, fontSize: 10 }}>
                    {tile.progressLabel}
                  </T>
                  <T variant="caption" color={onGradient.soft} weight="600" style={{ fontSize: 10 }}>
                    {tile.progress}%
                  </T>
                </View>
              ) : null}
              <View accessibilityRole="progressbar" accessibilityLabel={tile.progressLabel ?? `${tile.label} percentage`} accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }} style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.25)", overflow: "hidden" }}>
                <View style={{ width: `${percent}%`, height: "100%", borderRadius: 3, backgroundColor: onGradient.soft }} />
              </View>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Four colourful numbers: courses, this month's attendance, the streak and the classes completed. All of them are real. Each opens My Classes. */
export default function KpiTiles({ stats }: { stats: DashboardStats }) {
  const nav = useNav();
  const tiles = tilesFor(stats);
  return (
    <View accessibilityLabel="Your learning overview" style={{ gap: 12 }}>
      {[tiles.slice(0, 2), tiles.slice(2, 4)].map((row, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 12 }}>
          {row.map((tile) => (
            <KpiTile key={tile.key} tile={tile} onPress={() => nav.go("StudentClasses")} />
          ))}
        </View>
      ))}
    </View>
  );
}
