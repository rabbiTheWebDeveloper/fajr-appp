/**
 * Every screen in the app, by name, and how the website's page addresses map onto them
 * (notifications and dashboard shortcuts arrive as website paths such as "/student/classes").
 */

export const STUDENT_TABS = ["StudentDashboard", "StudentClasses", "StudentTools", "StudentSchedule", "StudentMore"] as const;
export const STUDENT_PAGES = ["StudentPayments", "StudentCertificate", "StudentFeedback", "StudentLeaderboard", "StudentSettings"] as const;

export const TEACHER_TABS = ["TeacherDashboard", "TeacherClasses", "TeacherSchedule", "TeacherSalary", "TeacherMore"] as const;
export const TEACHER_PAGES = [
  "TeacherMonthlyReport",
  "TeacherStudents",
  "TeacherLearningMaterials",
  "TeacherHelpdesk",
  "TeacherCeoRequest",
  "TeacherLeaderboard",
  "TeacherAnnouncements",
  "TeacherSettings",
] as const;

export type StudentTabName = (typeof STUDENT_TABS)[number];
export type StudentPageName = (typeof STUDENT_PAGES)[number];
export type TeacherTabName = (typeof TEACHER_TABS)[number];
export type TeacherPageName = (typeof TEACHER_PAGES)[number];

/** Any screen that can be opened with useNav().go(...) */
export type RouteName = StudentTabName | StudentPageName | TeacherTabName | TeacherPageName | "Notifications";

export type RouteParams = Record<string, unknown> | undefined;

/** The navigator that holds the bottom tabs, inside each portal's stack */
export const STUDENT_TABS_HOST = "StudentTabs";
export const TEACHER_TABS_HOST = "TeacherTabs";

export function tabsHostFor(name: RouteName): string | null {
  if ((STUDENT_TABS as readonly string[]).includes(name)) return STUDENT_TABS_HOST;
  if ((TEACHER_TABS as readonly string[]).includes(name)) return TEACHER_TABS_HOST;
  return null;
}

export const ROUTE_TITLES: Record<RouteName, string> = {
  StudentDashboard: "Dashboard",
  StudentClasses: "My Classes",
  StudentTools: "Islamic Tools",
  StudentSchedule: "Schedule",
  StudentMore: "More",
  StudentPayments: "Payments",
  StudentCertificate: "Certificate",
  StudentFeedback: "Feedback",
  StudentLeaderboard: "Leaderboard",
  StudentSettings: "Settings",
  TeacherDashboard: "Dashboard",
  TeacherClasses: "My Classes",
  TeacherSchedule: "Schedule",
  TeacherSalary: "Salary",
  TeacherMore: "More",
  TeacherMonthlyReport: "Monthly Report",
  TeacherStudents: "My Students",
  TeacherLearningMaterials: "Learning Materials",
  TeacherHelpdesk: "Teacher's Helpdesk",
  TeacherCeoRequest: "CEO Direct Line",
  TeacherLeaderboard: "Leaderboard",
  TeacherAnnouncements: "Announcements",
  TeacherSettings: "Settings",
  Notifications: "Notifications",
};

/** The website path each screen stands for (used by the teacher onboarding lock, which is defined on paths) */
export const ROUTE_PATHS: Record<RouteName, string> = {
  StudentDashboard: "/student",
  StudentClasses: "/student/classes",
  StudentTools: "/student/daily-tools",
  StudentSchedule: "/student/schedule",
  StudentMore: "/student",
  StudentPayments: "/student/payments",
  StudentCertificate: "/student/certificate",
  StudentFeedback: "/student/feedback",
  StudentLeaderboard: "/student/leaderboard",
  StudentSettings: "/student/settings",
  TeacherDashboard: "/teacher",
  TeacherClasses: "/teacher/class",
  TeacherSchedule: "/teacher/schedule",
  TeacherSalary: "/teacher/salary",
  TeacherMore: "/teacher",
  TeacherMonthlyReport: "/teacher/class/monthly",
  TeacherStudents: "/teacher/student",
  TeacherLearningMaterials: "/teacher/learning-materials",
  TeacherHelpdesk: "/teacher/teacher-helpdesk",
  TeacherCeoRequest: "/teacher/ceo-request",
  TeacherLeaderboard: "/teacher/leaderboard",
  TeacherAnnouncements: "/teacher/announcements",
  TeacherSettings: "/teacher/settings",
  Notifications: "",
};

/** Longest paths first, so "/teacher/class/monthly" wins over "/teacher/class" */
const PATH_TABLE: [string, RouteName][] = [
  ["/student/daily-tools", "StudentTools"],
  ["/student/leaderboard", "StudentLeaderboard"],
  ["/student/certificate", "StudentCertificate"],
  ["/student/payments", "StudentPayments"],
  ["/student/feedback", "StudentFeedback"],
  ["/student/settings", "StudentSettings"],
  ["/student/schedule", "StudentSchedule"],
  ["/student/classes", "StudentClasses"],
  ["/student", "StudentDashboard"],
  ["/teacher/learning-materials", "TeacherLearningMaterials"],
  ["/teacher/teacher-helpdesk", "TeacherHelpdesk"],
  ["/teacher/class/monthly", "TeacherMonthlyReport"],
  ["/teacher/announcements", "TeacherAnnouncements"],
  ["/teacher/ceo-request", "TeacherCeoRequest"],
  ["/teacher/leaderboard", "TeacherLeaderboard"],
  ["/teacher/settings", "TeacherSettings"],
  ["/teacher/schedule", "TeacherSchedule"],
  ["/teacher/tickets", "TeacherHelpdesk"],
  ["/teacher/student", "TeacherStudents"],
  ["/teacher/salary", "TeacherSalary"],
  ["/teacher/class", "TeacherClasses"],
  ["/teacher", "TeacherDashboard"],
];

/**
 * Finds the screen for a website path. Query parameters become route params
 * ("/student/settings?tab=notifications" -> StudentSettings { tab: "notifications" }).
 * Returns null for anything that is not a portal page.
 */
export function routeForPath(url: string | null | undefined): { name: RouteName; params: RouteParams } | null {
  if (!url) return null;
  let path = String(url).trim();
  const absolute = path.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (absolute) {
    if (!/^https?:\/\/(app\.)?fajracademy\.io(\/|$)/i.test(path)) return null;
    path = absolute[1] || "/";
  }
  if (!path.startsWith("/")) return null;
  const [bare, query = ""] = path.split("#")[0].split("?");
  const clean = bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
  const match = PATH_TABLE.find(([prefix]) => clean === prefix || clean.startsWith(`${prefix}/`));
  if (!match) return null;
  const params: Record<string, unknown> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [key, value = ""] = pair.split("=");
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      params[key] = value;
    }
  }
  return { name: match[1], params: Object.keys(params).length ? params : undefined };
}
