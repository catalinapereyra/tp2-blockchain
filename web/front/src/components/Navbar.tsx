import { useWallet } from "../context/WalletContext";

export default function Navbar() {
  const { address, roleLabel, isAdmin, logout } = useWallet();

  return (
    <nav style={styles.nav}>
      <span style={styles.logo}>🏥 MediChain</span>
      {address && (
        <div style={styles.right}>
          <span style={styles.info}>
            {isAdmin ? "Admin" : roleLabel || "Sin rol"} ·{" "}
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button style={styles.btn} onClick={logout}>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    background: "#1e40af",
    color: "white",
  },
  logo: { fontSize: 18, fontWeight: 700 },
  right: { display: "flex", alignItems: "center", gap: 12 },
  info: { fontSize: 13, opacity: 0.9 },
  btn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
};
