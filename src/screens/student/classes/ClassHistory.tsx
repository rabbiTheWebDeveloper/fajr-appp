import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { copyText, openExternal } from "@/lib/device";
import {
  buildClassFlow,
  buildMonthOptions,
  classTypeLabel,
  conductedAt,
  formatMinutes,
  formatStamp,
  formatTimeOfDay,
  formatWeekdayDate,
  matchesSearch,
  monthKey,
  monthLabel,
  sessionMinutes,
  sortNewestFirst,
  summariseSessions,
  type HistorySession,
} from "@/screens/student/classes/class-history-utils";
import { shareLessonSummaryPdf } from "@/screens/student/classes/lesson-summary-pdf";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Badge, Banner, Button, Card, EmptyState, Icon, IconButton, IconChip, MIcon, Row, SearchBar, Select, StatTile, T, TileGrid, type Option } from "@/ui";

const ALL = "all";

type ListRow = { kind: "month"; key: string; label: string; count: number } | { kind: "session"; session: HistorySession };

/** Only web links are made tappable; anything else a teacher typed stays plain text. */
const isWebLink = (value?: string | null): value is string => !!value && /^https?:\/\//i.test(value);

/** "beginner" -> "Beginner" */
const capitaliseWords = (text: string) => text.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

function AttendanceBadge({ value }: { value?: string }) {
  if (value === "present") return <Badge label="PRESENT" tone="success" icon="check-circle" />;
  if (value === "absent") return <Badge label="ABSENT" tone="danger" icon="x-circle" />;
  return <Badge label="NOT MARKED" tone="neutral" />;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: 10, gap: 3 }}>
      <T variant="label" color="faint" style={{ fontSize: 9.5 }}>
        {label}
      </T>
      {children}
    </View>
  );
}

/** The opened part of a class card: how the class went, step by step, and what it had. */
function SessionDetails({ session: s }: { session: HistorySession }) {
  const { c } = useTheme();
  const steps = buildClassFlow(s);
  const hasActual = !!s.actualDuration;
  const notes = s.notes?.trim();
  const courseMeta = [s.course?.level, s.course?.category].filter((part): part is string => !!part);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surfaceAlt, padding: 14, gap: 18 }}>
      {/* Class flow */}
      <View style={{ gap: 12 }}>
        <T variant="label" color="primary">
          Class flow
        </T>
        <View>
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <Row key={step.key} gap={12} align="stretch">
                <View style={{ width: 24, alignItems: "center" }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: step.recorded ? c.primary : c.border, alignItems: "center", justifyContent: "center" }}>
                    {step.recorded ? <Icon name="check" size={14} color={c.onDark} /> : <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: c.textFaint }} />}
                  </View>
                  {!last ? <View style={{ flex: 1, width: 1.5, backgroundColor: c.borderStrong }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: last ? 0 : 14, paddingTop: 2 }}>
                  <T variant="smallStrong" weight="800" color={step.recorded ? "text" : "faint"}>
                    {step.label}
                  </T>
                  {step.when ? (
                    <T variant="caption" color="primary" weight="700">
                      {formatStamp(step.when)}
                    </T>
                  ) : null}
                  <T variant="caption" color="muted">
                    {step.detail}
                  </T>
                </View>
              </Row>
            );
          })}
        </View>
      </View>

      {/* What the class had */}
      <View style={{ gap: 10 }}>
        <T variant="label" color="primary">
          What this class had
        </T>

        <Row gap={10} align="flex-start" style={{ backgroundColor: c.warningSoft, borderRadius: radius.md, padding: 12 }}>
          <MIcon name="creation" size={16} color={c.warningText} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" color="warning" style={{ fontSize: 9.5 }}>
              Lesson topic
            </T>
            <T variant="smallStrong" weight="800">
              {s.topic?.trim() || "Your teacher did not write a topic for this class"}
            </T>
          </View>
        </Row>

        <TileGrid columns={2} gap={8}>
          <Fact label="Class type">
            <T variant="smallStrong">{classTypeLabel(s.classType)}</T>
          </Fact>
          <Fact label="Time spent">
            <T variant="smallStrong">{hasActual ? `${s.actualDuration} min` : "Not recorded"}</T>
            <T variant="caption" color="faint">
              {s.duration || 45} min planned
            </T>
          </Fact>
          <Fact label="Attendance">
            <AttendanceBadge value={s.studentAttendance} />
          </Fact>
          <Fact label="Instructor">
            <T variant="smallStrong">{s.teacher?.fullName || "FAJR Certified Teacher"}</T>
          </Fact>
          <Fact label="Course">
            <T variant="smallStrong">{s.course?.title || "—"}</T>
            {courseMeta.length > 0 ? (
              <T variant="caption" color="faint">
                {courseMeta.map(capitaliseWords).join(" · ")}
              </T>
            ) : null}
          </Fact>
          <Fact label="Class ID">
            <T variant="mono" selectable style={{ fontSize: 11.5 }}>
              {s.classId || "—"}
            </T>
          </Fact>
        </TileGrid>

        {notes ? (
          <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: 12, gap: 4 }}>
            <T variant="label" color="faint" style={{ fontSize: 9.5 }}>
              Teacher notes
            </T>
            <T variant="small" color="muted" style={{ fontStyle: "italic", lineHeight: 19 }}>
              “{notes}”
            </T>
          </View>
        ) : null}

        {s.meetLink ? (
          <View style={{ backgroundColor: c.primarySoft, borderRadius: radius.md, padding: 12, gap: 10 }}>
            <Row gap={10}>
              <IconChip icon="video" tone="primary" size={32} />
              <View style={{ flex: 1 }}>
                <T variant="label" color="primary" style={{ fontSize: 9.5 }}>
                  Class meeting link
                </T>
                <T variant="mono" numberOfLines={1} selectable>
                  {s.meetLink}
                </T>
              </View>
            </Row>
            <Row gap={8} justify="flex-end">
              {isWebLink(s.meetLink) ? <Button title="Open" icon="external-link" size="sm" style={{ height: 40 }} onPress={() => void openExternal(s.meetLink)} /> : null}
              <Button title="Copy" icon="copy" variant="secondary" size="sm" style={{ height: 40 }} onPress={() => void copyText(s.meetLink as string, "Copied!")} />
            </Row>
          </View>
        ) : (
          <Row gap={8} style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: 10 }}>
            <Icon name="video" size={14} color={c.textFaint} />
            <T variant="caption" color="faint" style={{ flex: 1, fontStyle: "italic" }}>
              Classroom session held directly via portal
            </T>
          </Row>
        )}
      </View>
    </View>
  );
}

