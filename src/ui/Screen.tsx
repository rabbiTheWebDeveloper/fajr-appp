import React, { createContext, useContext } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeContext";

/** The type of a ref to a ScrollView (React Native 0.88 separates the component from its instance) */
export type ScrollViewRef = React.ComponentRef<typeof ScrollView>;

/** True for screens shown inside the bottom tab bar (set by the navigators) */
export const InTabsContext = createContext(false);

/** Whether the current screen sits above the bottom tab bar */
export function useInTabs(): boolean {
  return useContext(InTabsContext);
}

interface ScreenProps {
  children?: React.ReactNode;
  /** Pull-to-refresh: pass the reload function and whether a refresh is in flight */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Set false when the screen's own FlatList does the scrolling */
  scroll?: boolean;
  /** Page padding (16) and the gap between children (16). Set false for edge-to-edge layouts. */
  padded?: boolean;
  /** Pinned under the scrolling area (a primary action bar) */
  footer?: React.ReactNode;
  /** Pinned above the scrolling area (tabs, filters) */
  header?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** const ref = useRef<ScrollViewRef>(null) … ref.current?.scrollTo({ y: 0 }) */
  scrollRef?: React.Ref<ScrollViewRef>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "refreshControl" | "ref">;
}

/**
 * The page container every screen starts with: themed background, padding, vertical scrolling,
 * pull-to-refresh and keyboard avoidance. The navy app bar above it comes from the navigator.
 */
export function Screen({ children, onRefresh, refreshing = false, scroll = true, padded = true, footer, header, contentStyle, style, scrollRef, scrollProps }: ScreenProps) {
  const { c } = useTheme();
  const safe = useSafeAreaInsets();
  // Inside the tab bar the bar itself already covers the bottom safe area
  const inTabs = useContext(InTabsContext);
  const insets = { bottom: inTabs ? 0 : safe.bottom };
  const padding: ViewStyle = padded ? { padding: 16, gap: 16 } : {};

  return (
    // The app draws edge to edge, so Android does not shrink the window for the keyboard: the page pads itself instead
    <KeyboardAvoidingView behavior={Platform.OS === "web" ? undefined : "padding"} style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      {header}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[padding, { paddingBottom: (padded ? 16 : 0) + 24 + (footer ? 0 : insets.bottom) }, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} colors={[c.primary]} tintColor={c.primary} progressBackgroundColor={c.surface} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}
