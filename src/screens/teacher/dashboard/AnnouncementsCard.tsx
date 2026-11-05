import React, { useState } from "react";
import { View } from "react-native";

import { timeAgo } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import type { Tone } from "@/theme/palette";
import { Badge, Button, Card, EmptyState, ErrorState, Row, SectionHeader, Skeleton, T } from "@/ui";

/** One active announcement for teachers, as GET /api/teacher-portal/announcements returns it in `announcements` */
export interface Announcement {
  _id: string;
  title: string;
  content: string;
  /** "Notice" | "Feature Update" | "System Update" | "Reminder" | "Important" | "Holiday" */
  tag?: string;
  createdAt?: string;
}

const TAG_TONES: Record<string, Tone> = {
  Notice: "info",
  "Feature Update": "primary",
  "System Update": "violet",
  Reminder: "warning",
  Important: "danger",
  Holiday: "success",
};

// How many announcements show before "Show all"
const PREVIEW = 3;

interface AnnouncementsCardProps {
  announcements: Announcement[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenNoticeBoard: () => void;
}

/** The academy's active announcements for teachers, newest first, with a shortcut to the notice board */
export function AnnouncementsCard({ announcements, loading, error, onRetry, onOpenNoticeBoard }: AnnouncementsCardProps) {
  const { c } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const list = announcements ?? [];
  const visible = showAll ? list : list.slice(0, PREVIEW);

  return (
    <Card style={{ gap: 12 }}>
      <SectionHeader title="Announcements" icon="bell" action={<Button title="Notice Board" iconRight="chevron-right" variant="ghost" size="sm" onPress={onOpenNoticeBoard} />} />

      {!announcements ? (
        loading ? (
          <View style={{ gap: 10 }} accessibilityLabel="Loading announcements">
            <Skeleton height={64} rounded={12} />
            <Skeleton height={64} rounded={12} />
          </View>
        ) : (
          <ErrorState compact title="Could not load announcements" message={error || "Please try again."} onRetry={onRetry} />
        )
      ) : list.length === 0 ? (
        <EmptyState compact icon="bell-off" tone="neutral" title="No announcements" message="New announcements from the academy will appear here." />
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map((item) => (
            <View key={item._id} style={{ gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt }}>
              <Row justify="space-between" gap={8}>
                <Badge label={item.tag || "Notice"} tone={TAG_TONES[item.tag ?? "Notice"] ?? "info"} />
                {item.createdAt ? (
                  <T variant="caption" color="faint">
                    {timeAgo(item.createdAt)}
                  </T>
                ) : null}
              </Row>
              <T variant="bodyStrong" weight="700">
                {item.title}
              </T>
              <T variant="small" color="muted" style={{ lineHeight: 18 }}>
                {item.content}
              </T>
            </View>
          ))}
          {list.length > PREVIEW ? (
            <Button title={showAll ? "Show less" : `Show all ${list.length}`} icon={showAll ? "chevron-up" : "chevron-down"} variant="secondary" size="sm" block onPress={() => setShowAll((v) => !v)} />
          ) : null}
        </View>
      )}
    </Card>
  );
}
