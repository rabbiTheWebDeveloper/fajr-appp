import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { api, apiRaw } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

/** The signed-in student's profile, as GET /api/student-portal/profile returns it in `student` */
export interface StudentProfile {
  _id?: string;
  fullName: string;
  studentId: string;
  avatar?: string | null;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface StudentValue {
  student: StudentProfile | null;
  studentLoading: boolean;
  /** Fetch the profile again (after the settings screen saves a change) */
  refreshStudent: () => Promise<void>;
}

const StudentContext = createContext<StudentValue>({ student: null, studentLoading: true, refreshStudent: async () => {} });

export function useStudent(): StudentValue {
  return useContext(StudentContext);
}

const POLL_MS = 60_000;

/**
 * Loads the student's profile once for the whole portal and keeps it fresh (every minute while the app is open,
 * and when the app comes back to the front), like the website's layout does. A 401 ends the session centrally.
 */
export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { updateUser } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  const alive = useRef(true);

  const refreshStudent = useCallback(async () => {
    try {
      const data = await api.get<{ success?: boolean; student?: StudentProfile }>("/api/student-portal/profile");
      if (!alive.current) return;
      if (data.success && data.student) {
        setStudent(data.student);
        updateUser({ fullName: data.student.fullName, avatar: data.student.avatar ?? null, studentId: data.student.studentId });
      }
    } catch {
      // Offline or a server hiccup: keep what we have
    } finally {
      if (alive.current) setStudentLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    alive.current = true;
    void refreshStudent();
    // Visit tracking, as the website does on opening the portal (fire and forget)
    apiRaw("/api/track-visit", { method: "POST", body: {} }).catch(() => {});

    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refreshStudent();
    }, POLL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshStudent();
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshStudent]);

  const value = useMemo(() => ({ student, studentLoading, refreshStudent }), [student, studentLoading, refreshStudent]);
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}
