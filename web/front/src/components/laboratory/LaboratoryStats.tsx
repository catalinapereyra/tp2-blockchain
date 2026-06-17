type LaboratoryStatsProps = {
  totalStudies: number;
  loading?: boolean;
};

export function LaboratoryStats({ totalStudies, loading = false }: LaboratoryStatsProps) {
  return (
    <div style={styles.grid}>
      <article style={styles.stat}>
        <div style={styles.label}>Estudios Subidos</div>
        <strong style={styles.value}>{loading ? "..." : totalStudies}</strong>
        <span style={styles.success}>Total registrados</span>
      </article>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(190px, 260px)",
  },
  stat: {
    background: "#ffffff",
    border: "1px solid #e4eaf4",
    borderRadius: 8,
    minHeight: 126,
    padding: "22px 20px",
  },
  label: { color: "#5c6b89", fontSize: 12, fontWeight: 900, marginBottom: 14 },
  value: { color: "#12224a", display: "block", fontSize: 28, fontWeight: 900, marginBottom: 10 },
  success: { color: "#16a34a", fontSize: 12, fontWeight: 900 },
  warning: { color: "#7c3aed", fontSize: 12, fontWeight: 900 },
};
