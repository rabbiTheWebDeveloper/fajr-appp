import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { api, errorMessage } from "@/api/client";
import { shareHtmlAsPdf } from "@/lib/files";
import { academyMonthKey, formatDateTime, formatMonthKey } from "@/lib/format";
import { useDebounced, useFetch } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import {
  Banner,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  Icon,
  IconChip,
  MonthPicker,
  Pagination,
  Row,
  Screen,
  SearchBar,
  Segmented,
  Select,
  Sheet,
  SkeletonList,
  SkeletonTiles,
  StatTile,
  T,
  TileGrid,
  toast,
  type ScrollViewRef,
} from "@/ui";
import { MonthCalendar } from "@/screens/teacher/monthly/MonthCalendar";
import { SessionDetails } from "@/screens/teacher/monthly/parts";
import { buildReportHtml } from "@/screens/teacher/monthly/pdf";
import {
  CLASS_MONTHLY_PATH,
  EMPTY_SUMMARY,
  FULL_MONTH_LIMIT,
  PAGE_SIZE,
  hoursAndMinutes,
  longDateLabel,
  monthDayLabel,
  type Attendance,
  type MonthlyReply,
  type PageInfo,
  type Session,
} from "@/screens/teacher/monthly/utils";

type ViewMode = "calendar" | "list";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ATTENDANCE_OPTIONS = [
  { value: "", label: "All Attendance" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "not-marked", label: "Not Marked" },
];

const FIRST_PAGE: PageInfo = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

