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
    background: "#ffffff",
    borderBottom: "1px solid #e5ebf5",
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
    color: "#60708d",
    cursor: "pointer",
    fontSize: 24,
  },
  wallet: {
    border: "1px solid #e4eaf4",
    borderRadius: 999,
    color: "#536582",
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 32px",
  },
  avatar: {
    alignItems: "center",
    background: "#f1edff",
    borderRadius: "50%",
    color: "#7155d9",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
};
