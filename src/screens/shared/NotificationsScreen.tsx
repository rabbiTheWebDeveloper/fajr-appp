import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { timeAgo } from "@/lib/format";
import { useNav } from "@/navigation/nav";
import { useNotifications, type InboxItem } from "@/notifications/NotificationsContext";
import { useTheme } from "@/theme/ThemeContext";
import type { Tone } from "@/theme/palette";
import { Button, EmptyState, ErrorState, IconChip, Row, SkeletonList, T, type IconName } from "@/ui";

const CATEGORY_LOOK: Record<InboxItem["category"], { icon: IconName; tone: Tone }> = {
  class: { icon: "calendar", tone: "primary" },
  notice: { icon: "volume-2", tone: "warning" },
  payment: { icon: "credit-card", tone: "success" },
  support: { icon: "life-buoy", tone: "info" },
  system: { icon: "info", tone: "neutral" },
};

/** The student's or teacher's own notifications: class alerts and notices from the academy */
export default function NotificationsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { user } = useAuth();
  const { items, unread, loading, failed, hasMore, reload, loadMore, markRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const open = (item: InboxItem) => {
    if (!item.read) markRead([item._id]);
    nav.openPath(item.url);
  };

  if (loading && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (failed && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorState title="Could not load your notifications" message="Check your internet connection and try again." onRetry={() => void refresh()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
      data={items}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} />}
      ListHeaderComponent={
        items.length > 0 ? (
          <Row justify="space-between" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <T variant="smallStrong" color="muted">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </T>
            <Row gap={4}>
              {unread > 0 ? <Button title="Mark all read" icon="check" variant="ghost" size="sm" onPress={markAllRead} /> : null}
              <Button title="Settings" icon="settings" variant="ghost" size="sm" onPress={() => nav.go(user?.role === "teacher" ? "TeacherSettings" : "StudentSettings", { tab: "notifications" })} />
            </Row>
          </Row>
        ) : undefined
      }
      ListEmptyComponent={<EmptyState icon="bell" title="You are all caught up" message="Class alerts and notices from the academy will show up here." />}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
      renderItem={({ item }) => {
        const look = CATEGORY_LOOK[item.category] ?? CATEGORY_LOOK.system;
        return (
          <Pressable
            onPress={() => open(item)}
            android_ripple={{ color: c.border }}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? "" : "Unread. "}${item.title}. ${item.body}`}
            style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: item.read ? c.surface : c.primarySoft }}
          >
            <IconChip icon={look.icon} tone={look.tone} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row justify="space-between" align="flex-start">
                <T variant={item.read ? "body" : "bodyStrong"} weight={item.read ? "500" : "700"} style={{ flex: 1 }}>
                  {item.title}
                </T>
                {!item.read ? <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 6 }} /> : null}
              </Row>
              {item.body ? (
                <T variant="small" color="muted" numberOfLines={3}>
                  {item.body}
                </T>
              ) : null}
              <T variant="caption" color="faint">
                {timeAgo(item.createdAt)}
              </T>
            </View>
          </Pressable>
        );
      }}
      ListFooterComponent={
        hasMore ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Button
              title="Load older"
              variant="secondary"
              size="sm"
              loading={loadingMore}
              style={{ alignSelf: "center" }}
              onPress={async () => {
                setLoadingMore(true);
                await loadMore();
                setLoadingMore(false);
              }}
            />
          </View>
        ) : undefined
      }
    />
  );
}
