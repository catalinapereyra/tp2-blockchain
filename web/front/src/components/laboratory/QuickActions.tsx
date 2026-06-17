import { quickActions } from "./laboratoryData";
import { LaboratoryCard } from "./LaboratoryCard";

export function QuickActions() {
  return (
    <LaboratoryCard title="Acciones Rapidas">
      <div style={styles.grid}>
        {quickActions.map((action) => (
          <button key={action.title} style={styles.action}>
            <span style={styles.icon}>{action.icon}</span>
            <span>
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
  grid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", padding: 18 },
  action: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e6edf6",
    borderRadius: 8,
    color: "#2b3b59",
    cursor: "pointer",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "42px minmax(0, 1fr)",
    minHeight: 78,
    padding: 14,
    textAlign: "left",
  },
  icon: {
    alignItems: "center",
    background: "#eff6ff",
    borderRadius: "50%",
    color: "#2563eb",
    display: "flex",
    fontSize: 10,
    fontWeight: 900,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  title: { display: "block", fontSize: 12, lineHeight: 1.3 },
  text: { color: "#64748b", display: "block", fontSize: 11, fontWeight: 800, marginTop: 4 },
};
