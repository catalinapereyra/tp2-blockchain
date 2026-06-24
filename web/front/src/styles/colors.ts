
export const palette = {
  white: "#ffffff",

  // Neutros (slate)
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate800: "#1e293b",
  slate900: "#0f172a",

  indigoSoft: "#f5f3ff",
  indigo50: "#eef2ff",
  indigo100: "#e0e7ff",
  indigo200: "#ddd6fe",
  indigo500: "#6366f1",
  indigo700: "#1e40af",

  sky50: "#f0f9ff",
  sky500: "#0ea5e9",

  emerald50: "#f0fdf4",
  emerald200: "#bbf7d0",
  emerald500: "#10b981",
  emerald600: "#16a34a",

  amber50: "#fffbeb",
  amber100: "#fff7ed",
  amber200: "#fde68a",
  amber500: "#f59e0b",
  amber600: "#d97706",

  red50: "#fef2f2",
  red200: "#fecaca",
  red500: "#ef4444",
  red600: "#dc2626",
} as const;

export const colors = {
  // Texto
  text: palette.slate900,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textFaint: palette.slate400,
  textOnBrand: palette.white,

  surface: palette.white,
  bgApp: palette.slate50,
  bgSubtle: palette.slate100,
  border: palette.slate200,
  borderStrong: palette.slate300,

  primary: palette.indigo500,
  primaryDark: palette.indigo700,
  primarySoft: palette.indigoSoft,
  doctor: palette.sky500,
  doctorSoft: palette.sky50,
  lab: palette.emerald500,
  labSoft: palette.emerald50,

  success: { fg: palette.emerald600, bg: palette.emerald50, border: palette.emerald200 },
  error: { fg: palette.red600, bg: palette.red50, border: palette.red200 },
  warning: { fg: palette.amber600, bg: palette.amber50, border: palette.amber200 },
  info: { fg: palette.indigo500, bg: palette.indigo50, border: palette.indigo100 },
} as const;


export const roleAccent = {
  patient: colors.primary,
  doctor: colors.doctor,
  lab: colors.lab,
  admin: colors.primary,
} as const;

export const gradients = {
  app: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
} as const;
