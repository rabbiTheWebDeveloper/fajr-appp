import { ApiError, apiRaw } from "@/api/client";
import { DAY_SHORT, MONTH_SHORT, academyClock, academyDateKey, formatClock, formatDate, shiftDateKey } from "@/lib/format";
import type { Tone } from "@/theme/palette";
import type { IconName, MIconName } from "@/ui";

/* ═══════════════════════════════ Types ═══════════════════════════════ */

export type TicketStatus = "open" | "in-progress" | "resolved" | "closed" | "on-hold";
export type Priority = "low" | "medium" | "high" | "urgent";
export type StatusTab = "all" | TicketStatus;

export interface TicketAttachment {
  _id?: string;
  title?: string;
  url?: string;
}

export interface TicketMessage {
  _id?: string;
  sender?: string;
  senderName?: string;
  senderModel?: "User" | "Teacher" | "Student" | string;
  content: string;
  sentAt: string;
  isInternal?: boolean;
  attachments?: TicketAttachment[];
}

export interface TicketItem {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  status: TicketStatus;
  raisedByName?: string;
  raisedByEmail?: string;
  assignedToName?: string;
  assignedTo?: { fullName?: string; email?: string } | string | null;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  messages?: TicketMessage[];
  tags?: string[];
  feedback?: { rating?: number | null; comment?: string; submittedAt?: string | null };
  resolutionNote?: string;
}

export interface Category {
  /** Exact label: the API stores it in `tags[0]`, do not rename */
  label: string;
  short: string;
  icon?: IconName;
  mIcon?: MIconName;
  tone: Tone;
  desc: string;
}

/** GET /api/teacher-portal/tickets */
export interface TicketsReply {
  success?: boolean;
  message?: string;
  tickets?: TicketItem[];
  total?: number;
  page?: number;
  totalPages?: number;
  statusCounts?: Record<TicketStatus, number>;
}

/** POST / PUT / PATCH /api/teacher-portal/tickets */
export interface TicketMutationReply {
  success?: boolean;
  message?: string;
  ticket?: TicketItem;
  activeTicketId?: string;
}

/* ═══════════════════════════════ Constants ═══════════════════════════════ */

export const TICKETS_PATH = "/api/teacher-portal/tickets";

export const CATEGORIES: Category[] = [
  { label: "Head of Curriculum and Teacher Development", short: "Curriculum & Development", icon: "book-open", tone: "violet", desc: "Curriculum guidance, pedagogy, syllabus & training" },
  { label: "Salary Issue", short: "Salary", mIcon: "cash", tone: "success", desc: "Pay calculations, invoices, deductions, payouts" },
  { label: "Student Issue", short: "Student", mIcon: "school-outline", tone: "info", desc: "Attendance, behaviour, level mismatch, progress" },
  { label: "Class & Schedule Issue", short: "Class & Schedule", mIcon: "calendar-clock", tone: "warning", desc: "Rescheduling, overlapping batches, class links" },
  { label: "IT & Portal Support", short: "IT & Portal", mIcon: "laptop", tone: "primary", desc: "ERP login, mic/camera, portal bugs" },
  { label: "Payment & Fee Issue", short: "Payment & Fees", mIcon: "receipt-text-outline", tone: "primary", desc: "Student billing verification, invoice status" },
  { label: "HR & Leave Inquiry", short: "HR & Leave", icon: "briefcase", tone: "danger", desc: "Leave requests, emergency notice, documents" },
  { label: "Academic Support", short: "Academic", mIcon: "creation", tone: "violet", desc: "Exam materials, curriculum guidelines" },
  { label: "General Feedback & Other", short: "General", icon: "message-square", tone: "neutral", desc: "Other operational questions or suggestions" },
];

