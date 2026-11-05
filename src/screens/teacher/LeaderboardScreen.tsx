import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useFetch } from "@/lib/hooks";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Badge, Card, Chip, EmptyState, ErrorState, Icon, LoadingView, MIcon, Row, Screen, SearchBar, SkeletonCard, SkeletonList, SkeletonTiles, StatTile, T, TileGrid } from "@/ui";
import { BanglaGuide, ScoreLegend } from "@/screens/teacher/leaderboard/GuideCards";
import { MyRankBanner, Podium, RankRow, TimeframeTabs } from "@/screens/teacher/leaderboard/parts";
import { TIMEFRAME_COPY, type LeaderboardReply, type TeacherEntry, type Timeframe } from "@/screens/teacher/leaderboard/types";

type SortBy = "score" | "sessions";

/** Teacher › Leaderboard: the top ten teachers of today, the last 7 days or the previous month */
export default function TeacherLeaderboardScreen() {
  const { c } = useTheme();
  const { profile } = useTeacher();

  const [timeframe, setTimeframe] = useState<Timeframe>("today");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { data, loading, refreshing, error, refresh, retry } = useFetch<LeaderboardReply>("/api/teacher-portal/teacher-leaderboard", { timeframe });

  // While another period is loading the previous period's reply is still in hand: never show it under the new tab
  const board = data && data.success && data.timeframe === timeframe ? data : null;
  const copy = TIMEFRAME_COPY[timeframe];

  const entries = useMemo(() => board?.teacherLeaderboard ?? [], [board]);
  const totalTeachers = board?.totalTeachers ?? 0;
  const periodLabel = board?.periodLabel ?? "";
  const myEntry = board?.myEntry ?? null;
  const myRank = board?.myRank ?? myEntry?.rank ?? null;

  // The server flags the signed-in teacher; the profile id is a second check
  const myTeacherId = profile?._id ? String(profile._id) : "";
  const isMe = (entry: TeacherEntry) => entry.isMe === true || (!!myTeacherId && entry._id === myTeacherId);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const dir = sortDir === "desc" ? 1 : -1;
    return entries
      .filter((e) => (e.fullName || "").toLowerCase().includes(q) || (e.teacherId || "").toLowerCase().includes(q) || (e.designation || "").toLowerCase().includes(q))
      .sort((a, b) => (sortBy === "score" ? b.score - a.score : b.completionRate - a.completionRate) * dir);
  }, [entries, search, sortBy, sortDir]);

  const averageScore = entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length) : 0;

  const selectTimeframe = (next: Timeframe) => {
    if (next === timeframe) return;
    setTimeframe(next);
    setSearch("");
  };

  // Tapping the active sort flips its direction; tapping the other one starts it at highest first
  const toggleSort = (column: SortBy) => {
    if (sortBy === column) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row gap={12}>
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.warningSoft }}>
          <MIcon name="trophy" size={22} color={c.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2">Teacher Leaderboard</T>
          <T variant="small" color="muted">
            {copy.subtitle}
          </T>
        </View>
      </Row>

      <TimeframeTabs value={timeframe} onChange={selectTimeframe} />

      {periodLabel ? (
        <Row gap={8} style={{ alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
          <T variant="smallStrong" color="muted">
            {periodLabel}
          </T>
        </Row>
      ) : null}

      <BanglaGuide timeframe={timeframe} />

      {!board ? (
        !loading && error ? (
          <Card padding={0}>
            <ErrorState message={error} onRetry={retry} />
          </Card>
        ) : data === null ? (
          <>
            <SkeletonCard lines={3} />
            <SkeletonTiles count={3} />
            <SkeletonList count={4} />
          </>
        ) : (
          <Card>
            <LoadingView label={`Updating ${timeframe} leaderboard rankings...`} />
          </Card>
        )
      ) : (
        <>
          {myEntry && myRank ? <MyRankBanner entry={myEntry} rank={myRank} totalTeachers={totalTeachers} timeframe={timeframe} periodLabel={periodLabel} /> : null}

          <TileGrid columns={3} gap={8}>
            <StatTile label="Total Teachers" value={String(totalTeachers)} gradient="violet" />
            <StatTile label={copy.rankLabel} value={myRank ? `#${myRank}` : "—"} gradient="amber" />
            <StatTile label="Top 10 Avg. Score" value={`${averageScore}/100`} gradient="emerald" />
          </TileGrid>

          {entries.length >= 1 ? <Podium top3={entries.slice(0, 3)} timeframe={timeframe} periodLabel={periodLabel} isMe={isMe} /> : null}

          <Card style={{ gap: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search teacher by name, ID or designation..." />
            <Row gap={8} wrap>
              <T variant="smallStrong" color="muted">
                Sort:
              </T>
              <Chip label="Score" selected={sortBy === "score"} icon={sortBy === "score" ? (sortDir === "desc" ? "chevron-down" : "chevron-up") : undefined} onPress={() => toggleSort("score")} />
              <Chip label="Classes" selected={sortBy === "sessions"} icon={sortBy === "sessions" ? (sortDir === "desc" ? "chevron-down" : "chevron-up") : undefined} onPress={() => toggleSort("sessions")} />
            </Row>
          </Card>

          <Card padding={0} style={{ overflow: "hidden" }}>
            <View style={{ padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Row gap={8} align="flex-start">
                <Icon name="bar-chart-2" size={18} color={c.primary} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <T variant="title">{copy.tableTitle}</T>
                  {board.periodSubtitle ? (
                    <T variant="small" color="faint">
                      {board.periodSubtitle}
                    </T>
                  ) : null}
                </View>
              </Row>
              <Badge label="Top 10 Rankings" tone="primary" />
            </View>

            {visible.length === 0 ? (
              <EmptyState icon="search" title={`No teachers found in ${timeframe} rankings.`} compact />
            ) : (
              visible.map((entry, index) => (
                <View key={entry._id} style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.border } : null}>
                  <RankRow entry={entry} isMe={isMe(entry)} timeframe={timeframe} striped={index % 2 === 1} />
                </View>
              ))
            )}
          </Card>

          <ScoreLegend timeframe={timeframe} />
        </>
      )}
    </Screen>
  );
}
