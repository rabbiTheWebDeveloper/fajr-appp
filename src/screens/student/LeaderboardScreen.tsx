import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tapFeedback } from "@/lib/device";
import { Podium, RankRow } from "@/screens/student/leaderboard/parts";
import { SORT_COLUMNS, sortValue, type SortColumn } from "@/screens/student/leaderboard/shared";
import { useLeaderboard } from "@/screens/student/leaderboard/useLeaderboard";
import { useTheme } from "@/theme/ThemeContext";
import { toneColors, type Tone } from "@/theme/palette";
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Row, Screen, SearchBar, SectionHeader, SkeletonList, SkeletonTiles, StatTile, T, TileGrid } from "@/ui";

const SCORE_RULES: { title: string; text: string; tone: Tone }[] = [
  { title: "60% — Attendance Rate", text: "Based on present / total attendance records from your classes.", tone: "primary" },
  { title: "40% — Session Presence", text: "Session attendance marked when ending each class session.", tone: "violet" },
  { title: "Bonus Points", text: "+5 active status · +5 for ≥90% attendance · +2 for ≥80%", tone: "success" },
];

/** Student Leaderboard: students ranked by attendance rate, session presence and performance score */
export default function StudentLeaderboardScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { leaderboard, totalStudents, loading, refreshing, error, refresh, retry } = useLeaderboard();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortColumn>("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    // "desc" puts the highest first; equal values keep the server's ranking order
    const dir = sortDir === "desc" ? 1 : -1;
    return leaderboard
      .filter((e) => (e.fullName || "").toLowerCase().includes(term) || (e.studentId || "").toLowerCase().includes(term) || (e.course || "").toLowerCase().includes(term))
      .sort((a, b) => (sortValue(b, sortBy) - sortValue(a, sortBy)) * dir);
  }, [leaderboard, search, sortBy, sortDir]);

  const toggleSort = (col: SortColumn) => {
    tapFeedback();
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  if (loading) {
    return (
      <Screen>
        <SkeletonTiles count={4} />
        <SkeletonList count={5} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen onRefresh={retry}>
        <ErrorState message={error} onRetry={retry} />
      </Screen>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const avgScore = leaderboard.length > 0 ? Math.round(leaderboard.reduce((s, e) => s + e.score, 0) / leaderboard.length) : 0;
  const avgAtt = leaderboard.length > 0 ? Math.round(leaderboard.reduce((s, e) => s + e.attendanceRate, 0) / leaderboard.length) : 0;
  const topScore = leaderboard[0]?.score || 0;
  const hasStudents = leaderboard.length > 0;

  const header = (
    <View style={{ gap: 16 }}>
      <Row gap={12} align="flex-start">
        <View style={{ flex: 1 }}>
          <T variant="h2">Student Leaderboard</T>
          <T variant="small" color="muted">
            Ranked by attendance rate, session presence & performance score
          </T>
        </View>
        <Button title="Refresh" icon="refresh-cw" size="sm" variant="secondary" onPress={refresh} loading={refreshing} />
      </Row>

      <TileGrid>
        <StatTile label="Total Students" value={String(totalStudents)} icon="users" gradient="blue" />
        <StatTile label="Avg. Score" value={`${avgScore}/100`} icon="star" gradient="amber" />
        <StatTile label="Avg. Attendance" value={`${avgAtt}%`} icon="check-square" gradient="emerald" />
        <StatTile label="Top Score" value={String(topScore)} mIcon="trophy" gradient="rose" />
      </TileGrid>

      {hasStudents ? (
        <>
          <Podium top3={top3} />

          {/* Search + sort */}
          <Card padding={12}>
            <View style={{ gap: 12 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, student ID, or course..." style={{ backgroundColor: c.surfaceAlt }} />
              <Row gap={8} wrap>
                <T variant="smallStrong" color="muted">
                  Sort:
                </T>
                {SORT_COLUMNS.map((col) => (
                  <Chip key={col.key} label={col.label} selected={sortBy === col.key} icon={sortBy === col.key ? (sortDir === "desc" ? "chevron-down" : "chevron-up") : undefined} onPress={() => toggleSort(col.key)} style={{ height: 40 }} />
                ))}
              </Row>
            </View>
          </Card>

          <SectionHeader title="Full Rankings" icon="bar-chart-2" action={<Badge label={`${filtered.length} students`} tone="neutral" style={{ alignSelf: "center" }} />} />
        </>
      ) : (
        <Card>
          <EmptyState icon="users" tone="neutral" title="No students yet" message="Students will appear here once attendance is recorded." />
        </Card>
      )}
    </View>
  );

  const footer = hasStudents ? (
    <Card style={{ marginTop: 4 }}>
      <View style={{ gap: 12 }}>
        <SectionHeader title="How Scores Are Calculated" icon="zap" />
        {SCORE_RULES.map((rule) => {
          const tone = toneColors(c, rule.tone);
          return (
            <View key={rule.title} style={{ padding: 12, borderRadius: 12, backgroundColor: tone.bg, gap: 3 }}>
              <T variant="smallStrong" color={tone.fg}>
                {rule.title}
              </T>
              <T variant="small" color="muted">
                {rule.text}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  ) : undefined;

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={hasStudents ? filtered : []}
        keyExtractor={(entry) => entry._id}
        extraData={expandedId}
        renderItem={({ item }) => <RankRow entry={item} expanded={expandedId === item._id} onToggle={() => setExpandedId((id) => (id === item._id ? null : item._id))} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          hasStudents ? (
            <Card>
              <EmptyState icon="search" tone="neutral" compact title="No students match your search." />
            </Card>
          ) : undefined
        }
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
      />
    </Screen>
  );
}
