import React from "react";
import { palette, fontFamily, fontSize, fontWeight, radius } from "../../styles";

export interface QuickAction {
  icon: string;
  title: string;
  text: string;
  onClick?: () => void;
}

export default function QuickActionCard({ icon, title, text, onClick }: QuickAction) {
  return (
    <button style={s.action} onClick={onClick}>
      <span style={s.icon}>{icon}</span>
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
    background: palette.slate50,
    border: `1.5px solid ${palette.slate100}`,
    borderRadius: radius.lg,
    color: palette.slate900,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: "12px",
    textAlign: "left",
    transition: "border-color 0.15s",
  },
  icon: {
    alignItems: "center",
    background: palette.emerald50,
    borderRadius: radius.md,
    color: palette.emerald500,
    display: "flex",
    fontSize: fontSize.md,
    height: 34,
    justifyContent: "center",
    width: 34,
    flexShrink: 0,
    fontWeight: fontWeight.bold,
  },
  texts: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  title: { display: "block", fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: palette.slate900 },
  text: { color: palette.slate400, display: "block", fontSize: 10, fontWeight: fontWeight.regular },
};
