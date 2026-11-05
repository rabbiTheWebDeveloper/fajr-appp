import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { apiRaw } from "@/api/client";

export interface InboxItem {
  _id: string;
  title: string;
  body: string;
  url: string;
  category: "class" | "notice" | "payment" | "support" | "system";
  createdAt: string;
  read: boolean;
}

interface NotificationsValue {
  items: InboxItem[];
  unread: number;
  loading: boolean;
  failed: boolean;
  /** The server has no inbox for this account (or does not have the feature yet): hide the bell */
  hidden: boolean;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
}

const POLL_MS = 60_000;
const PAGE = 20;

const NotificationsContext = createContext<NotificationsValue | null>(null);

interface InboxReply {
  success?: boolean;
  items?: InboxItem[];
  unread?: number;
  hasMore?: boolean;
}

/** The signed-in student's or teacher's own notification inbox, refreshed every minute while the app is open */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const alive = useRef(true);
  const hiddenRef = useRef(false);

  const reload = useCallback(async () => {
    if (hiddenRef.current) return;
    try {
      const reply = await apiRaw<InboxReply>("/api/portal-notifications", { params: { limit: PAGE } });
      if (!alive.current) return;
      if (reply.status === 403 || reply.status === 404) {
        hiddenRef.current = true;
        setHidden(true);
        return;
      }
      if (!reply.ok || !reply.data) throw new Error(String(reply.status));
      setItems(reply.data.items ?? []);
      setUnread(reply.data.unread ?? 0);
      setHasMore(!!reply.data.hasMore);
      setFailed(false);
    } catch {
      if (alive.current) setFailed(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const last = items[items.length - 1];
    if (!last || !hasMore) return;
    try {
      const reply = await apiRaw<InboxReply>("/api/portal-notifications", { params: { limit: PAGE, before: last._id } });
      if (!alive.current || !reply.ok || !reply.data) return;
      const more = reply.data.items ?? [];
      setItems((current) => [...current, ...more.filter((n) => !current.some((existing) => existing._id === n._id))]);
      setHasMore(!!reply.data.hasMore);
    } catch {
      // Stay on what is loaded
    }
  }, [items, hasMore]);

  useEffect(() => {
    alive.current = true;
    void reload();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void reload();
    }, POLL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [reload]);

  const send = useCallback(async (body: { ids: string[] } | { all: true }) => {
    try {
      const reply = await apiRaw<{ unread?: number }>("/api/portal-notifications", { method: "PATCH", body });
      if (alive.current && reply.ok && typeof reply.data?.unread === "number") setUnread(reply.data.unread);
    } catch {
      // The next refresh puts the real numbers back
    }
  }, []);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const fresh = items.filter((n) => ids.includes(n._id) && !n.read).length;
      if (fresh) setUnread((n) => Math.max(0, n - fresh));
      setItems((list) => list.map((n) => (ids.includes(n._id) ? { ...n, read: true } : n)));
      void send({ ids });
    },
    [send, items]
  );

  const markAllRead = useCallback(() => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    void send({ all: true });
  }, [send]);

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread, loading, failed, hidden, hasMore, reload, loadMore, markRead, markAllRead }),
    [items, unread, loading, failed, hidden, hasMore, reload, loadMore, markRead, markAllRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationsProvider");
  return value;
}
