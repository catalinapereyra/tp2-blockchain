import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

const ADMIN_ADDRESS = (import.meta.env.VITE_ADMIN_ADDRESS as string).toLowerCase();

const ROLES = [
  {
    key: "patient",
    icon: "👤",
    title: "Paciente",
    desc: "Accedé a tu historial médico, documentos y recetas.",
    color: "#1e40af",
  },
  {
    key: "doctor",
    icon: "🩺",
    title: "Médico / Profesional",
    desc: "Emitís recetas, registrás documentos y gestionás pacientes.",
    color: "#0369a1",
  },
  {
    key: "lab",
    icon: "🔬",
    title: "Laboratorio / Institución",
    desc: "Cargás resultados y estudios con validación en blockchain.",
    color: "#0891b2",
  },
];

export default function Home() {
  const { address, role, isRegistered, isApproved, isAdmin, loading, connect } = useWallet();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);

  // Leer la cuenta activa en MetaMask sin conectar
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const addr = eth.selectedAddress;
    if (addr) setCurrentAccount(addr);
    eth.on("accountsChanged", (accounts: string[]) => {
      setCurrentAccount(accounts[0] || null);
    });
  }, []);

  useEffect(() => {
    if (loading || !address) return;
    if (isAdmin) { navigate("/admin"); return; }
    if (!isRegistered) { navigate("/register"); return; }
    if (!isApproved) { navigate("/pending"); return; }
    if (role === 0) navigate("/patient");
    else navigate("/doctor");
  }, [address, role, isRegistered, isApproved, isAdmin, loading]);

  async function handleConnect(roleKey: string) {
    setSelected(roleKey);
    localStorage.setItem("intended_role", roleKey);
    await connect();
  }

  const isAdminWallet = currentAccount?.toLowerCase() === ADMIN_ADDRESS;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>🏥</div>
        <h1 style={styles.title}>MediChain</h1>
        <p style={styles.subtitle}>Gestión de documentos médicos en blockchain</p>
      </div>

      {isAdminWallet ? (
        /* Vista especial solo para la wallet admin */
        <div style={styles.adminCard}>
          <div style={styles.adminIcon}>🔐</div>
          <h2 style={styles.adminTitle}>Panel de Administración</h2>
          <p style={styles.adminDesc}>
            Wallet detectada: <code style={styles.adminAddr}>{currentAccount!.slice(0, 10)}...{currentAccount!.slice(-6)}</code>
          </p>
          <button
            style={styles.adminBtn}
            onClick={() => handleConnect("admin")}
            disabled={loading}
          >
            {loading ? "Conectando..." : "Acceder como Administrador"}
          </button>
        </div>
      ) : (
        /* Vista normal para pacientes y profesionales */
        <>
          <div style={styles.cards}>
            {ROLES.map((r) => (
              <div key={r.key} style={{ ...styles.card, borderTop: `4px solid ${r.color}` }}>
                <div style={styles.icon}>{r.icon}</div>
                <h2 style={{ ...styles.cardTitle, color: r.color }}>{r.title}</h2>
                <p style={styles.cardDesc}>{r.desc}</p>
                <button
                  style={{ ...styles.btn, background: r.color }}
                  onClick={() => handleConnect(r.key)}
                  disabled={loading}
                >
                  {loading && selected === r.key ? "Conectando..." : "Entrar"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={styles.footer}>Documentos firmados y verificados</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0ea5e9 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  },
  header: { textAlign: "center", marginBottom: 32 },
  logo: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 40, fontWeight: 900, color: "white", margin: 0, letterSpacing: -1 },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
  accountBadge: {
    background: "rgba(255,255,255,0.12)",
    color: "white",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    marginBottom: 24,
    textAlign: "center",
  },
  accountNote: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  cards: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap" as const,
    justifyContent: "center",
    maxWidth: 960,
    width: "100%",
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: "32px 28px",
    width: 260,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
  },
  icon: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  cardDesc: { color: "#64748b", fontSize: 14, lineHeight: 1.5, marginBottom: 24, flexGrow: 1 },
  btn: {
    color: "white",
    border: "none",
    padding: "12px 0",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  footer: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 32 },
  adminCard: {
    background: "white",
    borderRadius: 20,
    padding: "48px 40px",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    textAlign: "center" as const,
    border: "2px solid #6366f1",
  },
  adminIcon: { fontSize: 52, marginBottom: 12 },
  adminTitle: { fontSize: 22, fontWeight: 800, color: "#1e1b4b", margin: "0 0 10px" },
  adminDesc: { color: "#64748b", fontSize: 14, marginBottom: 28 },
  adminAddr: { background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontSize: 13, fontFamily: "monospace" },
  adminBtn: {
    width: "100%", background: "#4f46e5", color: "white", border: "none",
    padding: "14px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
};
