import React, { useCallback, useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { Chip, type IconName, type ScrollViewRef } from "@/ui";

interface TabStripProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; icon?: IconName }[];
}

/**
 * The page's tabs as a row of pills that scrolls sideways, so the long tab names stay whole on a phone
 * (the website scrolls its tab row the same way). The chosen tab is brought into view, which matters when
 * the screen opens straight on a later tab.
 */
export function TabStrip<V extends string>({ value, onChange, options }: TabStripProps<V>) {
  const scroller = useRef<ScrollViewRef>(null);
  const offsets = useRef(new Map<string, number>());

  const reveal = useCallback((key: string) => {
    const x = offsets.current.get(key);
    if (x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, []);

  useEffect(() => {
    reveal(value);
  }, [value, reveal]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      // Bleeds to the screen edges inside the padded page
      style={{ marginHorizontal: -16, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {options.map((option) => (
        <View
          key={option.value}
          onLayout={(event) => {
            offsets.current.set(option.value, event.nativeEvent.layout.x);
            if (option.value === value) reveal(option.value);
          }}
        >
          <Chip
            label={option.label}
            icon={option.icon}
            selected={option.value === value}
            onPress={() => {
              tapFeedback();
              onChange(option.value);
            }}
            style={{ height: 40 }}
          />
        </View>
      ))}
    </ScrollView>
  );
}
