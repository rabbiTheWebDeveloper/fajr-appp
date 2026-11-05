import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFetch } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { Avatar, Badge, Card, EmptyState, ErrorState, Row, SearchBar, SkeletonList, T } from "@/ui";

import { formatHistoryDate, photoUrl, type HistoryEvent, type HistoryReply } from "@/screens/teacher/students/shared";

function HistoryCard({ event }: { event: HistoryEvent }) {
  const { c } = useTheme();
  const active = !!event.isActive;
  return (
    <Card padding={0} style={{ flexDirection: "row", overflow: "hidden", borderColor: active ? `${c.primary}66` : c.border }}>
      <View style={{ width: 5, backgroundColor: active ? c.primary : c.warning }} />
      <View style={{ flex: 1, padding: 14, gap: 10 }}>
        <Row gap={12} align="flex-start">
          <Avatar uri={photoUrl(event.student.avatar)} name={event.student.fullName || "S"} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T variant="bodyStrong" numberOfLines={1}>
              {event.student.fullName}
            </T>
            <Row wrap gap={8}>
              <T variant="mono" color="muted" style={{ fontSize: 11.5 }} selectable>
                {event.student.studentId}
              </T>
              {event.student.course?.title ? (
                <T variant="small" color="primary" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {event.student.course.title}
                </T>
              ) : null}
            </Row>
            <Badge tone={active ? "primary" : "warning"} label={active ? "STILL ASSIGNED" : "UNASSIGNED"} />
          </View>
        </Row>

        <View style={{ gap: 4 }}>
          <Row gap={8}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
            <T variant="small" color="muted" style={{ flex: 1 }}>
              <T variant="smallStrong" color="muted">
                Assigned:
              </T>{" "}
              {formatHistoryDate(event.assignedAt)}
            </T>
          </Row>
          {event.unassignedAt ? (
            <Row gap={8}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.warning }} />
              <T variant="small" color="muted" style={{ flex: 1 }}>
                <T variant="smallStrong" color="muted">
                  Unassigned:
                </T>{" "}
                {formatHistoryDate(event.unassignedAt)}
              </T>
            </Row>
          ) : null}
          {event.note ? (
            <T variant="caption" color="faint" style={{ fontStyle: "italic", marginTop: 2 }}>
              “{event.note}”
            </T>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** "Unassign History": every period a student was assigned to this teacher, newest change first */
export function HistoryTab() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh, retry } = useFetch<HistoryReply>("/api/teacher-portal/student-history");
  const [search, setSearch] = useState("");

  const failed = !loading && (!!error || data?.success === false);
  const filtered = useMemo(() => {
    const history = data?.success ? (data.history ?? []) : [];
    const query = search.toLowerCase();
    return history.filter(
      (ev) => ev.student?.fullName?.toLowerCase().includes(query) || ev.student?.studentId?.toLowerCase().includes(query) || ev.student?.phone?.includes(search)
    );
  }, [data, search]);

  return (
    <FlatList
      data={loading || failed ? [] : filtered}
      keyExtractor={(item, index) => `${item.student?._id ?? "s"}-${item.assignedAt ?? ""}-${index}`}
      renderItem={({ item }) => <HistoryCard event={item} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12, paddingBottom: 24 + insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, ID, or phone..." />
          {!loading && !failed ? (
            <T variant="small" color="muted" weight="500">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </T>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <SkeletonList count={4} lines={3} />
        ) : failed ? (
          <ErrorState message={error || data?.message || "Failed to load history."} onRetry={retry} />
        ) : (
          <Card>
            <EmptyState icon="clipboard" title="No history yet" message="When you unassign students, they will appear here with timestamps." />
          </Card>
        )
      }
    />
  );
}
