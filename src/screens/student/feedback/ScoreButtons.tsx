import React from "react";
import { Pressable, Text, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";

const SCORES = [1, 2, 3, 4, 5];

/** The 1-5 number buttons of one performance criterion: every button up to the chosen score is filled */
export function ScoreButtons({ label, value, onChange, disabled }: { label: string; value: number; onChange: (next: number) => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: 8 }}>
      {SCORES.map((score) => {
        const filled = score <= value;
        return (
          <Pressable
            key={score}
            disabled={disabled}
            onPress={() => {
              tapFeedback();
              onChange(score);
            }}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${score} out of 5`}
            accessibilityState={{ selected: score === value, disabled: !!disabled }}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: filled ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: filled ? c.primary : c.borderStrong,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: filled ? "#ffffff" : c.textMuted, fontSize: 14, fontWeight: "700" }}>{score}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
