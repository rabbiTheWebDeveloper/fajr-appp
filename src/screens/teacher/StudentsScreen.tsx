import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { successFeedback } from "@/lib/device";
import { useDebounced, useFetch } from "@/lib/hooks";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { AssignStudentSheet } from "@/screens/teacher/students/AssignStudentSheet";
import { EditScheduleSheet } from "@/screens/teacher/students/EditScheduleSheet";
import { HistoryTab } from "@/screens/teacher/students/HistoryTab";
import { PaginationBar } from "@/screens/teacher/students/PaginationBar";
import { StudentCard } from "@/screens/teacher/students/StudentCard";
import { ConfirmUnassignSheet, UnassignStatementSheet } from "@/screens/teacher/students/UnassignSheets";
import { courseTitle, sendJson, todayLongDate, type StudentsReply, type TeacherStudent, type UnassignStatement, type UnassignTarget } from "@/screens/teacher/students/shared";
import { useTheme } from "@/theme/ThemeContext";
import { Banner, Button, Card, EmptyState, ErrorState, Icon, IconButton, Row, Screen, SearchBar, Segmented, SkeletonList, T, toast } from "@/ui";

type Tab = "students" | "history";

/** Teacher "My Students": the assigned students with their schedules, assigning by Student ID, unassigning, and the unassign history */
export default function TeacherStudentsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useTeacher();
  const listRef = useRef<FlatList<TeacherStudent>>(null);

  const [tab, setTab] = useState<Tab>("students");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState<TeacherStudent | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<UnassignTarget | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [statement, setStatement] = useState<UnassignStatement | null>(null);
  const [actionError, setActionError] = useState("");

  // Search, page and page size reach the server together, 300 ms after the last change
  const query = useDebounced(
    useMemo(() => ({ page, limit, search }), [page, limit, search]),
    300
  );
  const { data, loading, refreshing, error, refresh, reload, retry } = useFetch<StudentsReply>("/api/teacher-portal/students", query);

  const failed = !loading && (!!error || data?.success === false);
  const firstLoad = loading && (!data || !!error);
  const students = firstLoad || failed ? [] : (data?.students ?? []);
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const plural = total !== 1 ? "s" : "";

  // Unassigning the last student of the last page would leave an empty page behind
  useEffect(() => {
    if (!loading && data?.success && (data.students?.length ?? 0) === 0 && total > 0 && page > totalPages) setPage(totalPages);
  }, [loading, data, total, totalPages, page]);

  const goToPage = (next: number) => {
    setPage(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleUnassign = async (note: string) => {
    const target = confirmUnassign;
    if (!target) return;
    setUnassigning(true);
    setActionError("");
    const result = await sendJson("PATCH", `/api/teacher-portal/students/${target._id}/unassign`, { note }, "Failed to unassign student.", "Network error while unassigning.");
    setUnassigning(false);
    setConfirmUnassign(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    successFeedback();
    void reload();
    // Offer the official statement to send to the student on WhatsApp
    setStatement({
      student: { fullName: target.fullName, studentId: target.studentId, phone: target.phone, course: target.course },
      note,
      teacherName: profile?.fullName || "Your Teacher",
      date: todayLongDate(),
    });
  };

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 12 }}>
      <Row justify="space-between" gap={12}>
        <Row gap={8} style={{ flex: 1 }}>
          <Icon name="users" size={18} color={c.primary} />
          <T variant="smallStrong" color="muted" style={{ flex: 1 }}>
            {loading && !data ? "Loading..." : `${total} student${plural} assigned to you`}
          </T>
        </Row>
        <Button title="Add Student" icon="plus" onPress={() => setShowAssign(true)} />
      </Row>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "students", label: "My Students", icon: "users" },
          { value: "history", label: "Unassign History", icon: "rotate-ccw" },
        ]}
      />
    </View>
  );

  return (
    <Screen scroll={false} padded={false} header={header}>
      {tab === "students" ? (
        <FlatList
          ref={listRef}
          data={students}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              onEdit={() => setEditing(item)}
              onUnassign={() =>
                setConfirmUnassign({ _id: item._id, fullName: item.fullName ?? "", studentId: item.studentId ?? "", phone: item.phone, course: courseTitle(item.course) || undefined })
              }
            />
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ opacity: loading && !firstLoad ? 0.55 : 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12, paddingBottom: 24 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
          ListHeaderComponent={
            <View style={{ gap: 8 }}>
              <SearchBar
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setPage(1);
                }}
                placeholder="Search by name, ID, email, or phone..."
              />
              {!firstLoad && !failed ? (
                <Row justify="space-between">
                  <T variant="small" color="muted" weight="500" style={{ flex: 1 }}>
                    {search ? `${total} result${plural} found` : `Showing ${students.length} of ${total} student${plural}`}
                  </T>
                  <IconButton icon="refresh-cw" size={40} accessibilityLabel="Refresh" disabled={loading || refreshing} onPress={() => void refresh()} />
                </Row>
              ) : null}
              {actionError ? <Banner tone="danger" message={actionError} onClose={() => setActionError("")} /> : null}
            </View>
          }
          ListEmptyComponent={
            firstLoad ? (
              <SkeletonList count={4} lines={4} />
            ) : failed ? (
              <ErrorState message={error || data?.message || "Failed to load students."} onRetry={retry} />
            ) : (
              <Card>
                <EmptyState
                  icon="users"
                  title={search ? "No students match your search" : "No students yet"}
                  message={search ? "Try a different keyword." : "Tap 'Add Student' to register your first student."}
                  actionLabel={search ? undefined : "Add First Student"}
                  onAction={search ? undefined : () => setShowAssign(true)}
                />
              </Card>
            )
          }
          ListFooterComponent={
            students.length > 0 ? (
              <PaginationBar
                page={data?.pagination?.page ?? page}
                totalPages={totalPages}
                total={total}
                limit={data?.pagination?.limit ?? limit}
                loading={loading}
                onPageChange={goToPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  goToPage(1);
                }}
              />
            ) : undefined
          }
        />
      ) : (
        <HistoryTab />
      )}

      <AssignStudentSheet visible={showAssign} onClose={() => setShowAssign(false)} onAssigned={() => void reload()} />

      <EditScheduleSheet
        student={editing}
        teacherId={profile?.teacherId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast.success("Changes saved");
          void reload();
        }}
      />

      <ConfirmUnassignSheet student={confirmUnassign} loading={unassigning} onCancel={() => setConfirmUnassign(null)} onConfirm={(note) => void handleUnassign(note)} />

      <UnassignStatementSheet data={statement} onClose={() => setStatement(null)} />
    </Screen>
  );
}
