import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";

import { api } from "@/api/client";
import { academyDayIndex } from "@/lib/format";
import { useFetch } from "@/lib/hooks";
import { useNav } from "@/navigation/nav";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { CreateTicketSheet } from "@/screens/teacher/helpdesk/CreateTicketSheet";
import { TicketDetailSheet, type SheetNotice } from "@/screens/teacher/helpdesk/TicketDetailSheet";
import {
  CATEGORIES,
  EMPTY_COUNTS,
  FAQ_ITEMS,
  PAGE_SIZE,
  STATUS_TABS,
  TICKETS_PATH,
  assigneeName,
  hasNewStaffReply,
  isActiveStatus,
  isOwnMessage,
  mergeTicket,
  resolveCategory,
  ticketCode,
  visibleMessages,
  type StatusTab,
  type TicketItem,
  type TicketStatus,
  type TicketsReply,
} from "@/screens/teacher/helpdesk/helpdesk-utils";
import { CategoryTile, NewReplyBadge, StaffAvatar, StatusChip, Stepper, TicketRow } from "@/screens/teacher/helpdesk/parts";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  GradientCard,
  Icon,
  IconChip,
  MIcon,
  Pagination,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Select,
  Skeleton,
  StatTile,
  T,
  TileGrid,
  toast,
  type IconName,
  type MIconName,
  type ScrollViewRef,
} from "@/ui";

const CATEGORY_FILTER_OPTIONS = [{ value: "all", label: "All topics" }, ...CATEGORIES.map((cat) => ({ value: cat.label, label: cat.short }))];

const HOW_IT_WORKS: { icon?: IconName; mIcon?: MIconName; title: string; text: string }[] = [
  { icon: "send", title: "Raise a ticket", text: "Choose a topic and describe the issue clearly." },
  { mIcon: "forum-outline", title: "Chat with a coordinator", text: "Reply in the same thread — unlimited messages." },
  { mIcon: "check-decagram", title: "Resolved & rated", text: "Once resolved, rate the support you received." },
];

const HERO_FACTS: { icon: IconName; text: string }[] = [
  { icon: "clock", text: "First reply in 2–4 business hours" },
  { icon: "calendar", text: "Saturday – Thursday" },
  { icon: "shield", text: "Private to you & staff" },
];

