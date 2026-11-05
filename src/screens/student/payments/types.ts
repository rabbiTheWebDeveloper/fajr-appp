import { academyMonthKey, formatMonthKey, shiftMonthKey } from "@/lib/format";
import type { Tone } from "@/theme/palette";

/** A course the student is enrolled in, as GET /api/student-portal/payments lists it */
export interface PaymentCourse {
  _id: string;
  title: string;
}

/** The student fields the payments route populates on each payment */
export interface PaymentStudentRef {
  _id?: string;
  fullName?: string;
  studentId?: string;
  email?: string;
  phone?: string;
}

/** One row of the Payment collection (src/model/payment-model.js) */
export interface PaymentRecord {
  _id: string;
  transactionId?: string;
  student?: PaymentStudentRef | string | null;
  course?: PaymentCourse | null;
  amount?: number;
  discount?: number;
  type?: string;
  status?: string;
  paymentMethod?: string;
  paymentMethodDetails?: string;
  invoiceId?: string;
  mrNumber?: string;
  month?: string;
  paidAt?: string | null;
  createdAt?: string;
}

export interface StudentPaymentInfo {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  monthlyFee: number;
  monthlyDue: number;
  /** Class starting date, or the admission date when that is not set */
  joinDate: string | null;
  course: string;
}

export interface PaymentsReply {
  success: boolean;
  message?: string;
  payments?: PaymentRecord[];
  enrolledCourses?: PaymentCourse[];
  studentInfo?: StudentPaymentInfo | null;
}

export const PAYMENTS_PATH = "/api/student-portal/payments";

/** The month a fee is paid for, as the website names it: "November 2026" */
export function currentMonthLabel(): string {
  return formatMonthKey(academyMonthKey());
}

/** The months offered in both forms: two months ahead down to six months back, newest first */
export function monthOptions(): string[] {
  const current = academyMonthKey();
  const options: string[] = [];
  for (let i = -6; i <= 2; i++) options.push(formatMonthKey(shiftMonthKey(current, i)));
  return options.reverse();
}

/** Badge colour of a payment status; an unknown status looks like "cancelled", as on the website */
export function statusTone(status?: string): Tone {
  switch (status) {
    case "pending":
      return "warning";
    case "completed":
      return "success";
    case "refunded":
      return "primary";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * The "Channel" column: the transaction details when there are any (e.g. "bKash (Ref: 123)"),
 * otherwise the payment method ("bank-transfer" -> "Bank Transfer"), otherwise "Online".
 */
export function channelLabel(payment: PaymentRecord): string {
  if (payment.paymentMethodDetails) return payment.paymentMethodDetails;
  const method = payment.paymentMethod?.replace("-", " ") || "Online";
  return method.replace(/(^|\s)(\S)/g, (_match, space: string, letter: string) => space + letter.toUpperCase());
}

/** The amount the forms start with: what is due, or the monthly fee when nothing is due */
export function defaultPayAmount(info?: StudentPaymentInfo | null): number {
  if (!info) return 0;
  return info.monthlyDue && info.monthlyDue > 0 ? info.monthlyDue : info.monthlyFee || 0;
}

/** Keeps only what a number field accepts: digits and one decimal point */
export function cleanAmountInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
