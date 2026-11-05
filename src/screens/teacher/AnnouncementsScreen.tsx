import React, { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DAY_NAMES, MONTH_NAMES, academyClock, formatClock, formatDate } from "@/lib/format";
import { useFetch } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { toneColors, type Tone } from "@/theme/palette";
import { Badge, EmptyState, ErrorState, GradientCard, Icon, MIcon, Pagination, Row, Screen, Sheet, SkeletonList, T } from "@/ui";

/** One notice, as GET /api/teacher-portal/notices?page=&limit= returns it in `notices` */
interface Notice {
  _id: string;
  title: string;
  content: string[];
  bottomQuote?: string;
  signOff?: string;
  createdAt: string;
  isActive: boolean;
}

interface NoticesReply {
  success?: boolean;
  notices?: Notice[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

const LIMIT = 10;

// The notices take these colours in turn, as on the website
const CARD_TONES: Tone[] = ["primary", "danger", "warning", "success", "violet"];

/** "Just now", "5m ago", "3h ago", "2d ago", then the date ("Nov 5, 2026") after a month */
function noticeTimeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr, "medium");
}

/** "Thursday, November 5, 2026 at 2:30 PM" (academy time) */
function formatFull(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const clock = academyClock(date);
  return `${DAY_NAMES[clock.getUTCDay()]}, ${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()} at ${formatClock(date)}`;
}

const paragraphsOf = (notice: Notice): string[] => (Array.isArray(notice.content) ? notice.content : [String(notice.content ?? "")]);

/** The notice board: every notice sent to teachers, ten to a page; tap one to read it in full */
export default function TeacherAnnouncementsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<React.ComponentRef<typeof FlatList<Notice>>>(null);

  const [page, setPage] = useState(1);
  // Which page the list on screen belongs to
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // The notice in the reading sheet; kept after closing so the sheet does not empty while it slides away
  const [openNotice, setOpenNotice] = useState<Notice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, refreshing, error, refresh, retry } = useFetch<NoticesReply>("/api/teacher-portal/notices", { page, limit: LIMIT }, { onData: () => setLoadedPage(page) });

  const ready = !!data?.success && loadedPage === page && !loading;
  const notices = ready ? (data?.notices ?? []) : [];
  const totalPages = data?.pagination?.totalPages || 1;
  const total = ready ? (data?.pagination?.total ?? notices.length) : 0;

  // The first notice starts out marked as the current one, as on the website
  const firstId = notices[0]?._id;
  useEffect(() => {
    if (firstId && selectedId === null) {
      setSelectedId(firstId);
      setSelectedIndex(0);
    }
  }, [firstId, selectedId]);

  const changePage = (next: number) => {
    setPage(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const detailTone = toneColors(c, CARD_TONES[selectedIndex % CARD_TONES.length]);
  const signOffParts = openNotice?.signOff ? openNotice.signOff.split(",") : [];

  const header = (
    <GradientCard gradient="navy" padding={14}>
      <Row gap={12}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>
            Notice Board
          </Text>
          {ready ? (
            <Text style={{ color: c.onDarkMuted, fontSize: 12 }}>
              {total} announcement{total !== 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
      </Row>
    </GradientCard>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        ref={listRef}
        data={notices}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading || (!ready && !error) ? (
            <SkeletonList count={5} lines={3} />
          ) : !ready ? (
            <ErrorState title="Could not load the notices" message={error} onRetry={retry} />
          ) : (
            <EmptyState icon="message-square" tone="neutral" title="No notices yet." message="Notices from the academy will appear here." />
          )
        }
        ListFooterComponent={ready && totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onChange={changePage} style={{ marginTop: 4 }} /> : undefined}
        renderItem={({ item, index }) => {
          const tone = toneColors(c, CARD_TONES[index % CARD_TONES.length]);
          const isSelected = selectedId === item._id;
          const first = paragraphsOf(item)[0];
          return (
            <Pressable
              onPress={() => {
                setSelectedId(item._id);
                setSelectedIndex(index);
                setOpenNotice(item);
                setSheetOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${noticeTimeAgo(item.createdAt)}${item.isActive ? "" : ". Archived"}`}
              android_ripple={{ color: c.border }}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: isSelected ? tone.solid : c.border, backgroundColor: isSelected ? tone.bg : c.surface, overflow: "hidden" }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tone.solid, alignItems: "center", justifyContent: "center" }}>
                <MIcon name="pin" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T variant="bodyStrong" weight="700" numberOfLines={2} color={isSelected ? tone.fg : "text"}>
                  {item.title}
                </T>
                {first ? (
                  <T variant="small" color="muted" numberOfLines={1}>
                    {first}
                  </T>
                ) : null}
                <Row justify="space-between" gap={8} style={{ marginTop: 2 }}>
                  <Row gap={5}>
                    <Icon name="calendar" size={11} color={c.textFaint} />
                    <T variant="caption" color="faint">
                      {noticeTimeAgo(item.createdAt)}
                    </T>
                  </Row>
                  <Row gap={8}>
                    {!item.isActive ? <Badge label="ARCHIVED" tone="neutral" /> : null}
                    {isSelected ? <Icon name="check-circle" size={15} color={tone.fg} /> : null}
                  </Row>
                </Row>
              </View>
            </Pressable>
          );
        }}
      />

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Official Announcement">
        {openNotice ? (
          <>
            <View style={{ gap: 8 }}>
              {!openNotice.isActive ? <Badge label="ARCHIVED" tone="neutral" /> : null}
              <T variant="h1" selectable accessibilityRole="header">
                {openNotice.title}
              </T>
              <Row gap={8}>
                <Icon name="calendar" size={14} color={c.primary} />
                <T variant="small" color="muted" style={{ flex: 1 }}>
                  {formatFull(openNotice.createdAt)}
                </T>
              </Row>
            </View>

            <View style={{ gap: 16 }}>
              {paragraphsOf(openNotice).map((paragraph, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ width: 4, borderRadius: 2, backgroundColor: detailTone.solid, opacity: 0.3 }} />
                  <T selectable style={{ flex: 1, fontSize: 14.5, lineHeight: 23 }}>
                    {paragraph}
                  </T>
                </View>
              ))}
            </View>

            {openNotice.bottomQuote ? (
              <View style={{ flexDirection: "row", gap: 10, padding: 16, borderRadius: 16, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.border, marginTop: 8 }}>
                <MIcon name="format-quote-open" size={22} color={c.primary} />
                <T variant="bodyStrong" color="primary" style={{ flex: 1, fontSize: 14.5, lineHeight: 22, fontStyle: "italic" }}>
                  {openNotice.bottomQuote}
                </T>
              </View>
            ) : null}

            {openNotice.signOff ? (
              <Row gap={12} style={{ paddingHorizontal: 4 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>F</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {signOffParts.map((part, idx) => (
                    <T key={idx} variant={idx === 0 ? "small" : "bodyStrong"} color={idx === 0 ? "faint" : "primary"} weight={idx === 0 ? undefined : "700"}>
                      {part.trim()}
                      {idx === 0 && signOffParts.length > 1 ? "," : ""}
                    </T>
                  ))}
                </View>
              </Row>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
