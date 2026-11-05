import type { IconName } from "@/ui";

/** The Student document as GET / PUT /api/student-portal/profile return it (password removed, names resolved) */
export interface StudentRecord {
  _id?: string;
  studentId?: string;
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  age?: number | null;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  avatar?: string;
  gender?: string;
  /** The course title; stays a raw id when the course could not be found */
  course?: string | null;
  /** Added by the route when a teacher is assigned */
  teacherName?: string;
  admissionDate?: string | null;
  monthlyFee?: number;
  status?: string;
  bloodGroup?: string;
}

export interface ProfileReply {
  success?: boolean;
  message?: string;
  student?: StudentRecord | null;
}

/** The fields a student may change, exactly as the profile form sends them */
export interface ProfileForm {
  fullName: string;
  fatherName: string;
  motherName: string;
  phone: string;
  whatsappNumber: string;
  age: string;
  gender: string;
  avatar: string;
}

export const EMPTY_FORM: ProfileForm = { fullName: "", fatherName: "", motherName: "", phone: "", whatsappNumber: "", age: "", gender: "male", avatar: "" };

export function formFromStudent(student: StudentRecord): ProfileForm {
  return {
    fullName: student.fullName || "",
    fatherName: student.fatherName || "",
    motherName: student.motherName || "",
    phone: student.phone || "",
    whatsappNumber: student.whatsappNumber || "",
    age: student.age ? String(student.age) : "",
    gender: student.gender || "male",
    avatar: student.avatar || "",
  };
}

/** The enrolled course's name, or "" when there is none (an unresolved course comes back as a bare database id) */
export function courseNameOf(student: StudentRecord | null | undefined): string {
  const course = typeof student?.course === "string" ? student.course.trim() : "";
  return /^[a-f0-9]{24}$/i.test(course) ? "" : course;
}

export interface PageMessage {
  text: string;
  ok: boolean;
}

export type SettingsTab = "profile" | "idcard" | "notifications" | "security";

export const SETTINGS_TABS: { value: SettingsTab; label: string; icon: IconName }[] = [
  { value: "profile", label: "Profile & Guardian Info", icon: "user" },
  { value: "idcard", label: "Official Student ID Card", icon: "credit-card" },
  { value: "notifications", label: "Notifications", icon: "bell" },
  { value: "security", label: "Password & Security", icon: "lock" },
];

export function isSettingsTab(value: unknown): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value);
}
