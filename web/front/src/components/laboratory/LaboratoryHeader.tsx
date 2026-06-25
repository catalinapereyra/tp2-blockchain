import { palette, fontFamily } from "../../styles";
type LaboratoryHeaderProps = {
  address: string | null;
};

export function LaboratoryHeader({ address }: LaboratoryHeaderProps) {
  const shortAddress = address ? `${address.slice(0, 6)}...Lab01` : "0x94F3...Lab01";

  return (
    <header style={styles.header}>
      <div />
      <div style={styles.actions}>
        <button style={styles.bell}>♢</button>
        <div style={styles.wallet}>{shortAddress}</div>
        <div style={styles.avatar}>LB</div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    alignItems: "center",
    background: palette.white,
    borderBottom: `1px solid ${palette.labBorder3}`,
    display: "flex",
    height: 84,
    justifyContent: "space-between",
    padding: "0 36px",
  },
  actions: {
    alignItems: "center",
    display: "flex",
    gap: 16,
  },
  bell: {
    background: "transparent",
    border: "none",
    color: palette.labGray,
    cursor: "pointer",
    fontSize: 24,
  },
  wallet: {
    border: `1px solid ${palette.labBorder2}`,
    borderRadius: 999,
    color: palette.labMuted,
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 32px",
  },
  avatar: {
    alignItems: "center",
    background: palette.violetSoft1,
    borderRadius: "50%",
    color: palette.violet500,
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
};
