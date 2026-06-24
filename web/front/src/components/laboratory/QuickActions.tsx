import { quickActions } from "./laboratoryData";
import { LaboratoryCard } from "./LaboratoryCard";

export function QuickActions() {
  return (
    <LaboratoryCard title="Acciones rápidas">
      <div style={styles.grid}>
        {quickActions.map((action) => (
          <button key={action.title} style={styles.action}>
            <span style={styles.icon}>{action.icon}</span>
            <span style={styles.texts}>
              <strong style={styles.title}>{action.title}</strong>
              <small style={styles.text}>{action.text}</small>
            </span>
          </button>
        ))}
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", padding: "16px 20px 20px" },
  action: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1.5px solid #f1f5f9",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: "12px",
    textAlign: "left",
    transition: "border-color 0.15s",
  },
  icon: {
    alignItems: "center",
    background: "#f0fdf4",
    borderRadius: 10,
    color: "#10b981",
    display: "flex",
    fontSize: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
    flexShrink: 0,
  },
  texts: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  title: { display: "block", fontSize: 11, fontWeight: 600, color: "#0f172a" },
  text: { color: "#94a3b8", display: "block", fontSize: 10, fontWeight: 400 },
};
