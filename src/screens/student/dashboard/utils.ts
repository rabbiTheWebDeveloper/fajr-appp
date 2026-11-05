import { DAY_NAMES, MONTH_NAMES, MONTH_SHORT, formatMoney } from "@/lib/format";
import { dateKeyOf } from "@/lib/student-dashboard-shared";

/** ৳1,200: whole taka, as the website's dashboard shows fees */
export const taka = (amount: number) => formatMoney(Math.round(amount));

/** "class" or "classes" */
export const classWord = (count: number) => `class${count === 1 ? "" : "es"}`;

/** The academy-time (Bangladesh) calendar day of an instant, as { month: "Nov", day: 5 } */
export function academyMonthDay(value: string | number | Date): { month: string; day: number } | null {
  const key = dateKeyOf(value);
  if (!key) return null;
  const [, month, day] = key.split("-").map(Number);
  return { month: MONTH_SHORT[month - 1] ?? "", day };
}

/** "Thursday, November 5, 2026" by the phone's own clock (the greeting follows the person's own day, as on the website) */
export const deviceDateText = (date: Date) => `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
