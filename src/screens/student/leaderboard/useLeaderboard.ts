import { useCallback, useEffect, useRef, useState } from "react";

import { apiRaw, errorMessage } from "@/api/client";
import type { LeaderboardEntry, LeaderboardReply } from "@/screens/student/leaderboard/shared";
import { useStudent } from "@/screens/student/StudentContext";
import { toast } from "@/ui";

interface LeaderboardState {
  leaderboard: LeaderboardEntry[];
  totalStudents: number;
  /** True during the first load (show a skeleton) */
  loading: boolean;
  refreshing: boolean;
  /** Set only when nothing could be shown at all */
  error: string;
  refresh: () => void;
  retry: () => void;
}

/**
 * Loads the leaderboard the way the website's page does: once on opening, and again on Refresh.
 *
 * The page calls the teacher portal's route, which answers 401 "Unauthorized" to every account that is not
 * a teacher. The website shows its empty state in that case, and so does the app. That 401 must not be read as
 * "the session ended" (the app would sign the student out), so the call keeps the session and the student's
 * own profile is re-checked instead: if the session really is over, that check signs out as usual.
 */
export function useLeaderboard(): LeaderboardState {
  const { refreshStudent } = useStudent();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const alive = useRef(true);
  const answered = useRef(false);
  const checkSession = useRef(refreshStudent);
  checkSession.current = refreshStudent;

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setLoading(true);
      setError("");
    } else {
      setRefreshing(true);
    }
    // A failed refresh keeps what is on screen and says so in a toast
    const fail = (message: string) => {
      if (answered.current) toast.error(message);
      else setError(message);
    };
    try {
      const reply = await apiRaw<LeaderboardReply>("/api/teacher-portal/leaderboard", { keepSessionOn401: true });
      if (!alive.current) return;
      if (reply.ok && reply.data?.success) {
        answered.current = true;
        setLeaderboard(reply.data.leaderboard ?? []);
        setTotalStudents(reply.data.totalStudents ?? 0);
        setError("");
      } else if (reply.status === 401) {
        answered.current = true;
        setError("");
        void checkSession.current();
      } else {
        fail(reply.data?.message?.trim() || "The leaderboard could not be loaded. Please try again.");
      }
    } catch (e) {
      if (alive.current) fail(errorMessage(e));
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load("initial");
    return () => {
      alive.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => void load("refresh"), [load]);
  const retry = useCallback(() => void load("initial"), [load]);

  return { leaderboard, totalStudents, loading, refreshing, error, refresh, retry };
}
