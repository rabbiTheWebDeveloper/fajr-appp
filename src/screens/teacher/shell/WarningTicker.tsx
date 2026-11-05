import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { useTheme } from "@/theme/ThemeContext";

/** The rule every teacher must follow. Shown on every page of the teacher portal. */
export const TEACHER_WARNING =
  "নির্ধারিত সময়ে ক্লাস নিতে হবে এবং ERP-তে সঠিকভাবে ক্লাস Create ও End করতে হবে। ক্লাস না নিলে বেতনের ওপর প্রভাব পড়বে। তাই সবাইকে নিয়ম মেনে ERP মেইনটেইন করতে হবে এবং প্রতিটি ক্লাসের রিপোর্ট ERP-তে দিতে হবে।";

// Keep "ERP-তে" in one piece (a word joiner after the hyphen) so it never breaks between the hyphen and the ending
const WARNING_TEXT = TEACHER_WARNING.replace(/ERP-তে/g, "ERP-⁠তে");

// How far the text sways to each side; the side padding is wider so no letter is cut off
const SWAY = 12;

/**
 * A red warning strip. The whole message is always on screen, wrapped to the width of the phone, and floats gently
 * left and right. With "reduce motion" switched on in the phone's settings it stays still.
 */
export function WarningTicker() {
  const { c } = useTheme();
  const sway = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled || reduced) return;
        const ease = Easing.inOut(Easing.ease);
        // Left to right and back, 2.4 s each way, as on the website
        sway.setValue(-1);
        loop = Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(sway, { toValue: 1, duration: 2400, easing: ease, useNativeDriver: true }),
              Animated.timing(sway, { toValue: -1, duration: 2400, easing: ease, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
              Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
          ),
        ]);
        loop.start();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [sway, pulse]);

  return (
    <View
      accessible
      accessibilityLabel={`Warning. ${TEACHER_WARNING}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, borderTopWidth: 2, borderBottomWidth: 2, borderColor: c.danger, backgroundColor: c.dangerSoft, overflow: "hidden" }}
    >
      <Animated.View style={{ marginLeft: 8, opacity: pulse }}>
        <Feather name="alert-triangle" size={20} color={c.danger} />
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 16, overflow: "hidden" }}>
        <Animated.Text
          style={{ color: c.danger, fontSize: 13, lineHeight: 20, fontWeight: "800", textAlign: "center", transform: [{ translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: [-SWAY, SWAY] }) }] }}
        >
          {WARNING_TEXT}
        </Animated.Text>
      </View>
    </View>
  );
}
