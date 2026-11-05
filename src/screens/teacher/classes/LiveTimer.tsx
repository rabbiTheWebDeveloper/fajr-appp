import React from "react";
import { Text, View } from "react-native";

import { useNow } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { ProgressRing, T } from "@/ui";

const fmt = (n: number) => String(n).padStart(2, "0");

/**
 * The countdown ring of a running class. It is worked out from the server's `startedAt` each second,
 * so it is still right after the app was closed and reopened. (The server keeps no pause log, so a
 * paused class keeps counting, exactly as on the website.)
 */
export function LiveTimer({ startedAt, duration = 45 }: { startedAt: string; duration?: number }) {
  const { c } = useTheme();
  const now = useNow(1000);

  const target = duration * 60;
  const started = new Date(startedAt).getTime();
  const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((now.getTime() - started) / 1000)) : 0;
  const remaining = Math.max(target - elapsed, 0);
  const pct = target > 0 ? Math.min((elapsed / target) * 100, 100) : 100;
  const over = elapsed > target;
  const color = over ? c.danger : c.primary;

  return (
    <View style={{ alignItems: "center", gap: 2 }} accessibilityLabel={over ? "Class time is up" : `${Math.ceil(remaining / 60)} minutes left`}>
      <ProgressRing percent={pct} size={58} strokeWidth={5} color={color}>
        <Text style={{ color: over ? c.dangerText : c.primaryText, fontSize: 11, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
          {over ? `+${fmt(Math.floor((elapsed - target) / 60))}:${fmt((elapsed - target) % 60)}` : `${fmt(Math.floor(remaining / 60))}:${fmt(remaining % 60)}`}
        </Text>
      </ProgressRing>
      <T variant="caption" color={over ? "danger" : "faint"}>
        {over ? "Time up!" : "left"}
      </T>
    </View>
  );
}
