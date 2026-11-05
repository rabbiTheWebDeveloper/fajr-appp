import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api, errorMessage } from "@/api/client";

type Params = Record<string, string | number | boolean | null | undefined>;

interface UseFetchOptions<T> {
  /** Skip loading while false (e.g. until a required id is known) */
  enabled?: boolean;
  /** Reload every N milliseconds while the screen is on show */
  pollMs?: number;
  /** Reload quietly each time the screen comes back into view (default true) */
  refetchOnFocus?: boolean;
  /** Called with each successful reply */
  onData?: (data: T) => void;
}

export interface FetchState<T> {
  data: T | null;
  /** True during the first load (show a skeleton) */
  loading: boolean;
  /** True during a pull-to-refresh */
  refreshing: boolean;
  /** A message fit to show, or "" */
  error: string;
  /** Pull-to-refresh: reload and show the refresh spinner */
  refresh: () => Promise<void>;
  /** Reload quietly, keeping what is on screen (after saving something) */
  reload: () => Promise<void>;
  /** Start over with the skeleton (the Retry button) */
  retry: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Loads a GET endpoint and tracks the three states every screen must show (loading, error, data).
 *
 *   const { data, loading, error, refreshing, refresh, retry } = useFetch<Reply>("/api/student-portal/payments", { month });
 *   if (loading) return <Screen><SkeletonList /></Screen>;
 *   if (error && !data) return <Screen><ErrorState message={error} onRetry={retry} /></Screen>;
 *
 * Changing `path` or `params` loads again. Pass `path = null` to wait.
 */
export function useFetch<T = any>(path: string | null, params?: Params, options: UseFetchOptions<T> = {}): FetchState<T> {
  const { enabled = true, pollMs, refetchOnFocus = true, onData } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path && enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const paramsKey = JSON.stringify(params ?? {});
  const requestId = useRef(0);
  const mounted = useRef(true);
  const hasData = useRef(false);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!path || !enabled) return;
      const id = ++requestId.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        const reply = await api.get<T>(path, JSON.parse(paramsKey) as Params);
        if (!mounted.current || id !== requestId.current) return;
        hasData.current = true;
        setData(reply);
        setError("");
        onDataRef.current?.(reply);
      } catch (e) {
        if (!mounted.current || id !== requestId.current) return;
        // A quiet background reload that fails keeps what is on screen
        if (mode !== "silent" || !hasData.current) setError(errorMessage(e));
      } finally {
        if (mounted.current && id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path, enabled, paramsKey]
  );

  // First load, and again whenever the path or parameters change
  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false);
      return;
    }
    hasData.current = false;
    void run("initial");
  }, [path, enabled, paramsKey, run]);

  // Quiet reload on return to the screen
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
      } else if (refetchOnFocus) {
        void run("silent");
      }
      if (!pollMs) return undefined;
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void run("silent");
      }, pollMs);
      return () => clearInterval(timer);
    }, [run, refetchOnFocus, pollMs])
  );

  const refresh = useCallback(() => run("refresh"), [run]);
  const reload = useCallback(() => run("silent"), [run]);
  const retry = useCallback(() => {
    void run("initial");
  }, [run]);

  return { data, loading, refreshing, error, refresh, reload, retry, setData };
}

/** A value that only changes after the person stops typing: for search boxes */
export function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Re-renders on a timer and returns the current time: for live clocks and countdowns */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Runs the callback whenever the app returns to the foreground */
export function useAppForeground(callback: () => void): void {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") saved.current();
    });
    return () => subscription.remove();
  }, []);
}
