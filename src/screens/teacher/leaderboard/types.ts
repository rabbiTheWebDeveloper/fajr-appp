export type Timeframe = "today" | "7days" | "previousMonth";

/** One teacher in GET /api/teacher-portal/teacher-leaderboard */
export interface TeacherEntry {
  _id: string;
  rank: number;
  fullName: string;
  avatar: string | null;
  gender?: string;
  teacherId?: string;
  designation?: string;
  status?: string;
  /** Average student rating, 0–5 */
  rating: number;
  totalSessions: number;
  completedSessions: number;
  /** 0–100 */
  completionRate: number;
  /** Students currently assigned to the teacher */
  studentCount: number;
  presentStudents: number;
  /** 0–100: 60% class completion + 25% students + 15% rating (+5 bonus at 90% completion) */
  score: number;
  totalGems: number;
  monthlyGems: number;
  /** Gems earned inside the chosen period */
  periodGems?: number;
  tierName?: string;
  tierEmoji?: string;
  tierLabel?: string;
  isMe: boolean;
}

export interface LeaderboardReply {
  success: boolean;
  message?: string;
  timeframe?: string;
  periodLabel?: string;
  periodSubtitle?: string;
  /** The top ten of the period */
  teacherLeaderboard?: TeacherEntry[];
  myRank?: number | null;
  /** The signed-in teacher's own entry, also when outside the top ten */
  myEntry?: TeacherEntry | null;
  totalTeachers?: number;
}

/** The page's wording for each period */
export const TIMEFRAME_COPY: Record<
  Timeframe,
  { subtitle: string; rankTitle: string; rankLabel: string; podiumTitle: string; tableTitle: string; gemsPeriod: string; formula: string }
> = {
  today: {
    subtitle: "Today's top 10 best performing teachers",
    rankTitle: "Your Today Ranking",
    rankLabel: "Today's Rank",
    podiumTitle: "Today's Top 3 Teachers",
    tableTitle: "Today's Top 10 Teachers",
    gemsPeriod: "today",
    formula: "Today's Formula",
  },
  "7days": {
    subtitle: "Top 10 best performing teachers in the last 7 days",
    rankTitle: "Your Last 7-Day Ranking",
    rankLabel: "7-Day Rank",
    podiumTitle: "Last 7 Days Top 3 Teachers",
    tableTitle: "Last 7 Days Top 10 Teachers",
    gemsPeriod: "last 7d",
    formula: "7 Days Formula",
  },
  previousMonth: {
    subtitle: "Top 10 best performing teachers of the previous month",
    rankTitle: "Your Previous Month Ranking",
    rankLabel: "Prev. Month Rank",
    podiumTitle: "Previous Month Top 3 Champions",
    tableTitle: "Previous Month Best Top 10 Teachers",
    gemsPeriod: "monthly",
    formula: "Monthly Formula",
  },
};

/** Gems of the period ("+12", "-3"); older replies only carry the monthly number */
export function gemsText(entry: TeacherEntry): string {
  const gems = entry.periodGems ?? entry.monthlyGems ?? 0;
  return `${gems >= 0 ? "+" : ""}${gems}`;
}
