import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useAppForeground } from "@/lib/hooks";
import { useTheme } from "@/theme/ThemeContext";
import { Icon, Sheet, T } from "@/ui";

/** The active notice, as GET /api/teacher-portal/active-notice returns it in `notice` */
interface Notice {
  _id: string;
  title: string;
  content: string[];
  bottomQuote?: string;
  signOff?: string;
  /** "10s" = the close button appears after 10 seconds; "10d" = once closed, stay away for 10 days */
  modalDuration?: string;
}

interface DismissedNotice {
  id: string;
  expiry: number | null;
}

/** Reads "10s" / "3d" style durations; 0 when the text is not in that unit */
function durationIn(unit: "s" | "d", duration: string | undefined): number {
  const text = duration || "";
  if (!text.endsWith(unit)) return 0;
  const amount = parseInt(text.replace(unit, ""), 10);
  return !Number.isNaN(amount) && amount > 0 ? amount : 0;
}

/**
 * The pop-up for the academy's active notice. It shows when the portal opens (and when the app returns to the
 * front) unless this teacher already closed that notice on this phone. A notice with a seconds duration cannot
 * be closed until the countdown ends; one with a days duration comes back after that many days.
 */
export function NoticeModal() {
  const { c } = useTheme();
  const { user } = useAuth();
  const storageKey = `fajr.teacher.dismissedNotice.${user?._id ?? ""}`;

  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCloseBtn, setShowCloseBtn] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const openRef = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fetchNotice = useCallback(async () => {
    if (openRef.current) return;
    try {
      const data = await api.get<{ success?: boolean; notice?: Notice | null }>("/api/teacher-portal/active-notice");
      if (!alive.current || openRef.current || !data.success || !data.notice) return;
      const activeNotice = data.notice;

      let shouldShow = true;
      const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<DismissedNotice>;
          if (parsed.id === activeNotice._id && (!parsed.expiry || parsed.expiry > Date.now())) shouldShow = false;
        } catch {
          shouldShow = true;
        }
      }
      if (!alive.current || !shouldShow) return;

      openRef.current = true;
      setNotice(activeNotice);
      setIsOpen(true);

      // A seconds duration delays the close button
      const seconds = durationIn("s", activeNotice.modalDuration);
      setShowCloseBtn(seconds === 0);
      setCountdown(seconds);
    } catch {
      // No notice this time: the portal works without it
    }
  }, [storageKey]);

  useEffect(() => {
    void fetchNotice();
  }, [fetchNotice]);

  // The app can stay open for days; coming back to it is this app's version of reloading the page
  useAppForeground(() => void fetchNotice());

  useEffect(() => {
    if (!isOpen || showCloseBtn) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowCloseBtn(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, showCloseBtn]);

  const handleClose = () => {
    if (!showCloseBtn) return; // not closable until the countdown ends

    if (notice) {
      const days = durationIn("d", notice.modalDuration);
      const dismissed: DismissedNotice = { id: notice._id, expiry: days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : null };
      AsyncStorage.setItem(storageKey, JSON.stringify(dismissed)).catch(() => {});
    }
    openRef.current = false;
    setIsOpen(false);
  };

  if (!notice) return null;

  const paragraphs = Array.isArray(notice.content) ? notice.content : [String(notice.content ?? "")];
  const signOffParts = notice.signOff ? notice.signOff.split(",") : [];

  return (
    <Sheet visible={isOpen} onClose={handleClose}>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.warningSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={34} color={c.warning} />
        </View>

        <View style={{ position: "absolute", top: 0, right: 0 }}>
          {showCloseBtn ? (
            <Pressable onPress={handleClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close Notice" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.danger, alignItems: "center", justifyContent: "center" }}>
              <Icon name="x" size={18} color="#ffffff" />
            </Pressable>
          ) : (
            <View accessibilityLabel={`You can close this notice in ${countdown} seconds`} style={{ minWidth: 40, height: 36, paddingHorizontal: 8, borderRadius: 18, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
              <T variant="smallStrong" color="muted">
                {countdown}s
              </T>
            </View>
          )}
        </View>
      </View>

      <T variant="h1" center>
        {notice.title}
      </T>

      <View style={{ gap: 12 }}>
        {paragraphs.map((paragraph, idx) => (
          <T key={idx} color="muted" style={{ fontSize: 14.5, lineHeight: 23 }}>
            {paragraph}
          </T>
        ))}
      </View>

      {notice.bottomQuote || notice.signOff ? (
        <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border, gap: 10 }}>
          {notice.bottomQuote ? <T variant="bodyStrong">{notice.bottomQuote}</T> : null}
          {notice.signOff ? (
            <View>
              {signOffParts.map((part, idx) => (
                <T key={idx} variant={idx === 1 ? "bodyStrong" : "small"} color={idx === 1 ? "primary" : "muted"}>
                  {part.trim()}
                  {idx === 0 && signOffParts.length > 1 ? "," : ""}
                </T>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
