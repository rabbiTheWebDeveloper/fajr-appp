export interface ProfileFieldItem {
  key: string;
  label: string;
  category: "personal" | "professional" | "portfolio" | "verification";
  check?: (data: any) => boolean;
}

export const SUGGESTED_EXPERTISE = [
  "Tajweed Rules",
  "Noorani Qaida",
  "Quran Hifz",
  "Makharij & Pronunciation",
  "Tafseer Ul Quran",
  "Hadith Studies",
  "Arabic Grammar (Nahw & Sarf)",
  "Islamic Studies & Fiqh",
  "Qira'ah (Hafs / Warsh)",
  "Kids Quran Specialist",
  "Adult Recitation Coaching",
  "Urdu & Arabic Spoken",
];

export const PROFILE_COMPLETION_FIELDS: ProfileFieldItem[] = [
  // 1. Personal & Contact (9 items)
  { key: "avatar", label: "Profile photo", category: "personal" },
  { key: "fullName", label: "Full name", category: "personal" },
  { key: "phone", label: "Contact number", category: "personal" },
  { key: "emergencyContactNumber", label: "Emergency contact", category: "personal" },
  { key: "gender", label: "Gender", category: "personal" },
  { key: "bloodGroup", label: "Blood group", category: "personal" },
  { key: "presentAddress", label: "Present address", category: "personal" },
  { key: "permanentAddress", label: "Permanent address", category: "personal" },
  { key: "bio", label: "Biography / Summary", category: "personal" },

  // 2. Professional & Academy (4 items)
  {
    key: "category",
    label: "Teacher category / designation",
    category: "professional",
    check: (t) => {
      if (!t) return false;
      if (typeof t.category === "object" && t.category !== null) {
        return Boolean(t.category._id || t.category.name);
      }
      return Boolean((t.category && String(t.category).trim() !== "") || (t.designation && String(t.designation).trim() !== ""));
    },
  },
  {
    key: "joinDate",
    label: "Joining date / service tenure",
    category: "professional",
    check: (t) => Boolean(t?.joinDate || (t?.currentService && String(t.currentService).trim().length > 0)),
  },
  {
    key: "version",
    label: "Medium / Versions (Bangla/English/Arabic)",
    category: "professional",
    check: (t) => Array.isArray(t?.version) && t.version.length > 0,
  },
  {
    key: "salary",
    label: "Salary / Revenue share percentage",
    category: "professional",
    check: (t) => {
      if (!t) return false;
      return (Number(t.salary) > 0) || (Boolean(t.salaryType) && t.salaryType !== "monthly");
    },
  },

  // 3. Public Portfolio & Credentials (7 items)
  { key: "portfolioHeadline", label: "Portfolio headline / tagline", category: "portfolio" },
  {
    key: "keyExpertise",
    label: "Key areas of expertise",
    category: "portfolio",
    check: (t) => Array.isArray(t?.keyExpertise) && t.keyExpertise.length > 0,
  },
  { key: "portfolioUrl", label: "External portfolio / Sanad URL", category: "portfolio" },
  { key: "impact", label: "Teaching philosophy & impact", category: "portfolio" },
  {
    key: "qualifications",
    label: "Academic qualifications & Sanad",
    category: "portfolio",
    check: (t) => Array.isArray(t?.qualifications) && t.qualifications.some((q: any) => q && (q.degree?.trim() || q.institute?.trim())),
  },
  {
    key: "experiences",
    label: "Teaching experience",
    category: "portfolio",
    check: (t) => Array.isArray(t?.experiences) && t.experiences.some((e: any) => e && (e.institute?.trim() || e.position?.trim())),
  },
  {
    key: "achievements",
    label: "Achievements & honors",
    category: "portfolio",
    check: (t) => Array.isArray(t?.achievements) && t.achievements.some((a: any) => a && a.title?.trim()),
  },

  // 4. Verification & Accounts (2 items)
  { key: "nidOrBirthCertificatePicture", label: "NID / Birth certificate picture", category: "verification" },
  {
    key: "paymentInfo",
    label: "Payment account details",
    category: "verification",
    check: (t) => {
      if (!t) return false;
      return Boolean(t.paymentInfo?.accountNumber || t.paymentInfo?.accountName || t.salary > 0);
    },
  },
];

