import React from "react";
import { landing, colors, fontFamily, fontSize, fontWeight, radius, type SectionAccent } from "../../styles";

type LaboratoryCardProps = {
  children: React.ReactNode;
  title?: string;
  action?: string;
  onAction?: () => void;
  accent?: SectionAccent;
};

const LAB: SectionAccent = { main: colors.lab, soft: colors.labSoft };

export function LaboratoryCard({ children, title, action, onAction, accent = LAB }: LaboratoryCardProps) {
  return (
    <section style={styles.card}>
      {title ? (
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {action ? (
            <button type="button" style={{ ...styles.action, background: accent.soft, color: accent.main }} onClick={onAction}>
              {action}
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: landing.cardBg,
    border: landing.cardBorder,
    borderRadius: radius["3xl"],
    minWidth: 0,
    overflow: "hidden",
    boxShadow: landing.softShadow,
    fontFamily: fontFamily.sans,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px",
    borderBottom: `1px solid ${landing.hairline}`,
  },
  title: {
    color: landing.navy,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  action: {
    border: "none",
    borderRadius: radius.full,
    cursor: "pointer",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    padding: "6px 14px",
  },
};
