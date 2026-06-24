import React from "react";
import { palette } from "../../styles";

type LaboratoryCardProps = {
  children: React.ReactNode;
  title?: string;
  action?: string;
  onAction?: () => void;
  bg?: string;
  border?: string;
  subtle?: boolean;
};

export function LaboratoryCard({ children, title, action, onAction, bg = palette.white, border = palette.emerald200 }: LaboratoryCardProps) {
  return (
    <section style={{ ...styles.card, background: bg, borderColor: border }}>
      {title ? (
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {action ? <button type="button" style={styles.action} onClick={onAction}>{action}</button> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: palette.white,
    border: "1.5px solid",
    borderRadius: 18,
    minWidth: 0,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px",
    borderBottom: `1px solid ${palette.slate100}`,
  },
  title: {
    color: palette.slate900,
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  action: {
    background: palette.emerald50,
    border: `1px solid ${palette.emerald200}`,
    borderRadius: 8,
    color: palette.emerald500,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
  },
};