export interface CategoryProgress {
  label: string;
  category: "personal" | "professional" | "portfolio" | "verification";
  done: number;
  total: number;
  pct: number;
}

export interface ProfileCompletionResult {
  pct: number;
  done: number;
  total: number;
  missing: string[];
  completed: string[];
  checks: Array<{
    key: string;
    label: string;
    category: "personal" | "professional" | "portfolio" | "verification";
    done: boolean;
  }>;
  byCategory: {
    personal: CategoryProgress;
    professional: CategoryProgress;
    portfolio: CategoryProgress;
    verification: CategoryProgress;
  };
  status: {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
  };
}

export function calcTeacherProfileCompletion(teacher: any): ProfileCompletionResult {
  const categoryLabels: Record<string, string> = {
    personal: "Personal & Contact",
    professional: "Professional Details",
    portfolio: "Portfolio & Credentials",
    verification: "Verification & Accounts",
  };

  if (!teacher) {
    const checks = PROFILE_COMPLETION_FIELDS.map((f) => ({
      key: f.key,
      label: f.label,
      category: f.category,
      done: false,
    }));
    return {
      pct: 0,
      done: 0,
      total: PROFILE_COMPLETION_FIELDS.length,
      missing: PROFILE_COMPLETION_FIELDS.map((f) => f.label),
      completed: [],
      checks,
      byCategory: {
        personal: { label: categoryLabels.personal, category: "personal", done: 0, total: 9, pct: 0 },
        professional: { label: categoryLabels.professional, category: "professional", done: 0, total: 4, pct: 0 },
        portfolio: { label: categoryLabels.portfolio, category: "portfolio", done: 0, total: 7, pct: 0 },
        verification: { label: categoryLabels.verification, category: "verification", done: 0, total: 2, pct: 0 },
      },
      status: {
        label: "Empty Profile",
        badgeBg: "bg-rose-50",
        badgeText: "text-rose-700",
        badgeBorder: "border-rose-200",
        barColor: "bg-rose-500",
      },
    };
  }

  const checks = PROFILE_COMPLETION_FIELDS.map((f) => {
    let done = false;
    if (f.check) {
      done = Boolean(f.check(teacher));
    } else {
      const val = teacher[f.key];
      if (typeof val === "string") {
        done = val.trim().length > 0;
      } else if (Array.isArray(val)) {
        done = val.length > 0;
      } else if (typeof val === "number") {
        done = !isNaN(val) && val > 0;
      } else if (val !== null && val !== undefined) {
        done = true;
      }
    }
    return {
      key: f.key,
      label: f.label,
      category: f.category,
      done,
    };
  });

  const done = checks.filter((c) => c.done).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  const completed = checks.filter((c) => c.done).map((c) => c.label);

  const categories = ["personal", "professional", "portfolio", "verification"] as const;
  const byCategory = {} as Record<string, CategoryProgress>;

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    const catDone = catChecks.filter((c) => c.done).length;
    const catTotal = catChecks.length;
    byCategory[cat] = {
      label: categoryLabels[cat],
      category: cat,
      done: catDone,
      total: catTotal,
      pct: catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 100,
    };
  }

  let status = {
    label: "Needs Info",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    badgeBorder: "border-rose-200",
    barColor: "bg-rose-500",
  };

  if (pct >= 85) {
    status = {
      label: pct === 100 ? "100% Fully Verified" : "Nearly Complete",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      badgeBorder: "border-emerald-200",
      barColor: "bg-emerald-500",
    };
  } else if (pct >= 50) {
    status = {
      label: "Good Progress",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-200",
      barColor: "bg-amber-500",
    };
  }

  return {
    pct,
    done,
    total,
    missing,
    completed,
    checks,
    byCategory: byCategory as ProfileCompletionResult["byCategory"],
    status,
  };
}

