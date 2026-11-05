import React from "react";
import { View } from "react-native";

import { Banner, Button, Skeleton, StatTile, TileGrid } from "@/ui";
import type { GradientName } from "@/theme/palette";

import type { ClassKpiStats } from "@/screens/teacher/classes/types";

type ItemKey = "totalClasses" | "inProgress" | "completed" | "teachingHours" | "totalPresent" | "totalAbsent";

const ITEMS: { key: ItemKey; label: string; gradient: GradientName }[] = [
  { key: "totalClasses", label: "Total Classes", gradient: "blue" },
  { key: "inProgress", label: "In Progress", gradient: "amber" },
  { key: "completed", label: "Completed", gradient: "emerald" },
  { key: "teachingHours", label: "Teaching Hours", gradient: "violet" },
  { key: "totalPresent", label: "Present", gradient: "sky" },
  { key: "totalAbsent", label: "Absent", gradient: "rose" },
];

function valueOf(stats: ClassKpiStats | null, key: ItemKey): string | number {
  if (!stats) return "—";
  if (key === "teachingHours") return stats.teachingHours ?? `${Math.round((stats.totalMins / 60) * 10) / 10}h`;
  return stats[key] ?? 0;
}

/** The six month figures at the top of the page */
export function KpiStrip({ stats, loading, error, onRetry }: { stats: ClassKpiStats | null; loading: boolean; error?: string; onRetry: () => void }) {
  if (loading) {
    return (
      <View accessibilityLabel="Loading" style={{ gap: 10 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Skeleton height={84} rounded={16} />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (error && !stats) {
    return (
      <Banner tone="danger" title="Could not load your class figures" message={error}>
        <Button title="Retry" icon="refresh-cw" size="sm" variant="outline" onPress={onRetry} />
      </Banner>
    );
  }

  return (
    <TileGrid columns={3} gap={10}>
      {ITEMS.map((item) => (
        <StatTile key={item.key} label={item.label} value={valueOf(stats, item.key)} gradient={item.gradient} style={{ minHeight: 84, padding: 12 }} />
      ))}
    </TileGrid>
  );
}
