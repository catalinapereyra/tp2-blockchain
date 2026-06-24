import { palette } from "../../styles";
type LaboratoryStatsProps = {
  totalStudies: number;
  loading?: boolean;
};

export function LaboratoryStats({ totalStudies, loading = false }: LaboratoryStatsProps) {
  return (
    <div style={styles.chip}>
      <span style={styles.value}>{loading ? "..." : totalStudies}</span>
      <span style={styles.label}>estudios subidos</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: palette.emerald50,
    border: `1px solid ${palette.emerald200}`,
    borderRadius: 20,
    padding: "6px 14px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  value: { fontSize: 16, fontWeight: 700, color: palette.emerald500 },
  label: { fontSize: 12, fontWeight: 500, color: palette.slate500 },
};