// ── Teacher Portal Mode-Wise Completion Scoring ──────────────────────────

export interface TeacherPortalCheckItem {
  key: string;
  label: string;
  mode: "personal" | "portfolio" | "payment";
  done: boolean;
  tab: "personal" | "portfolio" | "salary";
  href: string;
}

export interface TeacherPortalModeStats {
  mode: "personal" | "portfolio" | "payment";
  label: string;
  tab: "personal" | "portfolio" | "salary";
  href: string;
  done: number;
  total: number;
  pct: number;
  checks: TeacherPortalCheckItem[];
}

export interface TeacherPortalCompletionResult {
  overallPct: number;
  settingsPct: number;
  pct: number;
  done: number;
  total: number;
  settingsDone: number;
  settingsTotal: number;
  modes: {
    personal: TeacherPortalModeStats;
    portfolio: TeacherPortalModeStats;
    payment: TeacherPortalModeStats;
  };
  checks: TeacherPortalCheckItem[];
  missing: TeacherPortalCheckItem[];
  completed: TeacherPortalCheckItem[];
  status: {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
  };
}

export function calcTeacherPortalCompletion(p: any): TeacherPortalCompletionResult {
  // Mode 1: Personal & Contact (11 fields editable in Personal Tab)
  const personalChecks: TeacherPortalCheckItem[] = [
    {
      key: "avatar",
      label: "Profile photo",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.avatar && String(p.avatar).trim().length > 0),
    },
    {
      key: "fullName",
      label: "Full name",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.fullName && String(p.fullName).trim().length > 0),
    },
    {
      key: "phone",
      label: "Phone number",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.phone && String(p.phone).trim().length > 0),
    },
    {
      key: "emergencyContactNumber",
      label: "Emergency contact",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.emergencyContactNumber && String(p.emergencyContactNumber).trim().length > 0),
    },
    {
      key: "gender",
      label: "Gender",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.gender),
    },
    {
      key: "bloodGroup",
      label: "Blood group",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.bloodGroup),
    },
    {
      key: "presentAddress",
      label: "Present address",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.presentAddress && String(p.presentAddress).trim().length > 0),
    },
    {
      key: "permanentAddress",
      label: "Permanent address",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.permanentAddress && String(p.permanentAddress).trim().length > 0),
    },
    {
      key: "nidOrBirthCertificatePicture",
      label: "NID / Birth certificate",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.nidOrBirthCertificatePicture && String(p.nidOrBirthCertificatePicture).trim().length > 0),
    },
    {
      key: "bio",
      label: "Personal biography",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.bio && String(p.bio).trim().length > 0),
    },
    {
      key: "joinDate",
      label: "Current service tenure",
      mode: "personal",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(p?.joinDate || (p?.currentService && String(p.currentService).trim().length > 0)),
    },
  ];

  // Mode 2: Portfolio & Career (7 fields editable in Portfolio Tab)
  const portfolioChecks: TeacherPortalCheckItem[] = [
    {
      key: "portfolioHeadline",
      label: "Portfolio headline / tagline",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Boolean(p?.portfolioHeadline && String(p.portfolioHeadline).trim().length > 0),
    },
    {
      key: "portfolioUrl",
      label: "Portfolio / Website URL",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Boolean(p?.portfolioUrl && String(p.portfolioUrl).trim().length > 0),
    },
    {
      key: "keyExpertise",
      label: "Key of expertise skills",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Array.isArray(p?.keyExpertise) && p.keyExpertise.length > 0,
    },
    {
      key: "experiences",
      label: "Teaching experience",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Array.isArray(p?.experiences) && p.experiences.some((e: any) => e && (e.institute?.trim() || e.position?.trim())),
    },
    {
      key: "qualifications",
      label: "Sanad & qualifications",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Array.isArray(p?.qualifications) && p.qualifications.some((q: any) => q && (q.degree?.trim() || q.institute?.trim())),
    },
    {
      key: "achievements",
      label: "Achievements & honors",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Array.isArray(p?.achievements) && p.achievements.some((a: any) => a && a.title?.trim()),
    },
    {
      key: "impact",
      label: "Teaching impact & transformation",
      mode: "portfolio",
      tab: "portfolio",
      href: "/teacher/settings?tab=portfolio",
      done: Boolean(p?.impact && String(p.impact).trim().length > 0),
    },
  ];

  // Mode 3: Payment & Academy Assignment (4 fields managed in /teacher/salary and official assignments)
  const paymentChecks: TeacherPortalCheckItem[] = [
    {
      key: "paymentInfo",
      label: "Payment account details (Bank / bKash)",
      mode: "payment",
      tab: "salary",
      href: "/teacher/salary",
      done: Boolean(p?.paymentInfo?.accountNumber || p?.paymentInfo?.accountName || Number(p?.salary) > 0),
    },
    {
      key: "salary",
      label: "Salary / Revenue share percentage",
      mode: "payment",
      tab: "salary",
      href: "/teacher/salary",
      done: Boolean(Number(p?.salary) > 0 || (Boolean(p?.salaryType) && p.salaryType !== "monthly")),
    },
    {
      key: "category",
      label: "Teacher category / designation",
      mode: "payment",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Boolean(
        (typeof p?.category === "object" && p?.category !== null && (p?.category._id || p?.category.name)) ||
        (p?.category && String(p.category).trim() !== "") ||
        (p?.designation && String(p.designation).trim() !== "")
      ),
    },
    {
      key: "version",
      label: "Medium / Versions (Bangla/English/Arabic)",
      mode: "payment",
      tab: "personal",
      href: "/teacher/settings?tab=personal",
      done: Array.isArray(p?.version) && p.version.length > 0,
    },
  ];

  const calcModeStats = (
    mode: "personal" | "portfolio" | "payment",
    label: string,
    tab: "personal" | "portfolio" | "salary",
    href: string,
    checks: TeacherPortalCheckItem[]
  ): TeacherPortalModeStats => {
    const doneCount = checks.filter((c) => c.done).length;
    const totalCount = checks.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;
    return {
      mode,
      label,
      tab,
      href,
      done: doneCount,
      total: totalCount,
      pct,
      checks,
    };
  };

  const personalStats = calcModeStats("personal", "Personal & Contact", "personal", "/teacher/settings?tab=personal", personalChecks);
  const portfolioStats = calcModeStats("portfolio", "Portfolio & Career", "portfolio", "/teacher/settings?tab=portfolio", portfolioChecks);
  const paymentStats = calcModeStats("payment", "Payout & Assignment", "salary", "/teacher/salary", paymentChecks);

  const allChecks = [...personalChecks, ...portfolioChecks, ...paymentChecks];
  const settingsChecks = [...personalChecks, ...portfolioChecks];

  const done = allChecks.filter((c) => c.done).length;
  const total = allChecks.length;
  const overallPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const settingsDone = settingsChecks.filter((c) => c.done).length;
  const settingsTotal = settingsChecks.length;
  const settingsPct = settingsTotal > 0 ? Math.round((settingsDone / settingsTotal) * 100) : 0;

  const missing = allChecks.filter((c) => !c.done);
  const completed = allChecks.filter((c) => c.done);

  let status = {
    label: "Needs Info",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    badgeBorder: "border-rose-200",
    barColor: "bg-rose-500",
  };

  if (overallPct >= 85) {
    status = {
      label: overallPct === 100 ? "100% Fully Verified" : "Nearly Complete",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      badgeBorder: "border-emerald-200",
      barColor: "bg-emerald-500",
    };
  } else if (overallPct >= 50) {
    status = {
      label: "Good Progress",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-200",
      barColor: "bg-amber-500",
    };
  }

  return {
    overallPct,
    settingsPct,
    pct: overallPct,
    done,
    total,
    settingsDone,
    settingsTotal,
    modes: {
      personal: personalStats,
      portfolio: portfolioStats,
      payment: paymentStats,
    },
    checks: allChecks,
    missing,
    completed,
    status,
  };
}

