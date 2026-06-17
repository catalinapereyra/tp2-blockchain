import React from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";

const ACTIONS = [
  {
    path: "/patient/estudios",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    iconBg: "#f5f3ff",
    border: "#ddd6fe",
    bg: "#f5f3ff",
    title: "Mis estudios",
    desc: "Historial de análisis e imágenes, agrupados por tipo.",
    badge: null,
  },
  {
    path: "/patient/subir",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/>
        <line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    ),
    iconBg: "#f0fdf4",
    border: "#bbf7d0",
    bg: "#f0fdf4",
    title: "Subir estudio",
    desc: "Cargá estudios propios para tener tu historial completo.",
    badge: null,
  },
  {
    path: "/patient/recetas",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
    iconBg: "#f0f9ff",
    border: "#bae6fd",
    bg: "#f0f9ff",
    title: "Solicitar receta",
    desc: "Pedile una receta a tu médico desde la app.",
    badge: "1 receta emitida",
  },
  {
    path: "/patient/medicos",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    iconBg: "#fffbeb",
    border: "#fde68a",
    bg: "#fffbeb",
    title: "Mis médicos",
    desc: "Gestioná qué médicos pueden ver tus estudios.",
    badge: "2 con acceso",
  },
];

export default function PatientDashboard() {
  const { address } = useWallet();
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.header}>
          <div style={s.avatarWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h1 style={s.greeting}>Hola, Paciente</h1>
            <p style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</p>
          </div>
        </div>

        <div style={s.grid}>
          {ACTIONS.map((a) => (
            <div
              key={a.path}
              style={{ ...s.card, background: a.bg, borderColor: a.border }}
              onClick={() => navigate(a.path)}
            >
              <div style={s.cardTop}>
                <div style={{ ...s.iconWrap, background: "white" }}>{a.icon}</div>
                {a.badge && <span style={s.badge}>{a.badge}</span>}
              </div>
              <h2 style={s.cardTitle}>{a.title}</h2>
              <p style={s.cardDesc}>{a.desc}</p>
              <div style={s.arrow}>
                Ver
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 20px",
  },
  container: { width: "100%", maxWidth: 620 },
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 32 },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 16,
    background: "white", border: "1px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  greeting: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" },
  addr: { fontFamily: "monospace", fontSize: 12, color: "#94a3b8", margin: "3px 0 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  card: {
    border: "1.5px solid",
    borderRadius: 18,
    padding: "20px",
    cursor: "pointer",
    display: "flex", flexDirection: "column" as const, gap: 8,
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  badge: {
    fontSize: 10, fontWeight: 700,
    background: "rgba(255,255,255,0.8)", color: "#475569",
    padding: "3px 8px", borderRadius: 20, maxWidth: 100,
    textAlign: "center" as const,
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" },
  cardDesc: { fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5, flexGrow: 1 },
  arrow: {
    display: "inline-flex", alignItems: "center", gap: 3,
    fontSize: 12, fontWeight: 600, color: "#94a3b8", marginTop: 4,
  },
};
