import { colors } from "./colors";

export const fontFamily = {
  sans: "'DM Sans', sans-serif",
  mono: "monospace",
} as const;


export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 22,
  "4xl": 28,
  display: 42,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;


export const text = {
  pageTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: "-0.4px",
    margin: 0,
  },
  pageSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    color: colors.textFaint,
    margin: 0,
  },
  sectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 1.5,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
} as const;