/** Teacher › Classes › Monthly Class & Date-wise Report */
export default function TeacherMonthlyReportScreen() {
  const { c } = useTheme();

  const [month, setMonth] = useState(() => academyMonthKey());
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [attFilter, setAttFilter] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollViewRef>(null);
  const listY = useRef(0);
  const debouncedSearch = useDebounced(search.trim(), 300);

  // The filtered, paged list; its summary and date-wise numbers follow the same filters
  const list = useFetch<MonthlyReply>(CLASS_MONTHLY_PATH, { month, page, limit: PAGE_SIZE, date: selectedDate, status, attendance: attFilter, search: debouncedSearch });
  // The whole month for the calendar, whatever the filters say
  const calendar = useFetch<MonthlyReply>(CLASS_MONTHLY_PATH, { month, page: 1, limit: FULL_MONTH_LIMIT });

  const sessions = useMemo(() => list.data?.sessions ?? [], [list.data]);
  const allSessions = useMemo(() => calendar.data?.sessions ?? [], [calendar.data]);
  const summary = { ...EMPTY_SUMMARY, ...(list.data?.summary ?? {}) };
  const dailyStats = list.data?.dailyStats ?? [];
  const pagination = list.data?.pagination ?? FIRST_PAGE;

  const firstLoad = list.loading && !list.data;
  // An error left over from an earlier attempt is not shown while a new load is running
  const failed = !list.loading && !!list.error;
  const hasFilters = !!(search || status || attFilter || selectedDate);

  const presentRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
  const absentRate = summary.total > 0 ? Math.round((summary.absent / summary.total) * 100) : 0;
  const monthName = formatMonthKey(month);

  // A quick update can empty the last page (e.g. while filtering by "Not Marked"): step back to the last page that exists
  const lastPage = list.data?.pagination?.totalPages ?? 1;
  useEffect(() => {
    if (!list.loading && list.data && page > lastPage) setPage(Math.max(1, lastPage));
  }, [list.loading, list.data, page, lastPage]);

  const pickDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setAttFilter("");
    setSelectedDate("");
    setPage(1);
  };

  const changePage = (next: number) => {
    setPage(next);
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 8), animated: true });
  };

  const refreshAll = async () => {
    await Promise.all([list.refresh(), calendar.refresh()]);
  };

  /**
   * Quick attendance update. Marking a class present or absent also completes it
   * (the server then stamps the end time if the class had none); "Unmark" leaves the status alone.
   */
  const updateAttendance = async (sessionId: string, next: Attendance) => {
    setUpdatingId(sessionId);
    try {
      const reply = await api.patch<{ success?: boolean; message?: string }>(CLASS_MONTHLY_PATH, {
        sessionId,
        attendance: next,
        status: next !== "not-marked" ? "completed" : undefined,
      });
      if (!reply.success) {
        toast.error(reply.message || "Could not update the attendance.");
        return;
      }
      const patch = (s: Session): Session => (s._id === sessionId ? { ...s, studentAttendance: next, status: next !== "not-marked" ? "completed" : s.status } : s);
      list.setData((prev) => (prev ? { ...prev, sessions: (prev.sessions ?? []).map(patch) } : prev));
      calendar.setData((prev) => (prev ? { ...prev, sessions: (prev.sessions ?? []).map(patch) } : prev));
      // Bring the summary numbers up to date in the background
      void list.reload();
      void calendar.reload();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the attendance."));
    } finally {
      setUpdatingId(null);
    }
  };

  /** The PDF holds every class matching the filters (not only the page on screen) */
  const exportPdf = async () => {
    setExporting(true);
    try {
      const all = await api.get<MonthlyReply>(CLASS_MONTHLY_PATH, { month, limit: FULL_MONTH_LIMIT, page: 1, date: selectedDate, status, attendance: attFilter, search: search.trim() });
      const html = buildReportHtml({
        sessions: all.success ? (all.sessions ?? []) : [],
        summary,
        periodLabel: selectedDate ? `Date: ${selectedDate}` : monthName,
        generatedAt: formatDateTime(new Date()),
      });
      await shareHtmlAsPdf(html, `FajrAcademy_ClassReport_${selectedDate || month}`, { landscape: true });
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the PDF report."));
    } finally {
      setExporting(false);
    }
  };

  const detail = detailId ? (sessions.find((s) => s._id === detailId) ?? allSessions.find((s) => s._id === detailId) ?? null) : null;

  return (
    <Screen onRefresh={refreshAll} refreshing={list.refreshing || calendar.refreshing} scrollRef={scrollRef}>
      <Row gap={12}>
        <IconChip icon="bar-chart-2" tone="primary" />
        <View style={{ flex: 1 }}>
          <T variant="title">Monthly Class & Date-wise Report</T>
          <T variant="small" color="muted">
            {selectedDate ? `Date: ${longDateLabel(selectedDate)}` : monthName}
          </T>
        </View>
      </Row>

      <MonthPicker
        value={month}
        onChange={(next) => {
          setMonth(next);
          setSelectedDate("");
          setPage(1);
        }}
      />

      <Segmented<ViewMode>
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "calendar", label: "Calendar", icon: "grid" },
          { value: "list", label: "List View", icon: "list" },
        ]}
      />

      <Button title="Export PDF Report" icon="printer" block loading={exporting} disabled={sessions.length === 0} onPress={() => void exportPdf()} />

      {failed ? (
        <Card padding={0}>
          <ErrorState message={list.error || "Failed to load class sessions"} onRetry={list.retry} />
        </Card>
      ) : firstLoad ? (
        <SkeletonTiles count={6} />
      ) : (
        <>
          <TileGrid>
            <StatTile label="Total Classes" value={summary.total} icon="book-open" gradient="blue" />
            <StatTile label="Present" value={summary.present} sub={`${presentRate}%`} icon="check-circle" gradient="emerald" />
            <StatTile label="Absent" value={summary.absent} sub={`${absentRate}%`} icon="x-circle" gradient="rose" />
            <StatTile label="Not Marked" value={summary.notMarked} icon="minus-circle" gradient="slate" />
            <StatTile label="Completed" value={summary.completed} icon="check-square" gradient="violet" />
            <StatTile label="Total Time" value={hoursAndMinutes(summary.totalMins)} sub="teaching" icon="clock" gradient="amber" />
          </TileGrid>

          {summary.total > 0 ? (
            <Card>
              <Row gap={6} style={{ marginBottom: 8 }}>
                <Icon name="activity" size={16} color={c.primary} />
                <T variant="bodyStrong" style={{ flex: 1 }}>
                  Attendance Overview ({selectedDate || month})
                </T>
              </Row>
              <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: c.surfaceAlt }}>
                {summary.present > 0 ? <View style={{ width: `${presentRate}%`, backgroundColor: c.success }} /> : null}
                {summary.absent > 0 ? <View style={{ width: `${absentRate}%`, backgroundColor: c.danger }} /> : null}
                {summary.notMarked > 0 ? <View style={{ flex: 1, backgroundColor: c.borderStrong }} /> : null}
              </View>
              <Row gap={12} wrap style={{ marginTop: 10 }}>
                <LegendDot color={c.success} label={`Present ${presentRate}%`} />
                <LegendDot color={c.danger} label={`Absent ${absentRate}%`} />
                <LegendDot color={c.borderStrong} label="Not marked" />
              </Row>
            </Card>
          ) : null}

          {dailyStats.length > 0 ? (
            <Card>
              <Row gap={6} align="flex-start">
                <Icon name="calendar" size={15} color={c.primary} style={{ marginTop: 1 }} />
                <T variant="smallStrong" color="muted" style={{ flex: 1 }}>
                  Date-wise Summary ({dailyStats.length} active days in {monthName})
                </T>
                {selectedDate ? (
                  <Pressable onPress={() => pickDate("")} hitSlop={10} accessibilityRole="button">
                    <T variant="smallStrong" color="primary" style={{ textDecorationLine: "underline" }}>
                      View Full Month
                    </T>
                  </Pressable>
                ) : null}
              </Row>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                <DayChip active={!selectedDate} onPress={() => pickDate("")} label={`All Month (${summary.total})`} />
                {dailyStats.map((day) => {
                  const active = selectedDate === day._id;
                  return <DayChip key={day._id} active={active} onPress={() => pickDate(active ? "" : day._id)} label={monthDayLabel(day._id)} count={`${day.total} ${day.total === 1 ? "class" : "classes"}`} present={day.present} />;
                })}
              </ScrollView>
            </Card>
          ) : null}
        </>
      )}

      <Card padding={0} style={{ overflow: "hidden" }}>
        <Pressable
          onPress={() => setFiltersOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
          android_ripple={{ color: c.border }}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, minHeight: 48 }}
        >
          <Icon name="filter" size={16} color={c.primary} />
          <T variant="bodyStrong">Filters & Date Range</T>
          {hasFilters ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} /> : null}
          <View style={{ flex: 1 }} />
          <Icon name={filtersOpen ? "chevron-down" : "chevron-right"} size={18} color={c.textFaint} />
        </Pressable>
        {filtersOpen ? (
          <View style={{ padding: 16, paddingTop: 4, gap: 12 }}>
            <DateField value={selectedDate} onChange={pickDate} placeholder="Filter by specific date" clearable />
            <SearchBar
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setPage(1);
              }}
              placeholder="Search student or ID..."
            />
            <Row gap={10} align="flex-start">
              <Select
                containerStyle={{ flex: 1 }}
                title="Status"
                icon="filter"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
              <Select
                containerStyle={{ flex: 1 }}
                title="Attendance"
                icon="users"
                value={attFilter}
                options={ATTENDANCE_OPTIONS}
                onChange={(value) => {
                  setAttFilter(value);
                  setPage(1);
                }}
              />
            </Row>
            {hasFilters ? <Button title="Clear Filters" icon="x" variant="secondary" size="sm" onPress={clearFilters} /> : null}
          </View>
        ) : null}
      </Card>

      {viewMode === "calendar" ? (
        <>
          {calendar.error && !calendar.loading ? (
            <Banner tone="danger" title="Could not load the calendar" message={calendar.error}>
              <Button title="Retry" icon="refresh-cw" size="sm" variant="dangerSoft" onPress={calendar.retry} />
            </Banner>
          ) : null}
          <MonthCalendar sessions={allSessions} month={month} selectedDate={selectedDate} onSelectDate={pickDate} loading={calendar.loading} onOpenSession={setDetailId} />
        </>
      ) : failed ? null : (
        <View
          style={{ gap: 12 }}
          onLayout={(e) => {
            listY.current = e.nativeEvent.layout.y;
          }}
        >
          <Row justify="space-between" gap={8}>
            <T variant="bodyStrong" style={{ flex: 1 }}>
              {list.loading ? "Loading…" : `${pagination.total} session${pagination.total !== 1 ? "s" : ""} ${selectedDate ? `on ${selectedDate}` : `in ${monthName}`}`}
            </T>
            <Row gap={4}>
              <Icon name="award" size={13} color={c.warning} />
              <T variant="caption" color="faint">
                Page {pagination.page} of {pagination.totalPages}
              </T>
            </Row>
          </Row>

          {list.loading ? (
            <SkeletonList count={5} />
          ) : sessions.length === 0 ? (
            <Card padding={0}>
              <EmptyState icon="calendar" title="No sessions found" message="Try selecting another date or clearing your filters." actionLabel={hasFilters ? "Clear Filters" : undefined} onAction={hasFilters ? clearFilters : undefined} />
            </Card>
          ) : (
            <>
              {sessions.map((s, i) => (
                <Card key={s._id}>
                  <SessionDetails session={s} index={(pagination.page - 1) * pagination.limit + i + 1} busy={updatingId === s._id} onAttendance={(next) => void updateAttendance(s._id, next)} />
                </Card>
              ))}
              {pagination.totalPages > 1 ? (
                <View style={{ gap: 8 }}>
                  <T variant="small" color="muted" center>
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sessions
                  </T>
                  <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={changePage} />
                </View>
              ) : null}
            </>
          )}
        </View>
      )}

      <Sheet visible={!!detail} onClose={() => setDetailId(null)} title="Class details">
        {detail ? <SessionDetails session={detail} busy={updatingId === detail._id} onAttendance={(next) => void updateAttendance(detail._id, next)} /> : null}
      </Sheet>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={5}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T variant="caption" color="muted">
        {label}
      </T>
    </Row>
  );
}

/** A date pill of the date-wise summary: "Nov 5 · 3 classes · ✓2" */
function DayChip({ active, onPress, label, count, present }: { active: boolean; onPress: () => void; label: string; count?: string; present?: number }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.surface }}
    >
      <Text style={{ color: active ? "#ffffff" : c.text, fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
      {count ? (
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: active ? "rgba(255,255,255,0.2)" : c.primarySoft }}>
          <Text style={{ color: active ? "#ffffff" : c.primaryText, fontSize: 10.5, fontWeight: "700" }}>{count}</Text>
        </View>
      ) : null}
      {typeof present === "number" ? <Text style={{ color: active ? "rgba(255,255,255,0.85)" : c.successText, fontSize: 10.5, fontWeight: "700" }}>✓{present}</Text> : null}
    </Pressable>
  );
}