/** Teacher's Helpdesk: support tickets with a chat thread per ticket (the website's /teacher/teacher-helpdesk and /teacher/tickets) */
export default function TeacherHelpdeskScreen() {
  const { c } = useTheme();
  const nav = useNav();
  const { profile } = useTeacher();
  const teacherName = profile?.fullName || "";
  const teacherAvatar = profile?.avatar || "";

  /* ── List state ── */
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fetchedActive, setFetchedActive] = useState<TicketItem | null>(null);
  const [activeTick, setActiveTick] = useState(0);

  /* ── Sheets ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [createSeq, setCreateSeq] = useState(0);
  const [createCategory, setCreateCategory] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSeq, setDetailSeq] = useState(0);
  const [detailTicket, setDetailTicket] = useState<TicketItem | null>(null);
  const [notice, setNotice] = useState<SheetNotice | null>(null);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const scrollRef = useRef<ScrollViewRef>(null);
  const ticketsY = useRef(0);
  const faqY = useRef(0);
  const noticeSeq = useRef(0);
  const detailOpenRef = useRef(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) {
        setSearch(next);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  /* ── Data ── */
  const list = useFetch<TicketsReply>(TICKETS_PATH, {
    page,
    limit: PAGE_SIZE,
    status: statusTab === "all" ? undefined : statusTab,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    search: search || undefined,
  });
  const { setData, reload, refresh } = list;
  const loading = list.loading;
  const tickets = useMemo(() => list.data?.tickets ?? [], [list.data]);
  const totalPages = list.data?.totalPages || 1;
  const totalTickets = list.data?.total || 0;
  const statusCounts = list.data?.statusCounts ?? EMPTY_COUNTS;

  const openCount = statusCounts.open ?? 0;
  const progressCount = statusCounts["in-progress"] ?? 0;
  const onHoldCount = statusCounts["on-hold"] ?? 0;
  const resolvedCount = statusCounts.resolved ?? 0;
  const closedCount = statusCounts.closed ?? 0;
  const lifetimeTotal = openCount + progressCount + onHoldCount + resolvedCount + closedCount;
  // Only one ticket can be open / in progress / on hold at a time (the server enforces it on create)
  const activeStatus: TicketStatus | null = progressCount > 0 ? "in-progress" : onHoldCount > 0 ? "on-hold" : openCount > 0 ? "open" : null;
  const hasActiveTicket = activeStatus !== null;

  // Active ticket: prefer the copy in the current list, otherwise fetch it independently of tab / page
  const activeInList = tickets.find((t) => isActiveStatus(t.status)) ?? null;
  const activeTicket: TicketItem | null = !activeStatus ? null : (activeInList ?? (fetchedActive && isActiveStatus(fetchedActive.status) ? fetchedActive : null));
  const needsActiveFetch = !!activeStatus && !activeInList;

  useEffect(() => {
    if (!needsActiveFetch || !activeStatus) return undefined;
    let cancelled = false;
    api
      .get<TicketsReply>(TICKETS_PATH, { status: activeStatus, limit: 1 })
      .then((d) => {
        if (!cancelled && d.success) setFetchedActive(d.tickets?.[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsActiveFetch, activeStatus, activeTick]);

  /** Push an updated ticket into every place it is displayed */
  const syncTicket = useCallback(
    (upd: TicketItem) => {
      setData((prev) => (prev ? { ...prev, tickets: (prev.tickets ?? []).map((t) => (t._id === upd._id ? mergeTicket(t, upd) : t)) } : prev));
      setDetailTicket((prev) => (prev && prev._id === upd._id ? mergeTicket(prev, upd) : prev));
      setFetchedActive((prev) => (prev && prev._id === upd._id ? mergeTicket(prev, upd) : prev));
    },
    [setData]
  );

  // Live refresh of the open conversation (every 30s while an active ticket is open)
  const detailId = detailTicket?._id;
  const detailStatus = detailTicket?.status;
  const detailCode = detailTicket?.ticketId;
  useEffect(() => {
    if (!detailOpen || !detailId || !isActiveStatus(detailStatus)) return undefined;
    const tick = async () => {
      if (AppState.currentState !== "active") return;
      try {
        const d = await api.get<TicketsReply>(TICKETS_PATH, { search: detailCode || "", limit: 5 });
        const found = d.tickets?.find((t) => t._id === detailId);
        if (found) syncTicket(found);
      } catch {
        /* silent */
      }
    };
    const timer = setInterval(() => void tick(), 30000);
    return () => clearInterval(timer);
  }, [detailOpen, detailId, detailStatus, detailCode, syncTicket]);

  /* ── Messages: inside the ticket sheet while it is open (a toast would sit behind it), a toast otherwise ── */
  const notify = useCallback((type: "success" | "error", text: string) => {
    if (!detailOpenRef.current) {
      if (type === "success") toast.success(text);
      else toast.error(text);
      return;
    }
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, type, text });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ── Actions ── */
  const openDetail = (t: TicketItem) => {
    detailOpenRef.current = true;
    setNotice(null);
    setDetailTicket(t);
    setDetailSeq((n) => n + 1);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    detailOpenRef.current = false;
    setDetailOpen(false);
  };

  const openCreate = (catLabel?: string) => {
    if (hasActiveTicket && activeTicket) {
      openDetail(activeTicket);
      notify("error", "You already have an active ticket — continue the conversation there.");
      return;
    }
    setCreateCategory(catLabel || "");
    setCreateSeq((n) => n + 1);
    setCreateOpen(true);
  };

  const changeTab = (key: StatusTab) => {
    setStatusTab(key);
    setPage(1);
  };
  /** A snapshot tile picks its status tab and brings the list into view */
  const goToTab = (key: StatusTab) => {
    changeTab(key);
    scrollRef.current?.scrollTo({ y: Math.max(0, ticketsY.current - 8), animated: true });
  };
  const resetFilters = () => {
    setStatusTab("all");
    setCategoryFilter("all");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };
  const filtersActive = statusTab !== "all" || categoryFilter !== "all" || !!search;

  const onRefresh = async () => {
    setActiveTick((n) => n + 1);
    await refresh();
  };

  /* ── Derived UI ── */
  const firstName = teacherName.split(" ")[0] || "";
  // The greeting follows the teacher's own clock; the support team's week follows the academy's
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isWeekend = academyDayIndex() === 5; // Friday off: the team works Sat–Thu

  const tabCount = (k: StatusTab) => (k === "all" ? lifetimeTotal : (statusCounts[k] ?? 0));
  const visibleTabs = STATUS_TABS.filter((t) => t.key !== "on-hold" || onHoldCount > 0 || statusTab === "on-hold");
  const snapshotValue = (value: number) => (loading && !lifetimeTotal ? "–" : value);

  const spotlightLast = activeTicket ? visibleMessages(activeTicket).slice(-1)[0] : undefined;
  const spotlightStaff = activeTicket ? assigneeName(activeTicket) : "";

  return (
    <Screen onRefresh={onRefresh} refreshing={list.refreshing} scrollRef={scrollRef}>
      {/* ───────────── HERO ───────────── */}
      <GradientCard gradient="navyDeep" padding={18} style={{ gap: 14 }}>
        <Row gap={8} wrap>
          <HeroPill>
            <Icon name="life-buoy" size={12} color={c.gold} />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "600" }}>Teacher Support Center</Text>
          </HeroPill>
          <HeroPill>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isWeekend ? c.warning : c.success }} />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "600", flexShrink: 1 }}>{isWeekend ? "Weekly holiday — replies resume Saturday" : "Support team available today"}</Text>
          </HeroPill>
        </Row>

        <View style={{ gap: 6 }}>
          <T variant="bodyStrong" color="gold">
            {greeting}
            {firstName ? `, ${firstName}` : ""} 👋
          </T>
          <T variant="h1" color="onDark">
            How can we help you{" "}
            <T variant="h1" color="gold">
              today?
            </T>
          </T>
          <T variant="small" color="onDarkMuted" style={{ lineHeight: 19 }}>
            Questions about classes, students, salary or the portal? Raise a ticket and our academic coordinators will reply right here — usually within a few hours.
          </T>
        </View>

        <View style={{ gap: 10 }}>
          <Button
            title={hasActiveTicket ? "Continue Active Ticket" : "Raise a New Ticket"}
            icon={hasActiveTicket ? "message-circle" : "plus"}
            iconRight="arrow-right"
            variant="gold"
            block
            onPress={() => (hasActiveTicket && activeTicket ? openDetail(activeTicket) : openCreate())}
          />
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, faqY.current - 8), animated: true })}
            accessibilityRole="button"
            style={({ pressed }) => ({ height: 44, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="help-circle" size={16} color={c.gold} />
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Browse FAQs</Text>
          </Pressable>
        </View>

        <View style={{ gap: 6 }}>
          {HERO_FACTS.map((fact) => (
            <Row key={fact.text} gap={7}>
              <Icon name={fact.icon} size={13} color={c.gold} />
              <T variant="small" color="onDarkMuted">
                {fact.text}
              </T>
            </Row>
          ))}
        </View>
      </GradientCard>

      {/* ───────────── SNAPSHOT ───────────── */}
      <View style={{ gap: 10 }}>
        <SectionHeader
          title="Your support snapshot"
          action={
            list.refreshing || loading ? (
              <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={c.primary} />
              </View>
            ) : (
              <Pressable onPress={() => void onRefresh()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Refresh tickets" style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
                <Icon name="refresh-cw" size={17} color={c.textMuted} />
              </Pressable>
            )
          }
        />
        <TileGrid>
          <StatTile label="Open" value={snapshotValue(openCount)} icon="disc" gradient="sky" onPress={() => goToTab("open")} />
          <StatTile label="In Progress" value={snapshotValue(progressCount + onHoldCount)} mIcon="timer-sand" gradient="amber" onPress={() => goToTab("in-progress")} />
          <StatTile label="Resolved" value={snapshotValue(resolvedCount)} icon="check-circle" gradient="emerald" onPress={() => goToTab("resolved")} />
          <StatTile label="All Time" value={snapshotValue(lifetimeTotal)} mIcon="ticket-confirmation-outline" gradient="navy" onPress={() => goToTab("all")} />
        </TileGrid>
      </View>

      {/* ───────────── ACTIVE TICKET SPOTLIGHT ───────────── */}
      {activeTicket ? (
        <Card style={{ borderColor: `${toneColors(c, "warning").solid}66`, gap: 14 }}>
          <Row gap={8} wrap>
            <Row gap={5}>
              <MIcon name="creation" size={13} color={c.warningText} />
              <T variant="label" color="warning">
                Your active ticket
              </T>
            </Row>
            <T variant="mono" color="muted" style={{ fontSize: 11 }}>
              #{ticketCode(activeTicket)}
            </T>
            <StatusChip status={activeTicket.status} small />
            {hasNewStaffReply(activeTicket) ? <NewReplyBadge /> : null}
          </Row>

          <Row gap={12} align="flex-start">
            <CategoryTile cat={resolveCategory(activeTicket)} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="title" numberOfLines={1}>
                {activeTicket.title}
              </T>
              <T variant="small" color="muted" numberOfLines={1}>
                {spotlightLast ? (
                  <>
                    <T variant="smallStrong" color="muted">
                      {isOwnMessage(spotlightLast) ? "You" : spotlightLast.senderName || "Support"}:
                    </T>{" "}
                    {spotlightLast.content}
                  </>
                ) : (
                  activeTicket.description
                )}
              </T>
            </View>
          </Row>

          <Stepper ticket={activeTicket} />

          <Row gap={7}>
            {spotlightStaff ? <StaffAvatar name={spotlightStaff} size={20} /> : <Icon name="user" size={14} color={c.textFaint} />}
            <T variant="small" color="muted" style={{ flex: 1 }}>
              {spotlightStaff ? (
                <>
                  Handled by <T variant="smallStrong">{spotlightStaff}</T>
                </>
              ) : (
                "Awaiting coordinator assignment"
              )}
            </T>
          </Row>

          <Button title="Open conversation" icon="message-circle" variant="navy" block onPress={() => openDetail(activeTicket)} />
        </Card>
      ) : null}

      {/* ───────────── MY TICKETS ───────────── */}
      <View
        style={{ gap: 10 }}
        onLayout={(e) => {
          ticketsY.current = e.nativeEvent.layout.y;
        }}
      >
        <SectionHeader title="My Tickets" subtitle="Tap a ticket to view the full conversation and reply." />
        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder="Search ID, subject, details…" />
        <Select
          compact
          icon="filter"
          title="Filter by category"
          value={categoryFilter}
          options={CATEGORY_FILTER_OPTIONS}
          searchable={false}
          onChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Filter by status" contentContainerStyle={{ gap: 8 }}>
          {visibleTabs.map((tab) => (
            <Chip key={tab.key} label={tab.label} count={tabCount(tab.key)} selected={statusTab === tab.key} onPress={() => changeTab(tab.key)} />
          ))}
        </ScrollView>

        <Card padding={0} style={{ overflow: "hidden" }}>
          {loading ? (
            <View accessibilityLabel="Loading tickets">
              {Array.from({ length: 5 }, (_, i) => (
                <View key={i}>
                  {i > 0 ? <Divider /> : null}
                  <Row gap={12} align="flex-start" style={{ padding: 14 }}>
                    <Skeleton width={40} height={40} rounded={12} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton width={90} height={11} />
                      <Skeleton width="66%" height={13} />
                      <Skeleton width="50%" height={11} />
                    </View>
                  </Row>
                </View>
              ))}
            </View>
          ) : list.error ? (
            <ErrorState title="Couldn't load tickets" message={list.error} onRetry={list.retry} />
          ) : tickets.length === 0 ? (
            <View style={{ paddingBottom: 24 }}>
              <EmptyState
                icon={filtersActive ? "search" : "inbox"}
                title={filtersActive ? "No matching tickets" : "No tickets yet"}
                message={filtersActive ? "Try a different search term or clear your filters." : "Whenever you need help, raise a ticket — it will appear here with the full conversation."}
                style={{ paddingBottom: 14 }}
              />
              <Row gap={8} justify="center" wrap>
                {filtersActive ? <Button title="Clear filters" icon="x" variant="outline" size="sm" onPress={resetFilters} /> : null}
                {!hasActiveTicket ? <Button title="Raise a ticket" icon="plus" size="sm" onPress={() => openCreate()} /> : null}
              </Row>
            </View>
          ) : (
            tickets.map((ticket, index) => (
              <View key={ticket._id}>
                {index > 0 ? <Divider /> : null}
                <TicketRow ticket={ticket} onPress={() => openDetail(ticket)} />
              </View>
            ))
          )}

          {!loading && !list.error && totalPages > 1 ? (
            <View style={{ padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: c.border }}>
              <T variant="small" color="muted" center>
                Showing{" "}
                <T variant="smallStrong">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalTickets)}
                </T>{" "}
                of {totalTickets}
              </T>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </View>
          ) : null}
        </Card>
      </View>

      {/* ───────────── START A REQUEST ───────────── */}
      <View style={{ gap: 10 }}>
        <SectionHeader title="Start a request" subtitle="Pick a topic to route your ticket to the right team." />
        <Card padding={0} style={{ overflow: "hidden" }}>
          {hasActiveTicket ? (
            <View style={{ padding: 12, paddingBottom: 4 }}>
              <Banner tone="warning" icon="lock" message="You have an active ticket. Continue that conversation — you can raise a new one once it's resolved." />
            </View>
          ) : null}
          <View style={{ paddingVertical: 4, opacity: hasActiveTicket ? 0.6 : 1 }}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat.label} onPress={() => openCreate(cat.label)} android_ripple={{ color: c.border }} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                <CategoryTile cat={cat} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T variant="smallStrong" numberOfLines={1} style={{ fontSize: 13.5 }}>
                    {cat.short}
                  </T>
                  <T variant="caption" color="faint" numberOfLines={1}>
                    {cat.desc}
                  </T>
                </View>
                <Icon name="chevron-right" size={16} color={c.textFaint} />
              </Pressable>
            ))}
          </View>
        </Card>
      </View>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <Card style={{ gap: 14 }}>
        <T variant="title">How it works</T>
        {HOW_IT_WORKS.map((step) => (
          <Row key={step.title} gap={12} align="flex-start">
            <IconChip icon={step.icon} mIcon={step.mIcon} tone="primary" size={36} />
            <View style={{ flex: 1 }}>
              <T variant="smallStrong" style={{ fontSize: 13.5 }}>
                {step.title}
              </T>
              <T variant="small" color="muted">
                {step.text}
              </T>
            </View>
          </Row>
        ))}
        <View style={{ flexDirection: "row", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
          <MIcon name="lightbulb-on-outline" size={15} color={c.warning} style={{ marginTop: 1 }} />
          <T variant="small" color="muted" style={{ flex: 1 }}>
            <T variant="smallStrong">One active ticket at a time</T> keeps every issue focused. Add follow-ups as replies instead of new tickets.
          </T>
        </View>
      </Card>

      {/* ───────────── FAQ ───────────── */}
      <View
        onLayout={(e) => {
          faqY.current = e.nativeEvent.layout.y;
        }}
      >
        <Card padding={0}>
          <Row gap={8} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
            <Icon name="help-circle" size={18} color={c.primary} />
            <T variant="title">Frequently asked</T>
          </Row>
          {FAQ_ITEMS.map((item, idx) => {
            const open = expandedFaq === idx;
            return (
              <View key={item.q}>
                {idx > 0 ? <Divider inset={16} /> : null}
                <Pressable onPress={() => setExpandedFaq(open ? null : idx)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 13 }}>
                  <T variant="smallStrong" color={open ? "primary" : "text"} style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>
                    {item.q}
                  </T>
                  <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={open ? c.primary : c.textFaint} style={{ marginTop: 2 }} />
                </Pressable>
                {open ? (
                  <T variant="small" color="muted" style={{ paddingHorizontal: 16, paddingBottom: 14, lineHeight: 19 }}>
                    {item.a}
                  </T>
                ) : null}
              </View>
            );
          })}
          <View style={{ height: 4 }} />
        </Card>
      </View>

      {/* ───────────── ESCALATION ───────────── */}
      <GradientCard gradient="navyDeep" style={{ gap: 10 }}>
        <T variant="label" color="gold">
          Need something else?
        </T>
        <EscalationLink mIcon="crown" title="CEO Direct Line" text="Escalate sensitive matters" onPress={() => nav.go("TeacherCeoRequest")} />
        <EscalationLink mIcon="bullhorn-outline" title="Announcements" text="Latest notices & policy updates" onPress={() => nav.go("TeacherAnnouncements")} />
      </GradientCard>

      {/* ───────────── SHEETS ───────────── */}
      <CreateTicketSheet
        key={`create-${createSeq}`}
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        initialCategory={createCategory}
        hasActiveTicket={hasActiveTicket}
        onCreated={() => {
          // The new ticket is the newest: show it at the top of page 1
          if (page !== 1) setPage(1);
          else void reload();
        }}
        onView={openDetail}
      />

      <TicketDetailSheet
        key={`detail-${detailSeq}`}
        visible={detailOpen}
        onClose={closeDetail}
        ticket={detailTicket}
        teacherName={teacherName}
        teacherAvatar={teacherAvatar}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        notify={notify}
        onSync={syncTicket}
        onReload={() => void reload()}
      />
    </Screen>
  );
}

function HeroPill({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", maxWidth: "100%" }}>{children}</View>;
}

function EscalationLink({ mIcon, title, text, onPress }: { mIcon: MIconName; title: string; text: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(223,183,108,0.15)" }}>
        <MIcon name={mIcon} size={17} color={c.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="smallStrong" color="onDark" style={{ fontSize: 13.5 }}>
          {title}
        </T>
        <T variant="caption" color="onDarkMuted">
          {text}
        </T>
      </View>
      <Icon name="arrow-right" size={16} color={c.onDarkMuted} />
    </Pressable>
  );
}
