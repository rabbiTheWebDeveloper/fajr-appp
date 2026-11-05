import { academyClock } from "@/lib/format";
import type { Option } from "@/ui";

/** The payout account form, as the salary page keeps it */
export interface PaymentForm {
  method: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  routingNumber: string;
  accountType: string;
  /** The typed name when the provider is "Other" */
  customBankName: string;
}

/** The PaymentInfo document GET /api/teacher-portal/profile attaches as `teacher.paymentInfo` */
export interface SavedPaymentInfo {
  method?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  accountType?: string;
  updateCount?: number;
}

export const DEFAULT_BANK = "Islami Bank Bangladesh PLC.";
/** Payment information can be changed this many times in total */
export const MAX_PAYMENT_UPDATES = 4;

export const EMPTY_PAYMENT_FORM: PaymentForm = {
  method: "Bank_Transfer",
  accountName: "",
  accountNumber: "",
  bankName: DEFAULT_BANK,
  branchName: "",
  routingNumber: "",
  accountType: "Savings",
  customBankName: "",
};

const KNOWN_PROVIDERS = [
  "Islami Bank Bangladesh PLC.",
  "bKash",
  "Nagad",
  "Rocket (DBBL)",
  "Dutch-Bangla Bank PLC.",
  "BRAC Bank PLC.",
  "The City Bank PLC.",
  "Sonali Bank PLC.",
  "Pubali Bank PLC.",
  "Eastern Bank PLC.",
  "United Commercial Bank (UCB)",
  "Al-Arafah Islami Bank PLC.",
  "First Security Islami Bank PLC.",
  "Shahjalal Islami Bank PLC.",
  "Social Islami Bank PLC.",
  "CellFin (IBBL)",
  "Upay",
];

export const METHOD_OPTIONS: Option[] = [
  { value: "Bank_Transfer", label: "Bank Transfer (ব্যাংক ট্রান্সফার)" },
  { value: "bKash", label: "bKash (বিকাশ)" },
  { value: "Nagad", label: "Nagad (নগদ)" },
  { value: "Rocket", label: "Rocket (রকেট)" },
];

const GROUP_DEFAULT = "Default / Recommended Bank";
const GROUP_MFS = "Mobile Financial Services (MFS)";
const GROUP_BANKS = "Other Commercial & Islamic Banks";

/** The provider list; each option's second line is the group it sits under on the website */
export const PROVIDER_OPTIONS: Option[] = [
  { value: "Islami Bank Bangladesh PLC.", label: "Islami Bank Bangladesh PLC. (Default)", description: GROUP_DEFAULT },
  { value: "bKash", label: "bKash (বিকাশ)", description: GROUP_MFS },
  { value: "Nagad", label: "Nagad (নগদ)", description: GROUP_MFS },
  { value: "Rocket (DBBL)", label: "Rocket (DBBL)", description: GROUP_MFS },
  { value: "CellFin (IBBL)", label: "CellFin (IBBL)", description: GROUP_MFS },
  { value: "Upay", label: "Upay", description: GROUP_MFS },
  { value: "Dutch-Bangla Bank PLC.", label: "Dutch-Bangla Bank PLC.", description: GROUP_BANKS },
  { value: "BRAC Bank PLC.", label: "BRAC Bank PLC.", description: GROUP_BANKS },
  { value: "The City Bank PLC.", label: "The City Bank PLC.", description: GROUP_BANKS },
  { value: "Sonali Bank PLC.", label: "Sonali Bank PLC.", description: GROUP_BANKS },
  { value: "Pubali Bank PLC.", label: "Pubali Bank PLC.", description: GROUP_BANKS },
  { value: "Eastern Bank PLC.", label: "Eastern Bank PLC.", description: GROUP_BANKS },
  { value: "United Commercial Bank (UCB)", label: "United Commercial Bank (UCB)", description: GROUP_BANKS },
  { value: "Al-Arafah Islami Bank PLC.", label: "Al-Arafah Islami Bank PLC.", description: GROUP_BANKS },
  { value: "First Security Islami Bank PLC.", label: "First Security Islami Bank PLC.", description: GROUP_BANKS },
  { value: "Shahjalal Islami Bank PLC.", label: "Shahjalal Islami Bank PLC.", description: GROUP_BANKS },
  { value: "Social Islami Bank PLC.", label: "Social Islami Bank PLC.", description: GROUP_BANKS },
  { value: "Other", label: "Other Bank / Provider (অন্যান্য)", description: "Other" },
];

export const BANK_ACCOUNT_TYPE_OPTIONS: Option[] = [
  { value: "Savings", label: "Savings Account (সঞ্চয়ী হিসাব)" },
  { value: "Current", label: "Current Account (চলতি হিসাব)" },
];

export const MFS_ACCOUNT_TYPE_OPTIONS: Option[] = [
  { value: "Personal", label: "Personal (ব্যক্তিগত অ্যাকাউন্ট)" },
  { value: "Agent", label: "Agent (এজেন্ট)" },
  { value: "Merchant", label: "Merchant (মার্চেন্ট)" },
];

/** Mobile wallets: the account is a phone number and has a Personal / Agent / Merchant type */
export const isMobileWallet = (method: string) => method === "bKash" || method === "Nagad" || method === "Rocket";

/** A bank other than the default one also needs the account type, branch and routing number */
export const isOtherBank = (form: PaymentForm) => form.method === "Bank_Transfer" && form.bankName !== DEFAULT_BANK;

