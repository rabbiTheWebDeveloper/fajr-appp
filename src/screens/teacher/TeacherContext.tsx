import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { api, apiRaw } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

/** The signed-in teacher's profile, as GET /api/teacher-portal/profile returns it in `teacher` */
export interface TeacherProfile {
  _id?: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  role?: string;
  teacherId?: string;
  [key: string]: unknown;
}

interface GemsSummary {
  totalGems: number;
  tierEmoji: string;
  tierName: string;
}

interface TeacherValue {
  profile: TeacherProfile | null;
  profileLoading: boolean;
  /** Fetch the profile again (after the settings screen saves a change) */
  refreshProfile: () => Promise<void>;
  /** Gems total and tier for the profile card; null until loaded */
  gems: GemsSummary | null;
  refreshGems: () => Promise<void>;
}

const TeacherContext = createContext<TeacherValue>({ profile: null, profileLoading: true, refreshProfile: async () => {}, gems: null, refreshGems: async () => {} });

export function useTeacher(): TeacherValue {
  return useContext(TeacherContext);
}

/** Loads the teacher's profile and gems once for the whole portal; refreshes when the app returns to the front */
export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [gems, setGems] = useState<GemsSummary | null>(null);
  const alive = useRef(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.get<{ success?: boolean; teacher?: TeacherProfile }>("/api/teacher-portal/profile");
      if (!alive.current) return;
      if (data.success && data.teacher) {
        setProfile(data.teacher);
        updateUser({ fullName: data.teacher.fullName ?? "", avatar: data.teacher.avatar ?? null, teacherId: data.teacher.teacherId });
      }
    } catch {
      // Offline or a server hiccup: the screens still render
    } finally {
      if (alive.current) setProfileLoading(false);
    }
  }, [updateUser]);

  const refreshGems = useCallback(async () => {
    try {
      const data = await api.get<{ success?: boolean; totalGems?: number; tier?: { emoji?: string; name?: string; label?: string } }>("/api/teacher-portal/gems");
      if (!alive.current || !data.success) return;
      setGems({ totalGems: data.totalGems ?? 0, tierEmoji: data.tier?.emoji ?? "🌱", tierName: data.tier?.name ?? data.tier?.label ?? "" });
    } catch {
      // The gems pill simply stays hidden
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refreshProfile();
    void refreshGems();
    // Visit tracking, as the website does on opening the portal (fire and forget)
    apiRaw("/api/track-visit", { method: "POST", body: {} }).catch(() => {});

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshProfile();
        void refreshGems();
      }
    });
    return () => {
      alive.current = false;
      subscription.remove();
    };
  }, [refreshProfile, refreshGems]);

  const value = useMemo(() => ({ profile, profileLoading, refreshProfile, gems, refreshGems }), [profile, profileLoading, refreshProfile, gems, refreshGems]);
  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}