interface SessionCardProps {
  session: HistorySession;
  open: boolean;
  /** The whole history is on show, so the date carries its year */
  showYear: boolean;
  onToggle: (id: string) => void;
}

/** One class: every column of the website's table on a card; tapping it opens the class flow. */
const SessionCard = React.memo(function SessionCard({ session: s, open, showYear, onToggle }: SessionCardProps) {
  const { c } = useTheme();
  const when = conductedAt(s);
  const hasActual = !!s.actualDuration;
  const topic = s.topic?.trim();

  return (
    <Card padding={0} style={{ overflow: "hidden", borderColor: open ? c.primary : c.border }}>
      <Pressable
        onPress={() => onToggle(s._id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? "Hide" : "Show"} class flow for ${s.course?.title || "this class"}`}
        android_ripple={{ color: c.border }}
        style={{ padding: 14, gap: 10 }}
      >
        <Row justify="space-between" align="flex-start" gap={10}>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong" weight="800">
              {when ? formatWeekdayDate(when, showYear) : "—"}
            </T>
            {when ? (
              <T variant="caption" color="muted">
                {formatTimeOfDay(when)}
              </T>
            ) : null}
          </View>
          <AttendanceBadge value={s.studentAttendance} />
        </Row>

        <View style={{ gap: 2 }}>
          <T variant="title">{s.course?.title || "Class Session"}</T>
          <T variant="small" color="muted">
            {s.teacher?.fullName || "FAJR Certified Teacher"}
          </T>
        </View>

        <View style={{ gap: 2 }}>
          <T variant="label" color="faint" style={{ fontSize: 9.5 }}>
            Lesson topic
          </T>
          {topic ? (
            <T variant="smallStrong" color="warning">
              {topic}
            </T>
          ) : (
            <T variant="small" color="faint" style={{ fontStyle: "italic" }}>
              Not recorded
            </T>
          )}
        </View>

        <Row justify="space-between" gap={10}>
          <Row gap={10} wrap style={{ flex: 1 }}>
            <Badge label={classTypeLabel(s.classType)} tone="primary" />
            <Row gap={5}>
              <Icon name="clock" size={13} color={c.textFaint} />
              <T variant="smallStrong">{sessionMinutes(s)} min</T>
              {!hasActual ? (
                <T variant="caption" color="faint">
                  planned
                </T>
              ) : null}
            </Row>
          </Row>
          <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <Icon name={open ? "chevron-up" : "chevron-down"} size={17} color={c.textMuted} />
          </View>
        </Row>
      </Pressable>

      {open ? <SessionDetails session={s} /> : null}
    </Card>
  );
});

interface ClassHistoryProps {
  history: HistorySession[];
  student?: { fullName?: string; studentId?: string } | null;
  /** Opens already searching for this text (a course card's "Class history" button), across all months */
  initialSearch?: string;
  /** What sits above the history on the page (the live-class banner, the tabs) */
  top?: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
}

export default function ClassHistory({ history, student = null, initialSearch = "", top, refreshing, onRefresh }: ClassHistoryProps) {
  const { c } = useTheme();
  // Lazy initialiser: "now" is read once, when the tab opens, not on every render
  const [currentKey] = useState(() => monthKey(new Date()));
  const [month, setMonth] = useState<string>(initialSearch ? ALL : currentKey);
  const [search, setSearch] = useState(initialSearch);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const months = useMemo(() => buildMonthOptions(history, currentKey), [history, currentKey]);
  const monthIndex = months.findIndex((m) => m.key === month);
  const latestWithClasses = months.find((m) => m.count > 0);

  const monthChoices = useMemo<Option[]>(
    () => [
      { value: ALL, label: `All months (${history.length} classes)` },
      ...months.map((m) => ({ value: m.key, label: `${m.label}${m.key === currentKey ? " · this month" : ""} (${m.count})` })),
    ],
    [months, history.length, currentKey]
  );

  const inMonth = useMemo(() => {
    const sorted = sortNewestFirst(history);
    if (month === ALL) return sorted;
    return sorted.filter((s) => {
      const d = conductedAt(s);
      return d !== null && monthKey(d) === month;
    });
  }, [history, month]);

  const visible = useMemo(() => inMonth.filter((s) => matchesSearch(s, search)), [inMonth, search]);

  const rows = useMemo<ListRow[]>(() => {
    if (month !== ALL) return visible.map((session) => ({ kind: "session", session }));
    // Whole history: put a month heading in front of each month's classes
    const keyOf = (s: HistorySession) => {
      const d = conductedAt(s);
      return d ? monthKey(d) : "undated";
    };
    const counts = new Map<string, number>();
    for (const s of visible) counts.set(keyOf(s), (counts.get(keyOf(s)) ?? 0) + 1);
    const out: ListRow[] = [];
    let last = "";
    for (const s of visible) {
      const key = keyOf(s);
      if (key !== last) {
        out.push({ kind: "month", key, label: key === "undated" ? "No date recorded" : monthLabel(key), count: counts.get(key) ?? 0 });
        last = key;
      }
      out.push({ kind: "session", session: s });
    }
    return out;
  }, [visible, month]);

  const totals = useMemo(() => summariseSessions(visible), [visible]);
  const presentPct = totals.classes > 0 ? Math.round((totals.present / totals.classes) * 100) : 0;

  // The PDF is one month's record: it takes every class of the month, whatever the search box says
  const canExport = month !== ALL && inMonth.length > 0;

  const exportSummary = async () => {
    if (!canExport || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await shareLessonSummaryPdf({ student, month, sessions: inMonth, generatedAt: new Date() });
    } catch {
      setExportError("The lesson summary could not be created. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const toggle = useCallback(
    (id: string) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    []
  );

  const monthTitle = month === ALL ? "All months" : monthLabel(month);
  const showYear = month === ALL;

  const header =
    history.length === 0 ? (
      <View style={{ gap: 16 }}>
        {top}
        <Card padding={0}>
          <EmptyState icon="clock" title="No Class History" message="You have not completed any class sessions yet." />
        </Card>
      </View>
    ) : (
      <View style={{ gap: 16 }}>
        {top}

        {/* ── Filters: month, search ── */}
        <Card style={{ gap: 14 }}>
          <Row gap={12} align="flex-start">
            <IconChip icon="calendar" tone="primary" />
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="bodyStrong" weight="800">
                Class history — {monthTitle}
              </T>
              {month === currentKey ? <Badge label="This month" tone="success" /> : null}
              <T variant="small" color="muted">
                Tap a class to see how it went, step by step, and what it covered.
              </T>
            </View>
          </Row>

          <Row gap={8}>
            <IconButton
              icon="chevron-left"
              accessibilityLabel="Earlier month"
              background={c.surfaceAlt}
              color={c.text}
              disabled={monthIndex < 0 || monthIndex >= months.length - 1}
              onPress={() => setMonth(months[monthIndex + 1].key)}
            />
            <Select compact value={month} options={monthChoices} onChange={setMonth} title="Filter by month" icon="calendar" containerStyle={{ flex: 1 }} />
            <IconButton icon="chevron-right" accessibilityLabel="Later month" background={c.surfaceAlt} color={c.text} disabled={monthIndex <= 0} onPress={() => setMonth(months[monthIndex - 1].key)} />
          </Row>
          {month !== currentKey ? <Button title="This month" icon="corner-down-left" variant="outline" size="sm" style={{ height: 40 }} onPress={() => setMonth(currentKey)} /> : null}

          <SearchBar value={search} onChangeText={setSearch} placeholder="Search topic, course, teacher..." style={{ backgroundColor: c.inputBg }} />
        </Card>

        {/* ── Totals for what is on screen ── */}
        <TileGrid>
          <StatTile label="Classes" value={totals.classes} icon="book-open" gradient="blue" />
          <StatTile label="Present" value={`${totals.present} (${presentPct}%)`} icon="check-circle" gradient="emerald" />
          <StatTile label="Total duration" value={formatMinutes(totals.minutes)} icon="clock" gradient="violet" />
          <StatTile label="Topics covered" value={totals.topics} mIcon="creation" gradient="amber" />
        </TileGrid>

        {/* ── Monthly lesson summary PDF ── */}
        <Card tone="primary" style={{ gap: 12 }}>
          <Row gap={12} align="flex-start">
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              <Icon name="download" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong" weight="800">
                Monthly lesson summary (PDF)
              </T>
              <T variant="small" color="muted">
                {month === ALL
                  ? "Choose a month above to download its lesson summary."
                  : inMonth.length === 0
                    ? `No classes in ${monthTitle}, so there is nothing to export.`
                    : `Every class of ${monthTitle} with its lesson topic, attendance and time, signed off by the Head of Curriculum.`}
              </T>
            </View>
          </Row>
          <Button title={exporting ? "Preparing PDF..." : "Export lesson summary"} icon="download" block loading={exporting} disabled={!canExport} onPress={() => void exportSummary()} />
        </Card>
        {exportError ? (
          <Banner tone="danger" message={exportError}>
            <Button title="Try again" variant="danger" size="sm" style={{ height: 40 }} onPress={() => void exportSummary()} />
          </Banner>
        ) : null}

        {/* ── Nothing to list ── */}
        {visible.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 6, paddingVertical: 28 }}>
            {search.trim() ? (
              <>
                <T variant="bodyStrong" center>
                  No classes found
                </T>
                <T variant="small" color="faint" center>
                  Nothing in {monthTitle.toLowerCase()} matches &quot;{search}&quot;.
                </T>
                <Button title="Clear search" variant="secondary" size="sm" style={{ height: 40, alignSelf: "center", marginTop: 8 }} onPress={() => setSearch("")} />
              </>
            ) : (
              <>
                <T variant="bodyStrong" center>
                  No classes in {monthTitle}
                </T>
                <T variant="small" color="faint" center>
                  No completed class was recorded in this period.
                </T>
                <Row gap={8} wrap justify="center" style={{ marginTop: 8 }}>
                  {latestWithClasses && latestWithClasses.key !== month ? (
                    <Button title={`Go to ${latestWithClasses.label}`} size="sm" style={{ height: 40 }} onPress={() => setMonth(latestWithClasses.key)} />
                  ) : null}
                  <Button title="Show all months" variant="secondary" size="sm" style={{ height: 40 }} onPress={() => setMonth(ALL)} />
                </Row>
              </>
            )}
          </Card>
        ) : null}
      </View>
    );

  return (
    <FlatList
      data={history.length === 0 ? [] : rows}
      keyExtractor={(item) => (item.kind === "month" ? `month-${item.key}` : item.session._id)}
      extraData={expanded}
      ListHeaderComponent={header}
      renderItem={({ item }) =>
        item.kind === "month" ? (
          <Row gap={8} style={{ paddingHorizontal: 4, paddingTop: 6 }}>
            <T variant="bodyStrong" weight="800" color="primary">
              {item.label}
            </T>
            <Badge label={`${item.count} class${item.count === 1 ? "" : "es"}`} tone="primary" />
          </Row>
        ) : (
          <SessionCard session={item.session} open={expanded.has(item.session._id)} showYear={showYear} onToggle={toggle} />
        )
      }
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
    />
  );
}
