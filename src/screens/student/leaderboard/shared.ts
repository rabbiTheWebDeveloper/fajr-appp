import type { Palette, Tone } from "@/theme/palette";

/** One student in the reply of GET /api/teacher-portal/leaderboard (attendance and sessions of the current month) */
export interface LeaderboardEntry {
  _id: string;
  rank: number;
  fullName: string;
  avatar: string | null;
  gender?: string | null;
  studentId?: string | null;
  studentNumber?: string | null;
  course?: string | null;
  status?: string | null;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  totalSessions: number;
  completedSessions: number;
  sessionPresent: number;
  sessionAbsent: number;
  sessionRate: number;
  score: number;
}

export interface LeaderboardReply {
  success: boolean;
  leaderboard?: LeaderboardEntry[];
  totalStudents?: number;
  message?: string;
}

export type SortColumn = "score" | "attendance" | "sessions";

export const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "attendance", label: "Attendance" },
  { key: "sessions", label: "Sessions" },
];

export function sortValue(entry: LeaderboardEntry, column: SortColumn): number {
  if (column === "score") return entry.score;
  if (column === "attendance") return entry.attendanceRate;
  return entry.sessionRate;
}

/** Green from 85, amber from 70, blue from 50, red below */
export function scoreColor(c: Palette, score: number): string {
  if (score >= 85) return c.success;
  if (score >= 70) return c.warning;
  if (score >= 50) return c.primary;
  return c.danger;
}

/** Green from 85%, amber from 70%, red below */
export function attendanceColor(c: Palette, rate: number): string {
  if (rate >= 85) return c.success;
  if (rate >= 70) return c.warning;
  return c.danger;
}

export function statusTone(status?: string | null): Tone {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "at-risk") return "danger";
  return "neutral";
}

/** Gold, silver and bronze, from the theme so they hold up in dark mode */
export function medalColor(c: Palette, rank: number): string {
  if (rank === 1) return c.gold;
  if (rank === 2) return c.textFaint;
  return c.warning;
}

export const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
