import { landing, colors, fontSize, fontWeight, radius } from "../../styles";
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
    background: landing.cardBg,
    border: landing.cardBorder,
    boxShadow: landing.softShadow,
    borderRadius: radius.full,
    padding: "8px 16px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.lab },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: landing.textBody },
};
