import React from "react";
import { View } from "react-native";

import { Card, ErrorState, Skeleton } from "@/ui";

/** What shows while the dashboard loads: the same shapes the real sections will take, so nothing jumps. */
export function DashboardSkeleton() {
  return (
    <View accessibilityLabel="Loading your dashboard" style={{ gap: 16 }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: 12 }}>
          <Skeleton height={132} rounded={16} style={{ flex: 1 }} />
          <Skeleton height={132} rounded={16} style={{ flex: 1 }} />
        </View>
      ))}
      <Skeleton height={240} rounded={16} />
      <Skeleton height={150} rounded={16} />
      <Skeleton height={76} rounded={16} />
      <Skeleton height={210} rounded={16} />
    </View>
  );
}

/** What shows when the dashboard could not be loaded, with a way to try again. */
export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card padding={0}>
      <ErrorState title="We could not load your dashboard" message="Please check your internet connection and try again." onRetry={onRetry} />
    </Card>
  );
}
