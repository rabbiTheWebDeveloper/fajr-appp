import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import { apiRaw } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useAppForeground } from "@/lib/hooks";

const ENDPOINT = "/api/teacher-portal/onboarding";

/** One step of the "Get Started" checklist, as GET /api/teacher-portal/onboarding returns it in `data.steps` */
export interface OnboardingStepState {
  key: string;
  title: string;
  description: string;
  /** The website path of the page the step is done on */
  href: string;
  actionLabel: string;
  kind: "video" | "auto";
  /** Whether the dashboard stays hidden until this step is done */
  blocksDashboard: boolean;
  video?: { id: string; title: string };
  done: boolean;
  completedAt: string | null;
  /** Why the step cannot be finished right now, if that is so */
  hint?: string;
}

export interface OnboardingState {
  steps: OnboardingStepState[];
  completedCount: number;
  total: number;
  allDone: boolean;
  /** True once every step that blocks the dashboard is done */
  unlocked: boolean;
  completedAt: string | null;
  dismissed: boolean;
}

interface OnboardingReply {
  success?: boolean;
  data?: OnboardingState;
  message?: string;
}

/**
 * What the portal should show:
 *   checking - the checklist has not loaded yet
 *   locked   - steps that block the dashboard are still open: only the checklist and the pages the steps
 *              are done on are usable
 *   open     - everything is usable. This is also the answer when the checklist cannot be loaded, so a
 *              failed request never shuts a teacher out of their classes.
 */
export type DashboardGate = "checking" | "locked" | "open";

export interface TeacherOnboardingController {
  state: OnboardingState | null;
  loadError: string;
  busyKey: string | null;
  actionError: string;
  gate: DashboardGate;
  retry: () => void;
  /** Load the checklist again (steps are finished on other screens) */
  reload: () => void;
  clearActionError: () => void;
  /** Resolves true when the server accepted it */
  markWatched: (stepKey: string) => Promise<boolean>;
  dismiss: () => Promise<boolean>;
}

export function deriveGate(state: Pick<OnboardingState, "unlocked"> | null, loadError: string, hinted: boolean): DashboardGate {
  if (state) return state.unlocked ? "open" : "locked";
  return loadError || hinted ? "open" : "checking";
}

/**
 * The checklist's state for the whole teacher portal.
 *
 * Unlocking is permanent, so once it has been seen the phone remembers it (per account) and screens render
 * without waiting for the checklist request. The next reply corrects the hint if it is ever wrong.
 */
function useTeacherOnboarding(): TeacherOnboardingController {
  const { user } = useAuth();
  const hintKey = `fajr.teacher.onboardingUnlocked.${user?._id ?? ""}`;

  const [state, setState] = useState<OnboardingState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [hinted, setHinted] = useState(false);

  const mounted = useRef(true);
  // Once every step is done nothing can change, so there is nothing left to reload
  const finished = useRef(false);
  const inFlight = useRef(false);
  const again = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(hintKey)
      .then((saved) => {
        if (alive && saved === "1") setHinted(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hintKey]);

  const accept = useCallback(
    (data: OnboardingState) => {
      finished.current = data.allDone;
      (data.unlocked ? AsyncStorage.setItem(hintKey, "1") : AsyncStorage.removeItem(hintKey)).catch(() => {});
      setState(data);
    },
    [hintKey]
  );

  const load = useCallback(() => {
    if (finished.current) return;
    // A request is already on its way: run once more after it, so a step finished meanwhile is not missed
    // (unless it only just left, as when the portal opens and its first screen comes into view together)
    if (inFlight.current) {
      if (Date.now() - startedAt.current > 1000) again.current = true;
      return;
    }
    inFlight.current = true;
    startedAt.current = Date.now();

    const run = async (): Promise<void> => {
      try {
        const reply = await apiRaw<OnboardingReply>(ENDPOINT);
        if (!mounted.current) return;
        // 401: the app signs out centrally
        if (reply.status !== 401) {
          if (reply.data?.success && reply.data.data) {
            accept(reply.data.data);
            setLoadError("");
          } else {
            setLoadError(reply.data?.message || "Could not load your checklist.");
          }
        }
      } catch {
        if (mounted.current) setLoadError("Network error. Please try again.");
      }
      if (again.current && mounted.current && !finished.current) {
        again.current = false;
        return run();
      }
    };

    void run().finally(() => {
      inFlight.current = false;
      again.current = false;
    });
  }, [accept]);

  useEffect(() => {
    load();
  }, [load]);

  // The teacher may also finish a step on the website or another device
  useAppForeground(load);

  const send = useCallback(
    async (body: Record<string, string>, key: string): Promise<boolean> => {
      setBusyKey(key);
      setActionError("");
      try {
        const reply = await apiRaw<OnboardingReply>(ENDPOINT, { method: "POST", body });
        if (!mounted.current) return false;
        if (reply.data?.success && reply.data.data) {
          accept(reply.data.data);
          return true;
        }
        if (reply.status !== 401) setActionError(reply.data?.message || "Something went wrong. Please try again.");
      } catch {
        if (mounted.current) setActionError("Network error. Please try again.");
      } finally {
        if (mounted.current) setBusyKey(null);
      }
      return false;
    },
    [accept]
  );

  const retry = useCallback(() => {
    setLoadError("");
    load();
  }, [load]);

  const clearActionError = useCallback(() => setActionError(""), []);
  const markWatched = useCallback((stepKey: string) => send({ action: "complete-step", step: stepKey }, stepKey), [send]);
  const dismiss = useCallback(() => send({ action: "dismiss" }, "dismiss"), [send]);

  const gate = deriveGate(state, loadError, hinted);

  return useMemo(
    () => ({ state, loadError, busyKey, actionError, gate, retry, reload: load, clearActionError, markWatched, dismiss }),
    [state, loadError, busyKey, actionError, gate, retry, load, clearActionError, markWatched, dismiss]
  );
}

const TeacherOnboardingContext = createContext<TeacherOnboardingController | null>(null);

/** One copy of the checklist for the whole portal, so the dashboard, the More tiles and the page lock always agree */
export function TeacherOnboardingProvider({ children }: { children: React.ReactNode }) {
  const controller = useTeacherOnboarding();
  return <TeacherOnboardingContext.Provider value={controller}>{children}</TeacherOnboardingContext.Provider>;
}

export function useOnboarding(): TeacherOnboardingController {
  const controller = useContext(TeacherOnboardingContext);
  if (!controller) throw new Error("useOnboarding must be used inside TeacherShellProvider");
  return controller;
}

/**
 * Reloads the checklist each time the screen comes into view (the website reloads it on every page change),
 * since the steps are finished on other screens.
 */
export function useOnboardingReloadOnFocus(): void {
  const { reload } = useOnboarding();
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
}
