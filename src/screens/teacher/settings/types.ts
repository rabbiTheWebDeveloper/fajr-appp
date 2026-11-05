import { ApiError } from "@/api/client";
import { academyClock } from "@/lib/format";

/** The tabs of the settings screen; the same keys the website uses in `?tab=` */
export const SETTINGS_TABS = ["personal", "portfolio", "slots", "notifications", "idcard", "security"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function parseTab(value: unknown): SettingsTab | null {
  return typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value) ? (value as SettingsTab) : null;
}

/** What one save sends: the Personal tab, the Portfolio tab, or both together */
export type SaveMode = "personal" | "portfolio" | "all";

export interface Qualification {
  degree?: string;
  institute?: string;
  passingYear?: number | string;
}

export interface Experience {
  institute?: string;
  position?: string;
  time?: string;
  description?: string;
}

export interface Achievement {
  title?: string;
  year?: string;
  description?: string;
}

/** The teacher document as GET /api/teacher-portal/profile returns it in `teacher` (password removed, `emailVerified` and `paymentInfo` added) */
export interface TeacherProfileData {
  _id?: string;
  teacherId?: string;
  employeeId?: string;
  staffId?: string;
  adminId?: string;
  role?: string;
  fullName?: string;
  designation?: string;
  email?: string;
  emailVerified?: boolean;
  verifiedEmail?: string;
  emailVerifiedAt?: string | null;
  phone?: string;
  emergencyContactNumber?: string;
  gender?: string;
  bloodGroup?: string;
  joinDate?: string;
  currentService?: string;
  presentAddress?: string;
  permanentAddress?: string;
  nidOrBirthCertificatePicture?: string;
  bio?: string;
  avatar?: string;
  status?: string;
  idCardStatus?: string;
  portfolioHeadline?: string;
  portfolioUrl?: string;
  impact?: string;
  keyExpertise?: string[];
  qualifications?: Qualification[];
  experiences?: Experience[];
  achievements?: Achievement[];
  paymentInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProfileReply {
  success?: boolean;
  message?: string;
  teacher?: TeacherProfileData;
}

/**
 * How long the teacher has served, counted from the joining date: "2 years, 3 months".
 * Dates are read on the academy's calendar (Bangladesh time), whatever the phone's zone is.
 */
export function getServiceDuration(joinDate?: string | null): string {
  if (!joinDate) return "Not set";
  const parsed = new Date(joinDate);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  const start = academyClock(parsed);
  const now = academyClock();
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  let months = now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() - start.getUTCDate() < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "Just started";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (parts.length === 0) return "Less than 1 month";
  return parts.join(", ");
}

/** The joining date as the "YYYY-MM-DD" the date field shows (the stored value's UTC day, as on the website) */
export function getJoinDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

/**
 * The message for a failed request, worded as the website words it: the server's own message when it sent one,
 * the page's fallback otherwise, and a network line when the server could not be reached.
 */
export function failureText(error: unknown, fallback: string, network = "Network error. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.isNetwork) return network;
    const sent = (error.data as { message?: unknown } | null | undefined)?.message;
    return typeof sent === "string" && sent.trim() ? sent : fallback;
  }
  return fallback;
}
