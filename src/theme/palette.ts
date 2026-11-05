/**
 * The app's colours, taken from the web portals: brand navy + gold chrome, blue-600 actions,
 * gradient KPI tiles. Every screen reads colours from here (through useTheme) so light and dark both work.
 */

export interface Palette {
  /** Page background */
  bg: string;
  /** Cards, sheets, inputs */
  surface: string;
  /** A quieter surface inside a card: table headers, chips, wells */
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textFaint: string;
  /** Text on top of navy / gradients / primary buttons */
  onDark: string;
  onDarkMuted: string;

  /** Brand chrome */
  navy: string;
  navyDeep: string;
  gold: string;

  /** Main action colour (blue-600) */
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;

  success: string;
  successSoft: string;
  successText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  info: string;
  infoSoft: string;
  infoText: string;
  violet: string;
  violetSoft: string;
  violetText: string;
  neutralSoft: string;
  neutralText: string;

  inputBg: string;
  placeholder: string;
  skeleton: string;
  overlay: string;
  shadow: string;
}

export const lightPalette: Palette = {
  bg: "#f3f6fc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  text: "#0f172a",
  textMuted: "#475569",
  textFaint: "#94a3b8",
  onDark: "#ffffff",
  onDarkMuted: "rgba(191,219,254,0.78)",

  navy: "#0B1A45",
  navyDeep: "#060d20",
  gold: "#DFB76C",

  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  primarySoft: "#eff6ff",
  primaryText: "#1d4ed8",

  success: "#059669",
  successSoft: "#ecfdf5",
  successText: "#047857",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  warningText: "#b45309",
  danger: "#e11d48",
  dangerSoft: "#fff1f2",
  dangerText: "#be123c",
  info: "#0284c7",
  infoSoft: "#f0f9ff",
  infoText: "#0369a1",
  violet: "#7c3aed",
  violetSoft: "#f5f3ff",
  violetText: "#6d28d9",
  neutralSoft: "#f1f5f9",
  neutralText: "#475569",

  inputBg: "#ffffff",
  placeholder: "#94a3b8",
  skeleton: "#e2e8f0",
  overlay: "rgba(6,13,32,0.55)",
  shadow: "#0f172a",
};

export const darkPalette: Palette = {
  bg: "#04070f",
  surface: "#0f172a",
  surfaceAlt: "#1a2438",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",

  text: "#f1f5f9",
  textMuted: "#a8b4c7",
  textFaint: "#64748b",
  onDark: "#ffffff",
  onDarkMuted: "rgba(191,219,254,0.78)",

  navy: "#0B1A45",
  navyDeep: "#060d20",
  gold: "#DFB76C",

  primary: "#3b82f6",
  primaryPressed: "#2563eb",
  primarySoft: "rgba(59,130,246,0.16)",
  primaryText: "#93c5fd",

  success: "#10b981",
  successSoft: "rgba(16,185,129,0.16)",
  successText: "#6ee7b7",
  warning: "#f59e0b",
  warningSoft: "rgba(245,158,11,0.16)",
  warningText: "#fcd34d",
  danger: "#f43f5e",
  dangerSoft: "rgba(244,63,94,0.16)",
  dangerText: "#fda4af",
  info: "#38bdf8",
  infoSoft: "rgba(56,189,248,0.16)",
  infoText: "#7dd3fc",
  violet: "#a78bfa",
  violetSoft: "rgba(167,139,250,0.16)",
  violetText: "#c4b5fd",
  neutralSoft: "rgba(148,163,184,0.16)",
  neutralText: "#cbd5e1",

  inputBg: "#131c2e",
  placeholder: "#64748b",
  skeleton: "#1e293b",
  overlay: "rgba(0,0,0,0.65)",
  shadow: "#000000",
};

/** Gradient pairs for KPI tiles and hero cards (same in light and dark: they carry white text) */
export const gradients = {
  blue: ["#3b82f6", "#1d4ed8"],
  violet: ["#8b5cf6", "#6d28d9"],
  emerald: ["#10b981", "#047857"],
  amber: ["#f59e0b", "#ea580c"],
  rose: ["#f43f5e", "#be123c"],
  sky: ["#38bdf8", "#0369a1"],
  navy: ["#0B1A45", "#162C65"],
  navyDeep: ["#060d20", "#0d1b3e"],
  gold: ["#DFB76C", "#b8893a"],
  slate: ["#475569", "#1e293b"],
} as const satisfies Record<string, readonly [string, string]>;

export type GradientName = keyof typeof gradients;

/** The tones a badge, banner or icon chip can take */
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "violet" | "neutral";

export function toneColors(c: Palette, tone: Tone): { fg: string; bg: string; solid: string } {
  switch (tone) {
    case "success":
      return { fg: c.successText, bg: c.successSoft, solid: c.success };
    case "warning":
      return { fg: c.warningText, bg: c.warningSoft, solid: c.warning };
    case "danger":
      return { fg: c.dangerText, bg: c.dangerSoft, solid: c.danger };
    case "info":
      return { fg: c.infoText, bg: c.infoSoft, solid: c.info };
    case "violet":
      return { fg: c.violetText, bg: c.violetSoft, solid: c.violet };
    case "neutral":
      return { fg: c.neutralText, bg: c.neutralSoft, solid: c.textMuted };
    default:
      return { fg: c.primaryText, bg: c.primarySoft, solid: c.primary };
  }
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
