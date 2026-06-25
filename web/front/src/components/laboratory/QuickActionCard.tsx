import React from "react";
import { landing, colors, fontFamily, fontSize, fontWeight, radius, type SectionAccent } from "../../styles";

export interface QuickAction {
  icon: string;
  title: string;
  text: string;
  accent?: SectionAccent;
  onClick?: () => void;
}

const DEFAULT: SectionAccent = { main: colors.lab, soft: colors.labSoft };

export default function QuickActionCard({ icon, title, text, accent = DEFAULT, onClick }: QuickAction) {
  return (
    <button style={s.action} onClick={onClick}>
      <span style={{ ...s.icon, background: accent.soft, color: accent.main }}>{icon}</span>
      <span style={s.texts}>
        <strong style={s.title}>{title}</strong>
        <small style={s.text}>{text}</small>
      </span>
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  action: {
    alignItems: "center",
    background: "rgba(8,31,73,0.02)",
    border: landing.cardBorder,
    borderRadius: radius.xl,
    color: landing.navy,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: "12px",
    textAlign: "left",
    fontFamily: fontFamily.sans,
    transition: "border-color 0.15s, background 0.15s",
  },
  icon: {
    alignItems: "center",
    borderRadius: radius.md,
    display: "flex",
    fontSize: fontSize.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
    flexShrink: 0,
    fontWeight: fontWeight.bold,
  },
  texts: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  title: { display: "block", fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: landing.navy },
  text: { color: landing.textFaint, display: "block", fontSize: 11, fontWeight: fontWeight.regular },
};
