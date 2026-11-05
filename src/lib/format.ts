/**
 * Formatting and date helpers shared by every screen.
 *
 * Class times in the academy are Bangladesh time (UTC+6, no daylight saving) whatever the phone's own
 * time zone is, so "today", "now" and class clocks go through the academy* helpers below.
 */

export const ACADEMY_UTC_OFFSET_MINUTES = 6 * 60;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * A Date whose UTC fields read as the academy's wall clock.
 * Use getUTCFullYear / getUTCMonth / getUTCDate / getUTCDay / getUTCHours / getUTCMinutes on the result.
 */
export function academyClock(at: Date | number = new Date()): Date {
  const ms = typeof at === "number" ? at : at.getTime();
  return new Date(ms + ACADEMY_UTC_OFFSET_MINUTES * 60_000);
}

/** Today's date in the academy, as "YYYY-MM-DD" */
export function academyDateKey(at: Date | number = new Date()): string {
  const d = academyClock(at);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** The current month in the academy, as "YYYY-MM" */
export function academyMonthKey(at: Date | number = new Date()): string {
  return academyDateKey(at).slice(0, 7);
}

/** Day of the week in the academy right now: 0 = Sunday … 6 = Saturday */
export function academyDayIndex(at: Date | number = new Date()): number {
  return academyClock(at).getUTCDay();
}

/** Minutes since midnight in the academy right now */
export function academyMinutesNow(at: Date | number = new Date()): number {
  const d = academyClock(at);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** The real instant of an academy wall-clock time: academyInstant("2026-11-05", "14:30") */
export function academyInstant(dateKey: string, time = "00:00"): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) - ACADEMY_UTC_OFFSET_MINUTES * 60_000);
}

/** "14:30" -> 870. Also accepts "2:30 PM". Returns null when it cannot be read. */
export function timeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 870 -> "2:30 PM" */
export function minutesToTime12(total: number): string {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(m / 60);
  const minutes = m % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad2(minutes)} ${hours24 < 12 ? "AM" : "PM"}`;
}

/** "14:30" -> "2:30 PM". Text that is not a clock time is returned unchanged. */
export function formatTime12(time?: string | null): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time ? String(time) : "";
  return minutesToTime12(minutes);
}

/** 870 -> "14:30" */
export function minutesToTime24(total: number): string {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

type DateStyle = "short" | "medium" | "long" | "weekday" | "monthYear" | "dayMonth";

/**
 * A date as the academy sees it (Bangladesh time):
 *   short "5 Nov 2026" · medium "Nov 5, 2026" · long "5 November 2026" · weekday "Thu, 5 Nov 2026"
 *   monthYear "November 2026" · dayMonth "5 Nov"
 * A bare "YYYY-MM-DD" is taken as that calendar day. Returns `fallback` for an empty or unreadable value.
 */
export function formatDate(value: Date | string | number | null | undefined, style: DateStyle = "short", fallback = "—"): string {
  let y: number;
  let m: number;
  let d: number;
  let dow: number;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [y, m, d] = value.split("-").map(Number);
    m -= 1;
    dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  } else {
    const date = toDate(value);
    if (!date) return fallback;
    const clock = academyClock(date);
    y = clock.getUTCFullYear();
    m = clock.getUTCMonth();
    d = clock.getUTCDate();
    dow = clock.getUTCDay();
  }
  switch (style) {
    case "medium":
      return `${MONTH_SHORT[m]} ${d}, ${y}`;
    case "long":
      return `${d} ${MONTH_NAMES[m]} ${y}`;
    case "weekday":
      return `${DAY_SHORT[dow]}, ${d} ${MONTH_SHORT[m]} ${y}`;
    case "monthYear":
      return `${MONTH_NAMES[m]} ${y}`;
    case "dayMonth":
      return `${d} ${MONTH_SHORT[m]}`;
    default:
      return `${d} ${MONTH_SHORT[m]} ${y}`;
  }
}

/** The clock time of an instant in the academy: "2:30 PM" */
export function formatClock(value: Date | string | number | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  const clock = academyClock(date);
  return minutesToTime12(clock.getUTCHours() * 60 + clock.getUTCMinutes());
}

/** "5 Nov 2026, 2:30 PM" */
export function formatDateTime(value: Date | string | number | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return `${formatDate(date, "short")}, ${formatClock(date)}`;
}

/** "2026-11" -> "November 2026" */
export function formatMonthKey(monthKey: string, short = false): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return `${(short ? MONTH_SHORT : MONTH_NAMES)[m - 1]} ${y}`;
}

/** Move a "YYYY-MM" key by a number of months */
export function shiftMonthKey(monthKey: string, by: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/** Move a "YYYY-MM-DD" key by a number of days */
export function shiftDateKey(dateKey: string, by: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + by));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

/** "just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", "2 Nov" */
export function timeAgo(value: Date | string | number | null | undefined, now: Date = new Date()): string {
  const then = toDate(value);
  if (!then) return "";
  const mins = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(then, "dayMonth");
}

/** 12500 -> "12,500" (no decimals unless the amount has them) */
export function formatNumber(value: number | string | null | undefined, maxDecimals = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  const fixed = n.toFixed(maxDecimals).replace(/\.?0+$/, "");
  const [whole, fraction] = fixed.split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const digits = sign ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** 12500 -> "৳12,500" */
export function formatMoney(value: number | string | null | undefined, symbol = "৳"): string {
  return `${symbol}${formatNumber(value)}`;
}

/** 135 -> "2h 15m"; 45 -> "45m" */
export function formatDuration(totalMinutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(totalMinutes ?? 0));
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** 3725 seconds -> "1:02:05"; 125 -> "2:05" */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`;
}

/** "in-progress" / "in_progress" -> "In Progress" */
export function titleCase(value?: string | null): string {
  if (!value) return "";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Escapes text for use inside HTML that is turned into a PDF */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
