import { MONTH_NAMES, academyClock } from "@/lib/format";

/** The certificate data GET /api/student-portal/certificate returns in `certificate` */
export interface Certificate {
  studentName?: string;
  studentId?: string;
  fatherName?: string;
  motherName?: string;
  courseName?: string;
  teacherName?: string;
  admissionDate?: string | null;
  classStartingDate?: string | null;
  createdAt?: string | null;
  gender?: string;
  /** The certificate stays locked (no preview, no download) until an admin approves it */
  certificateApproved?: boolean;
}

export interface CertificateReply {
  success: boolean;
  message?: string;
  certificate?: Certificate | null;
}

export const CERTIFICATE_PATH = "/api/student-portal/certificate";

export const DEFAULT_COURSE_NAME = "Qaida and Basic Islamic Learning";
export const CEO_NAME = "Hafiz Mawlana Muhammad Farabi Chowdhury";

/** "November 5, 2026" in academy time; "N/A" for a missing or unreadable date */
export function longDate(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const clock = academyClock(date);
  return `${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCDate()}, ${clock.getUTCFullYear()}`;
}

/** The enrolment date printed on the certificate: when the student record was created, else admission / class start */
export function enrollmentDate(cert: Certificate): string {
  return longDate(cert.createdAt || cert.admissionDate || cert.classStartingDate);
}

/** "son of A and B" / "daughter of A"; empty when neither parent's name is on record */
export function parentPhrase(cert: Certificate): string {
  const relation = cert.gender === "female" ? "daughter" : "son";
  if (cert.fatherName && cert.motherName) return `${relation} of ${cert.fatherName} and ${cert.motherName}`;
  if (cert.fatherName) return `${relation} of ${cert.fatherName}`;
  if (cert.motherName) return `${relation} of ${cert.motherName}`;
  return "";
}

export function duaText(cert: Certificate): string {
  return `May Allah grant ${cert.gender === "female" ? "her" : "him"} continuous success in seeking Islamic knowledge.`;
}
