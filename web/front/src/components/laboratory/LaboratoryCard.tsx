import React from "react";

type LaboratoryCardProps = {
  children: React.ReactNode;
  title?: string;
  action?: string;
  onAction?: () => void;
  subtle?: boolean;
};

export function LaboratoryCard({ children, title, action, onAction, subtle = false }: LaboratoryCardProps) {
  return (
    <section style={{ ...styles.card, ...(subtle ? styles.subtle : {}) }}>
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
    background: "#ffffff",
    border: "1px solid #e4eaf4",
    borderRadius: 8,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
    minWidth: 0,
    overflow: "hidden",
  },
  subtle: {
    background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    padding: "20px 24px",
    borderBottom: "1px solid #eef2f7",
  },
  title: {
    color: "#12224a",
    fontSize: 17,
    fontWeight: 800,
  },
  action: {
    background: "#f3efff",
    border: "1px solid #e4dcff",
    borderRadius: 6,
    color: "#7357e8",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
};
