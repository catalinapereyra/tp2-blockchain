import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

const ADMIN_ADDRESS = (import.meta.env.VITE_ADMIN_ADDRESS as string).toLowerCase();

const ROLES = [
  {
    key: "patient",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    title: "Paciente",
    desc: "Accedé a tu historial médico, documentos y recetas.",
    accent: "#6366f1",
    bg: "#f5f3ff",
  },
  {
    key: "doctor",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    title: "Médico / Profesional",
    desc: "Emitís recetas y registrás diagnósticos para tus pacientes.",
    accent: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    key: "lab",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0a5 5 0 0 0 10 0M9 14H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4"/>
      </svg>
    ),
    title: "Laboratorio",
    desc: "Cargás resultados y estudios verificados en blockchain.",
    accent: "#10b981",
    bg: "#f0fdf4",
  },
];

export default function Home() {
  const { address, role, isRegistered, isApproved, isAdmin, loading, connect } = useWallet();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

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
    else if (role === 1) navigate("/doctor");
    else navigate("/lab");
  }, [address, role, isRegistered, isApproved, isAdmin, loading]);

  async function handleConnect(roleKey: string) {
    setSelected(roleKey);
    localStorage.setItem("intended_role", roleKey);
    await connect();
  }

  const isAdminWallet = currentAccount?.toLowerCase() === ADMIN_ADDRESS;

  return (
    <div style={styles.page}>
      {/* Fondo decorativo */}
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      <div style={styles.inner}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h1 style={styles.title}>MediChain</h1>
          <p style={styles.subtitle}>Documentos médicos firmados y verificados en blockchain</p>
        </div>

        {isAdminWallet ? (
          <div style={styles.adminCard}>
            <div style={styles.adminIconWrap}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p style={styles.adminLabel}>Panel de administración</p>
            <p style={styles.adminAddr}>
              {currentAccount!.slice(0, 6)}...{currentAccount!.slice(-4)}
            </p>
            <button
              style={styles.adminBtn}
              onClick={() => handleConnect("admin")}
              disabled={loading}
            >
              {loading ? "Conectando…" : "Acceder"}
            </button>
          </div>
        ) : (
          <div style={styles.cards}>
            {ROLES.map((r) => {
              const isHovered = hovered === r.key;
              const isLoading = loading && selected === r.key;
              return (
                <div
                  key={r.key}
                  style={{
                    ...styles.card,
                    ...(isHovered ? { transform: "translateY(-4px)", boxShadow: "0 16px 40px rgba(0,0,0,0.10)" } : {}),
                  }}
                  onMouseEnter={() => setHovered(r.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div style={{ ...styles.iconCircle, background: r.bg, color: r.accent }}>
                    {r.icon}
                  </div>
                  <h2 style={{ ...styles.cardTitle, color: "#0f172a" }}>{r.title}</h2>
                  <p style={styles.cardDesc}>{r.desc}</p>
                  <button
                    style={{
                      ...styles.btn,
                      background: isHovered ? r.accent : "transparent",
                      color: isHovered ? "white" : r.accent,
                      borderColor: r.accent,
                    }}
                    onClick={() => handleConnect(r.key)}
                    disabled={loading}
                  >
                    {isLoading ? "Conectando…" : "Entrar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p style={styles.footer}>
          <span style={styles.footerDot} />
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  bgBlob1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  bgBlob2: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.11) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  inner: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 24px",
    width: "100%",
    maxWidth: 900,
  },
  header: {
    textAlign: "center",
    marginBottom: 56,
  },
  logoWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "#f5f3ff",
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 10px",
    letterSpacing: "-1.5px",
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: 400,
    margin: 0,
  },
  cards: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap" as const,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: "36px 28px",
    width: 252,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: 12,
    border: "1px solid #f1f5f9",
    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "default",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.3px",
  },
  cardDesc: {
    color: "#94a3b8",
    fontSize: 13.5,
    lineHeight: 1.6,
    margin: 0,
    flexGrow: 1,
  },
  btn: {
    marginTop: 8,
    border: "1.5px solid",
    padding: "9px 22px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.18s, color 0.18s",
    fontFamily: "'DM Sans', sans-serif",
    alignSelf: "stretch",
    textAlign: "center" as const,
  },
  footer: {
    marginTop: 52,
    fontSize: 12,
    color: "#cbd5e1",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 400,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#10b981",
    display: "inline-block",
  },
  // Admin
  adminCard: {
    background: "white",
    borderRadius: 20,
    padding: "40px 36px",
    maxWidth: 340,
    width: "100%",
    border: "1px solid #ede9fe",
    boxShadow: "0 4px 16px rgba(99,102,241,0.08)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
  },
  adminIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "#f5f3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  adminLabel: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  adminAddr: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "monospace",
    margin: 0,
  },
  adminBtn: {
    marginTop: 16,
    width: "100%",
    background: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "12px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
};
