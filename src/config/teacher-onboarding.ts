// The first-week checklist a new teacher sees on the dashboard. Shared by the API (which checks the
// steps) and the checklist component (which shows them), so order and wording live in one place.
//
//   kind "video" - the teacher watches a tutorial and marks it watched themselves
//   kind "auto"  - the server looks at the teacher's real data (see lib/teacher-onboarding.ts)
//
// blocksDashboard: until every step with this flag is done, the dashboard shows only the checklist.
// Steps that can only be done at certain dates or times (payment details, creating a class) do not
// carry it, or a new teacher could be shut out of the dashboard for days.
//
// Keys end up as Mongo field names (`steps.<key>`), so they must be plain camelCase with no dots.

export interface OnboardingStepDef {
  key: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  kind: "video" | "auto";
  blocksDashboard: boolean;
  video?: { id: string; title: string };
}

export const ONBOARDING_STEPS = [
  {
    key: "tutorialPart1",
    title: "Watch tutorial: Part 1",
    description: "A complete walk-through of the teacher portal.",
    href: "/teacher",
    actionLabel: "Watch",
    kind: "video",
    blocksDashboard: true,
    video: { id: "G5NnJ-Oztbk", title: "How to Use FAJR Academy ERP: Complete Teacher Portal Tutorial" },
  },
  {
    key: "tutorialPart2",
    title: "Watch tutorial: Part 2",
    description: "Reports, issue tracking and the leaderboard.",
    href: "/teacher",
    actionLabel: "Watch",
    kind: "video",
    blocksDashboard: true,
    video: { id: "G5b8iElMYTc", title: "FAJR Academy ERP Teacher Portal: Reports, Issue Tracking & Leaderboard" },
  },
  {
    key: "profilePhoto",
    title: "Upload your profile photo",
    description: "Students and parents see this photo on your profile.",
    href: "/teacher/settings?tab=personal",
    actionLabel: "Add photo",
    kind: "auto",
    blocksDashboard: true,
  },
  {
    key: "profileSettings",
    title: "Update your settings",
    description: "Add your phone, emergency contact and both addresses.",
    href: "/teacher/settings?tab=personal",
    actionLabel: "Open settings",
    kind: "auto",
    blocksDashboard: true,
  },
  {
    key: "paymentInfo",
    title: "Add your payment information",
    description: "The bank or mobile wallet your salary is paid into.",
    href: "/teacher/salary",
    actionLabel: "Add payment info",
    kind: "auto",
    blocksDashboard: false, // only open from the 15th to the 2nd of the month
  },
  {
    key: "assignStudent",
    title: "Assign your first student",
    description: "Add a student to your list using their student ID.",
    href: "/teacher/student",
    actionLabel: "Assign student",
    kind: "auto",
    blocksDashboard: true,
  },
  {
    key: "setSchedule",
    title: "Set a class schedule",
    description: "Choose the days and time you teach your student.",
    href: "/teacher/student",
    actionLabel: "Set schedule",
    kind: "auto",
    blocksDashboard: true,
  },
  {
    key: "firstClass",
    title: "Create your first class",
    description: "Schedule a class session so you can start teaching.",
    href: "/teacher/class",
    actionLabel: "Create class",
    kind: "auto",
    blocksDashboard: false, // a class can only be created in the 30 minutes before its scheduled start
  },
] as const satisfies readonly OnboardingStepDef[];

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export const ONBOARDING_STEP_KEYS: readonly OnboardingStepKey[] = ONBOARDING_STEPS.map((step) => step.key);

/** Steps only the teacher can complete, by marking them. */
export const MANUAL_STEP_KEYS: readonly OnboardingStepKey[] = ONBOARDING_STEPS.filter((step) => step.kind === "video").map(
  (step) => step.key
);

// While the dashboard is locked, every teacher page is locked except the ones the steps are done on:
// the dashboard (tutorials), Settings (photo, details) and My Students (assign a student, set a schedule).
const OPEN_EXACT = ["/teacher"];
const OPEN_PREFIXES = ["/teacher/settings", "/teacher/student"];

/** True for the pages that stay usable while the onboarding lock is on. Accepts a path or a link with a query. */
export function isOpenDuringOnboarding(pathname: string): boolean {
  const bare = pathname.split(/[?#]/)[0];
  const path = bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
  return OPEN_EXACT.includes(path) || OPEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export const youtubeWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

export const youtubeEmbedUrl = (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