export const STATUS_META: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "info" },
  "in-progress": { label: "In Progress", tone: "warning" },
  "on-hold": { label: "On Hold", tone: "violet" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const PRIORITIES: { key: Priority; label: string; hint: string; tone: Tone }[] = [
  { key: "low", label: "Low", hint: "Whenever convenient", tone: "neutral" },
  { key: "medium", label: "Normal", hint: "Within a business day", tone: "primary" },
  { key: "high", label: "High", hint: "Affecting my classes", tone: "warning" },
  { key: "urgent", label: "Urgent", hint: "Class blocked now", tone: "danger" },
];

export const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in-progress", label: "In Progress" },
  { key: "on-hold", label: "On Hold" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

export const FAQ_ITEMS = [
  { q: "How fast does the Teacher Support Team respond?", a: "Our academic and administrative team operates Saturday through Thursday. Tickets are reviewed within 2 to 4 business hours, with full resolutions typically completed within 24 hours." },
  { q: "Why can I only have 1 active ticket at a time?", a: "To ensure prioritized, individual focus on each issue without duplicated requests, teachers can maintain one active (Open / In-Progress) ticket at a time. You can send unlimited replies inside that ticket thread, and submit a new ticket as soon as the current one is resolved." },
  { q: "How do I report a student absent or unassigned?", a: "Select 'Student Issue' as your category and mention the Student's Full Name, Batch/Course, and the specific date or problem. Our coordinator will follow up directly with the guardian." },
  { q: "When is monthly teacher salary calculated and distributed?", a: "Salaries are processed by the accounts department between the 1st and 7th of every calendar month. If you notice any discrepancy in class counts, submit a 'Salary Issue' ticket before the 5th." },
  { q: "Can I reopen or follow up on a resolved ticket?", a: "No. Once a ticket is marked resolved or closed, it is permanently finalized and cannot be reopened. You can review the full resolution history and submit your satisfaction rating. For an entirely new concern, create a new ticket." },
];

export const QUICK_REPLIES = ["Thank you for the update!", "Issue is now resolved, thank you.", "Understood. I will wait for further notice.", "Please see the updated details above."];

export const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
export const PAGE_SIZE = 10;
export const EMPTY_COUNTS: Record<TicketStatus, number> = { open: 0, "in-progress": 0, resolved: 0, closed: 0, "on-hold": 0 };

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

export const isActiveStatus = (s?: string) => s === "open" || s === "in-progress" || s === "on-hold";
export const isFinalStatus = (s?: string) => s === "resolved" || s === "closed";
export const statusMeta = (s?: string) => STATUS_META[s as TicketStatus] ?? STATUS_META.open;
export const priorityMeta = (p?: string) => PRIORITIES.find((x) => x.key === p) ?? PRIORITIES[1];
export const ticketCode = (t: TicketItem) => t.ticketId || t._id.slice(-6).toUpperCase();
export const isOwnMessage = (m: TicketMessage) => m.senderModel === "Teacher";

export function assigneeName(t: TicketItem): string {
  if (t.assignedToName) return t.assignedToName;
  if (t.assignedTo && typeof t.assignedTo === "object") return t.assignedTo.fullName || "";
  return "";
}

export function resolveCategory(t: Pick<TicketItem, "tags" | "category" | "title">): Category {
  const tag = t.tags?.[0];
  const byTag = CATEGORIES.find((c) => c.label === tag);
  if (byTag) return byTag;
  const byLabel = CATEGORIES.find((c) => c.label.toLowerCase() === (t.category || "").toLowerCase() || c.label === t.title);
  if (byLabel) return byLabel;
  const raw = t.category || "general";
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  return { label: name, short: name, icon: "message-square", tone: "neutral", desc: "" };
}

/** Removes staff-only notes and the auto-copied description that the API stores as the first message. */
export function visibleMessages(t: TicketItem): TicketMessage[] {
  const msgs = (t.messages || []).filter((m) => !m.isInternal);
  if (msgs[0] && isOwnMessage(msgs[0]) && (msgs[0].content || "").trim() === (t.description || "").trim()) return msgs.slice(1);
  return msgs;
}

export function lastActivity(t: TicketItem): string | undefined {
  const msgs = visibleMessages(t);
  return msgs.length ? msgs[msgs.length - 1].sentAt : t.updatedAt || t.createdAt;
}

/** A staff reply is the latest message on an active ticket → teacher should look. */
export function hasNewStaffReply(t: TicketItem): boolean {
  if (!isActiveStatus(t.status)) return false;
  const msgs = visibleMessages(t);
  return msgs.length > 0 && !isOwnMessage(msgs[msgs.length - 1]);
}

export function mergeTicket(old: TicketItem | undefined | null, upd: TicketItem): TicketItem {
  if (!old) return upd;
  return {
    ...old,
    ...upd,
    // Mutation endpoints return an un-populated `assignedTo` (ObjectId string): keep the populated copy
    assignedTo: upd.assignedTo && typeof upd.assignedTo === "object" ? upd.assignedTo : old.assignedTo,
  };
}

/** "Nov 5, 2026" (academy time) */
export function formatTicketDate(iso?: string | null): string {
  return formatDate(iso, "medium");
}

/** "2:30 PM" (academy time) */
export function formatTicketTime(iso?: string | null): string {
  return formatClock(iso, "");
}

export function ticketTimeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTicketDate(iso);
}

/** The day separator of the conversation: "Today", "Yesterday" or "Thu, Nov 5" (with the year when it is not this year) */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const key = academyDateKey(date);
  const today = academyDateKey();
  if (key === today) return "Today";
  if (key === shiftDateKey(today, -1)) return "Yesterday";
  const clock = academyClock(date);
  const year = clock.getUTCFullYear();
  return `${DAY_SHORT[clock.getUTCDay()]}, ${MONTH_SHORT[clock.getUTCMonth()]} ${clock.getUTCDate()}${year !== Number(today.slice(0, 4)) ? `, ${year}` : ""}`;
}

/**
 * A ticket mutation, read the way the website reads it: the reply's own `success` flag decides,
 * and the server's `message` is the error text whatever the HTTP status was.
 */
export async function ticketMutation(method: "POST" | "PUT" | "PATCH", body: Record<string, unknown>, fallback: string): Promise<{ data?: TicketMutationReply; error?: string }> {
  try {
    const reply = await apiRaw<TicketMutationReply>(TICKETS_PATH, { method, body });
    if (reply.data?.success) return { data: reply.data };
    return { error: reply.data?.message || fallback };
  } catch (e) {
    return { error: e instanceof ApiError && e.message ? e.message : "Network error. Please try again." };
  }
}