/** "bKash Mobile Number" / "Account Number", by payment method */
export function accountNumberLabel(method: string): string {
  if (method === "bKash") return "bKash Mobile Number";
  if (method === "Nagad") return "Nagad Mobile Number";
  if (method === "Rocket") return "Rocket Mobile Number";
  return "Account Number";
}

/** The saved record as form values. A bank that is not in the list becomes "Other" with its name typed in. */
export function formFromSaved(pInfo: SavedPaymentInfo): PaymentForm {
  const savedBank = pInfo.bankName || DEFAULT_BANK;
  const isCustom = !KNOWN_PROVIDERS.includes(savedBank) && savedBank !== "Other";
  return {
    method: pInfo.method || "Bank_Transfer",
    accountName: pInfo.accountName || "",
    accountNumber: pInfo.accountNumber || "",
    bankName: isCustom ? "Other" : savedBank,
    branchName: pInfo.branchName || "",
    routingNumber: pInfo.routingNumber || "",
    accountType: pInfo.accountType || (["bKash", "Nagad", "Rocket"].includes(pInfo.method ?? "") ? "Personal" : "Savings"),
    customBankName: isCustom ? savedBank : "",
  };
}

/** Choosing a method also sets the matching provider and account type */
export function applyMethodChange(prev: PaymentForm, newMethod: string): PaymentForm {
  let bankName = prev.bankName;
  let accountType = prev.accountType;
  if (newMethod === "bKash") {
    bankName = "bKash";
    accountType = "Personal";
  } else if (newMethod === "Nagad") {
    bankName = "Nagad";
    accountType = "Personal";
  } else if (newMethod === "Rocket") {
    bankName = "Rocket (DBBL)";
    accountType = "Personal";
  } else if (newMethod === "Bank_Transfer") {
    if (["bKash", "Nagad", "Rocket (DBBL)", "Upay"].includes(prev.bankName) || !prev.bankName) bankName = DEFAULT_BANK;
    accountType = "Savings";
  }
  return { ...prev, method: newMethod, bankName, accountType };
}

/** Choosing a provider also sets the matching method and account type (same mapping as the website) */
export function applyProviderChange(prev: PaymentForm, newProvider: string): PaymentForm {
  let method = prev.method;
  let accountType = prev.accountType;
  if (newProvider === "bKash") {
    method = "bKash";
    accountType = "Personal";
  } else if (newProvider === "Nagad") {
    method = "Nagad";
    accountType = "Personal";
  } else if (newProvider === "Rocket (DBBL)" || newProvider === "Upay") {
    method = "bKash";
    accountType = "Personal";
  } else if (newProvider !== "Other") {
    method = "Bank_Transfer";
    accountType = "Savings";
  }
  return { ...prev, bankName: newProvider, method, accountType };
}

/** The `paymentInfo` body of PUT /api/teacher-portal/profile */
export function paymentPayload(form: PaymentForm) {
  const bankName = form.bankName === "Other" ? form.customBankName.trim() || "Other Bank" : form.bankName || DEFAULT_BANK;
  return {
    method: form.method,
    accountName: form.accountName,
    accountNumber: form.accountNumber,
    bankName,
    branchName: form.branchName,
    routingNumber: form.routingNumber,
    accountType: form.accountType || "Savings",
  };
}

/** How many of the required payout fields are filled in */
export function paymentCompletion(form: PaymentForm): { done: number; total: number; pct: number } {
  const currentBank = form.bankName === "Other" ? form.customBankName : form.bankName;
  const isBank = form.method === "Bank_Transfer";
  const isDefaultBank = isBank && (form.bankName === DEFAULT_BANK || !form.bankName);
  const values = [form.accountName, form.accountNumber, currentBank, ...(isBank && !isDefaultBank ? [form.accountType, form.branchName, form.routingNumber] : [])];
  const done = values.filter((v) => !!v).length;
  return { done, total: values.length, pct: Math.round((done / values.length) * 100) };
}

export interface PaymentWindow {
  isOpen: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * The monthly window for changing payment information, on the academy's (Bangladesh) calendar:
 * open from the 15th 00:00 to the 2nd 23:59:59, locked from the 3rd to the 14th.
 * The countdown runs to the moment the window next closes (when open) or opens (when locked).
 */
export function paymentWindowStatus(now: Date = new Date()): PaymentWindow {
  // Both times are read on the academy's wall clock, so their difference is real time
  const clock = academyClock(now);
  const year = clock.getUTCFullYear();
  const month = clock.getUTCMonth();
  const date = clock.getUTCDate();

  let isOpen: boolean;
  let target: number;
  if (date <= 2) {
    isOpen = true;
    target = Date.UTC(year, month, 2, 23, 59, 59, 999);
  } else if (date < 15) {
    isOpen = false;
    target = Date.UTC(year, month, 15, 0, 0, 0, 0);
  } else {
    isOpen = true;
    target = Date.UTC(year, month + 1, 2, 23, 59, 59, 999);
  }

  const totalSeconds = Math.floor(Math.max(0, target - clock.getTime()) / 1000);
  return {
    isOpen,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** 30000 -> "BDT 30,000.00", the way the salary page writes amounts */
export function formatBdt(amount: number | null | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  return `${value < 0 ? "-" : ""}BDT ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
