import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Platform, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeContext";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

// One host at the root of the app plus one inside each open bottom sheet (a sheet is a separate window on
// Android and would cover the root host). The host mounted last is the one on top, so it shows the message.
const hosts: ((item: ToastItem) => void)[] = [];
let counter = 0;

function show(kind: ToastKind, message: string) {
  if (!message) return;
  hosts[hosts.length - 1]?.({ id: ++counter, kind, message });
}

/**
 * Short pop-up messages, callable from anywhere:
 *
 *   toast.success("Saved");   toast.error(errorMessage(e));   toast.info("Copied");
 */
export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};

/** Mounted at the root of the app, and by Sheet inside every open bottom sheet */
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const host = (next: ToastItem) => {
      if (timer.current) clearTimeout(timer.current);
      setItem(next);
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(
        () => {
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
            if (finished) setItem((current) => (current?.id === next.id ? null : current));
          });
        },
        next.kind === "error" ? 4200 : 2600
      );
    };
    hosts.push(host);
    return () => {
      const index = hosts.indexOf(host);
      if (index >= 0) hosts.splice(index, 1);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  if (!item) return null;

  const look = {
    success: { bg: c.success, icon: "check-circle" as const },
    error: { bg: c.danger, icon: "alert-circle" as const },
    info: { bg: c.navy, icon: "info" as const },
  }[item.kind];

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: insets.top + 10, alignItems: "center", zIndex: 9999, elevation: 30 }}>
      <Animated.View style={{ opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }], maxWidth: 520, marginHorizontal: 16 }}>
        <Pressable
          onPress={() => setItem(null)}
          accessibilityRole="alert"
          style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: look.bg, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}
        >
          <Feather name={look.icon} size={18} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "600", flexShrink: 1 }}>{item.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Paints the confirm button red (delete, cancel a class, sign out…) */
  destructive?: boolean;
}

/** A yes/no question in the phone's own dialog. Resolves true when confirmed. */
export function confirmAsync({ title, message, confirmText = "Confirm", cancelText = "Cancel", destructive }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    const ask = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(ask ? ask(message ? `${title}\n\n${message}` : title) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
