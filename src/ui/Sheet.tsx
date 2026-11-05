import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeContext";
import { IconButton, T } from "@/ui/core";
import { ToastHost } from "@/ui/toast";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Buttons pinned under the scrolling content */
  footer?: React.ReactNode;
  /** Set false when the content brings its own scrolling list (e.g. a FlatList) */
  scroll?: boolean;
  /** Take (almost) the whole screen: for long forms and detail views */
  full?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A bottom sheet: the app's stand-in for the website's modals and dialogs.
 * It slides up, dims the page behind it, moves above the keyboard, and closes on the back button or a tap outside.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer, scroll = true, full, contentStyle }: SheetProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "web" ? undefined : "padding"} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: full ? "94%" : "88%",
            height: full ? "94%" : undefined,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderColor: c.border,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
          </View>
          {title ? (
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 18, paddingRight: 8, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <View style={{ flex: 1 }}>
                <T variant="h2" numberOfLines={2}>
                  {title}
                </T>
                {subtitle ? (
                  <T variant="small" color="muted">
                    {subtitle}
                  </T>
                ) : null}
              </View>
              <IconButton icon="x" onPress={onClose} accessibilityLabel="Close" />
            </View>
          ) : null}
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: 18, gap: 14 }, contentStyle]} style={{ flexGrow: 0, flexShrink: 1 }}>
              {children}
            </ScrollView>
          ) : (
            <View style={[{ flexShrink: 1, flexGrow: full ? 1 : 0 }, contentStyle]}>{children}</View>
          )}
          {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
      {/* Pop-up messages raised while the sheet is open show above it */}
      {visible ? <ToastHost /> : null}
    </Modal>
  );
}
