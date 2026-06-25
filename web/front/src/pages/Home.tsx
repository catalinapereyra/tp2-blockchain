import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { getErrorMessage } from "../lib/error";
import { Brand } from "../components/landing/Brand";
import { Icon, type IconName } from "../components/landing/Icon";
import "../components/landing/Landing.css";

const ADMIN_ADDRESS = (import.meta.env.VITE_ADMIN_ADDRESS as string).toLowerCase();

const ROLES: { key: string; icon: IconName; title: string; desc: string }[] = [
  { key: "patient", icon: "user", title: "Paciente", desc: "Accedé a tu historial médico, documentos y recetas." },
  { key: "doctor", icon: "doctor", title: "Médico / Profesional", desc: "Emitís recetas y registrás diagnósticos para tus pacientes." },
  { key: "lab", icon: "lab", title: "Laboratorio", desc: "Cargás resultados y estudios verificados en blockchain." },
];

export default function Home() {
  const { address, role, isRegistered, isApproved, isAdmin, loading, connect } = useWallet();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    if (eth.selectedAddress) setCurrentAccount(eth.selectedAddress);
    eth.on("accountsChanged", (accounts: string[]) => setCurrentAccount(accounts[0] || null));
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
    setConnectError(null);
    localStorage.setItem("intended_role", roleKey);
    try {
      await connect();
    } catch (e: unknown) {
      setConnectError(getErrorMessage(e));
    }
  }

  const isAdminWallet = currentAccount?.toLowerCase() === ADMIN_ADDRESS;

  return (
    <main className="landing">
      <header className="landing-header">
        <Brand ariaLabel="MediChain, inicio" />
        <button type="button" style={s.back} onClick={() => navigate("/")}>
          <span style={{ transform: "scaleX(-1)", display: "inline-flex" }}><Icon name="arrow" size={16} /></span>
          Volver a inicio
        </button>
      </header>

      <section style={s.section}>
        <p style={s.eyebrow}>Iniciá sesión</p>
        <h1 style={s.title}>Elegí cómo querés entrar</h1>
        <p style={s.subtitle}>Conectá tu wallet con el rol que corresponda. Tu identidad queda on-chain; tus datos, privados.</p>

        {isAdminWallet ? (
          <div style={s.adminCard}>
            <span style={s.adminIcon}><Icon name="shield" size={26} /></span>
            <div style={s.adminInfo}>
              <span style={s.adminLabel}>Panel de administración</span>
              <span style={s.adminAddr}>{currentAccount!.slice(0, 6)}…{currentAccount!.slice(-4)}</span>
            </div>
            <button className="primary-button" style={s.adminBtn} onClick={() => handleConnect("admin")} disabled={loading}>
              {loading ? "Conectando…" : "Acceder"}
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {ROLES.map((r) => (
              <button key={r.key} style={s.card} onClick={() => handleConnect(r.key)} disabled={loading}>
                <span style={s.cardIcon}><Icon name={r.icon} size={32} /></span>
                <h3 style={s.cardTitle}>{r.title}</h3>
                <p style={s.cardDesc}>{r.desc}</p>
                <span style={s.cardCta}>
                  {loading && selected === r.key ? "Conectando…" : "Entrar"}
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}

        {connectError && <p style={s.error}>{connectError}</p>}
      </section>
    </main>
  );
}

const NAVY = "#081f49";
const TURQ = "#03bec3";
const TEXT = "#53627c";
const GRADIENT = "linear-gradient(100deg, #02c6bd 0%, #05aeea 48%, #7852ff 100%)";

const s: Record<string, React.CSSProperties> = {
  back: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(8,31,73,0.1)",
    color: NAVY, fontWeight: 600, fontSize: 14, padding: "9px 16px", borderRadius: 999,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  section: {
    maxWidth: 980, margin: "0 auto", padding: "40px 24px 80px",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
  },
  eyebrow: { color: TURQ, fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 },
  title: { color: NAVY, fontSize: 38, fontWeight: 700, margin: "10px 0 12px", letterSpacing: "-0.02em" },
  subtitle: { color: TEXT, fontSize: 16, maxWidth: 560, lineHeight: 1.6, margin: "0 0 40px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 24, width: "100%" },
  card: {
    background: "rgba(255,255,255,0.92)", border: "1px solid rgba(8,31,73,0.08)",
    borderRadius: 26, padding: "40px 34px", textAlign: "left",
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    boxShadow: "0 18px 50px rgba(8,31,73,0.08)", transition: "transform 0.18s, box-shadow 0.18s",
  },
  cardIcon: {
    width: 66, height: 66, borderRadius: 18,
    background: "linear-gradient(135deg, rgba(3,190,195,0.16), rgba(120,82,255,0.14))",
    color: TURQ, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  cardTitle: { color: NAVY, fontSize: 21, fontWeight: 700, margin: 0 },
  cardDesc: { color: TEXT, fontSize: 15, lineHeight: 1.6, margin: 0, flexGrow: 1 },
  cardCta: {
    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
    color: "#fff", fontWeight: 700, fontSize: 15, padding: "12px 24px", borderRadius: 999,
    background: GRADIENT,
  },
  adminCard: {
    display: "flex", alignItems: "center", gap: 16, width: "100%", maxWidth: 460,
    background: "rgba(255,255,255,0.92)", border: "1px solid rgba(8,31,73,0.08)",
    borderRadius: 22, padding: "22px 24px", boxShadow: "0 18px 50px rgba(8,31,73,0.08)",
  },
  adminIcon: {
    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
    background: "linear-gradient(135deg, rgba(3,190,195,0.16), rgba(120,82,255,0.14))",
    color: TURQ, display: "flex", alignItems: "center", justifyContent: "center",
  },
  adminInfo: { display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 },
  adminLabel: { color: NAVY, fontSize: 16, fontWeight: 700 },
  adminAddr: { color: TEXT, fontFamily: "monospace", fontSize: 13 },
  adminBtn: { padding: "10px 22px" },
  error: {
    marginTop: 22, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
    borderRadius: 12, padding: "10px 16px", fontSize: 14, maxWidth: 480,
  },
};
