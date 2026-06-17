import React from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";

const ROLE_INFO: Record<number, { label: string; color: string }> = {
  1: { label: "Médico",       color: "#0ea5e9" },
  2: { label: "Laboratorio",  color: "#10b981" },
  3: { label: "Institución",  color: "#f59e0b" },
};

export default function DoctorDashboard() {
  const { address, role } = useWallet();
  const navigate = useNavigate();
  const info = role !== null ? ROLE_INFO[role] ?? ROLE_INFO[1] : ROLE_INFO[1];

  const ACTIONS = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      ),
      bg: "#f0f9ff",
      border: "#bae6fd",
      title: "Solicitudes de recetas",
      desc: "Revisá y respondé las solicitudes de tus pacientes.",
      badge: "2 pendientes",
      badgeColor: "#0ea5e9",
      badgeBg: "#e0f2fe",
      path: "/doctor/recetas",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      bg: "#f5f3ff",
      border: "#ddd6fe",
      title: "Mis pacientes",
      desc: "Mirá los estudios compartidos y dejá diagnósticos.",
      badge: "3 estudios sin diagnóstico",
      badgeColor: "#6366f1",
      badgeBg: "#ede9fe",
      path: "/doctor/pacientes",
    },
  ];

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <h1 style={s.greeting}>Hola, {info.label}</h1>
              <p style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</p>
            </div>
          </div>
        </div>

        {/* Action cards */}
        <div style={s.actions}>
          {ACTIONS.map((a) => (
            <div
              key={a.path}
              style={{ ...s.actionCard, background: a.bg, borderColor: a.border }}
              onClick={() => navigate(a.path)}
            >
              <div style={s.actionTop}>
                <div style={s.actionIcon}>{a.icon}</div>
                <span style={{ ...s.actionBadge, background: a.badgeBg, color: a.badgeColor }}>
                  {a.badge}
                </span>
              </div>
              <h2 style={s.actionTitle}>{a.title}</h2>
              <p style={s.actionDesc}>{a.desc}</p>
              <div style={s.actionArrow}>
                Ver todo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  container: { width: "100%", maxWidth: 600 },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 36,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    background: "white", border: "1px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  greeting: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" },
  addr: { fontFamily: "monospace", fontSize: 12, color: "#94a3b8", margin: "3px 0 0" },
  actions: { display: "flex", flexDirection: "column" as const, gap: 14 },
  actionCard: {
    border: "1.5px solid",
    borderRadius: 18,
    padding: "24px",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
    display: "flex", flexDirection: "column" as const, gap: 8,
  },
  actionTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    background: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  actionBadge: {
    fontSize: 11, fontWeight: 700,
    padding: "4px 10px", borderRadius: 20,
  },
  actionTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" },
  actionDesc: { fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 },
  actionArrow: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 13, fontWeight: 600, color: "#94a3b8", marginTop: 4,
  },
};
