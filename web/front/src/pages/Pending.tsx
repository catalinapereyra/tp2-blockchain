import { useWallet } from "../context/WalletContext";

export default function Pending() {
  const { address, refresh } = useWallet();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <span style={styles.icon}>⏳</span>
        <h2 style={styles.title}>Solicitud pendiente</h2>
        <p style={styles.text}>
          Tu solicitud de registro está siendo revisada por el administrador.
          Una vez aprobada, podrás acceder a la plataforma.
        </p>
        <p style={styles.wallet}>{address}</p>
        <button style={styles.btn} onClick={refresh}>
          Verificar estado
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  card: { background: "white", borderRadius: 16, padding: "48px 40px", textAlign: "center", maxWidth: 420, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  icon: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "16px 0 8px" },
  text: { color: "#64748b", lineHeight: 1.6, marginBottom: 16 },
  wallet: { fontSize: 12, color: "#94a3b8", fontFamily: "monospace", marginBottom: 24, wordBreak: "break-all" },
  btn: { background: "#1e40af", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
};
