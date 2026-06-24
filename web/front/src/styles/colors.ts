export const palette = {
  white: "#ffffff",

  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  gray50: "#f9fafb",
  neutral50: "#fafafa",

  //(paneles de laboratorio)
  labInk: "#344462",
  labMuted: "#536582",
  labMuted2: "#52627e",
  labGray: "#60708d",
  labGray2: "#61708d",
  labGray3: "#667797",
  labBorder1: "#e3eaf4",
  labBorder2: "#e4eaf4",
  labBorder3: "#e5ebf5",

  //(marca / paciente)
  indigoSoft: "#f5f3ff",
  indigo50: "#eef2ff",
  indigo100: "#e0e7ff",
  indigo200: "#ddd6fe",
  indigo500: "#6366f1",
  indigo600: "#4f46e5",
  indigo700: "#1e40af",
  violet100: "#ede9fe",
  violet500: "#7155d9",
  violetSoft1: "#f1edff",
  violetSoft2: "#f1f6ff",

  //azul
  blue50: "#eff6ff",
  blue600: "#2563eb",
  blue700: "#1d4ed8",

  //sky (medico)
  sky50: "#f0f9ff",
  sky100: "#e0f2fe",
  sky200: "#bae6fd",
  sky500: "#0ea5e9",

  //(laboratorio / exito)
  mint50: "#ecfdf5",
  emerald50: "#f0fdf4",
  emerald200: "#bbf7d0",
  emerald500: "#10b981",
  emerald600: "#16a34a",
  emeraldDeep: "#059669",
  green100: "#dcfce7",
  green700: "#15803d",

  amberSoft: "#fffdf5",
  amber50: "#fffbeb",
  amber100: "#fff7ed",
  amber200: "#fde68a",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber800: "#92400e",
  amber900: "#78350f",
  orange100: "#ffedd5",
  orange500: "#f97316",

  red50: "#fef2f2",
  red100: "#fee2e2",
  red200: "#fecaca",
  red300: "#fca5a5",
  red500: "#ef4444",
  red600: "#dc2626",

  bgIndigoTint: "#f8faff",
  bgMint: "#f0fdf8",
} as const;

export const colors = {
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
  labButton: "linear-gradient(135deg, #10b981, #059669)",
  labCard: "linear-gradient(135deg, #ecfdf5, #f8fafc)",
} as const;
