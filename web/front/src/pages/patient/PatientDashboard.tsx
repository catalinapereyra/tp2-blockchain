import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { Icon, type IconName } from "../../components/landing/Icon";
import { landing, sectionAccent, gradients, fontFamily, type SectionAccent } from "../../styles";

const ACTIONS: { path: string; icon: IconName; title: string; desc: string; accent: SectionAccent }[] = [
  {
    path: "/patient/estudios",
    icon: "document",
    title: "Mis estudios",
    desc: "Historial de análisis e imágenes, agrupados por tipo.",
    accent: sectionAccent.estudios,
  },
  {
    path: "/patient/recetas",
    icon: "clipboard",
    title: "Mis recetas",
    desc: "Tus recetas emitidas y solicitá nuevas a tu médico.",
    accent: sectionAccent.recetas,
  },
  {
    path: "/patient/medicos",
    icon: "doctor",
    title: "Mis médicos",
    desc: "Gestioná qué médicos pueden ver tus estudios.",
    accent: sectionAccent.medicos,
  },
  {
    path: "/patient/pendientes",
    icon: "shield",
    title: "Documentos firmados",
    desc: "Registrá en tu historial los estudios que firmó un médico.",
    accent: sectionAccent.firmados,
  },
];

export default function PatientDashboard() {
  const { address, name } = useWallet();
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.avatarWrap}>
            <span style={s.avatarInner}><Icon name="user" size={24} /></span>
          </div>
          <div>
            <p style={s.eyebrow}>Tu espacio en MediChain</p>
            <div style={s.greetingRow}>
              <h1 style={s.greeting}>Hola, {name || "👋"}</h1>
              <span style={s.roleTag}>Paciente</span>
            </div>
            <p style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</p>
          </div>
        </div>

        <div style={s.grid}>
          {ACTIONS.map((a) => {
            const isHover = hover === a.path;
            return (
              <button
                key={a.path}
                style={{
                  ...s.card,
                  transform: isHover ? "translateY(-4px)" : "none",
                  boxShadow: isHover ? "0 26px 60px rgba(8,31,73,0.14)" : landing.softShadow,
                }}
                onClick={() => navigate(a.path)}
                onMouseEnter={() => setHover(a.path)}
                onMouseLeave={() => setHover(null)}
              >
                <span style={{ ...s.cardIcon, background: a.accent.soft, color: a.accent.main }}>
                  <Icon name={a.icon} size={28} />
                </span>
                <h2 style={s.cardTitle}>{a.title}</h2>
                <p style={s.cardDesc}>{a.desc}</p>
                <span style={{ ...s.cardCta, background: a.accent.main }}>
                  Ver
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: landing.pageBg,
    fontFamily: fontFamily.sans,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "48px 24px",
  },
  container: { width: "100%", maxWidth: 720 },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 36 },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 18, flexShrink: 0,
    background: landing.cardBg, border: landing.cardBorder,
    boxShadow: "0 14px 36px rgba(8,31,73,0.10)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 44, height: 44, borderRadius: 13,
    background: "linear-gradient(135deg, rgba(3,190,195,0.18), rgba(120,82,255,0.16))",
    color: "#03bec3", display: "flex", alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: "#03bec3", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase" as const, margin: 0 },
  greetingRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, margin: "5px 0 0" },
  greeting: { fontSize: 28, fontWeight: 700, color: landing.navy, margin: 0, letterSpacing: "-0.03em" },
  roleTag: { fontSize: 11, fontWeight: 700, color: "#fff", background: gradients.brand, padding: "4px 12px", borderRadius: 999 },
  addr: { fontFamily: "monospace", fontSize: 12, color: landing.textBody, margin: "5px 0 0" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  card: {
    background: landing.cardBg, border: landing.cardBorder,
    borderRadius: 22, padding: "26px 24px", textAlign: "left" as const,
    cursor: "pointer", fontFamily: fontFamily.sans,
    display: "flex", flexDirection: "column" as const, gap: 10,
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: 700, color: landing.navy, margin: "4px 0 0", letterSpacing: "-0.01em" },
  cardDesc: { fontSize: 14, color: landing.textBody, margin: 0, lineHeight: 1.6, flexGrow: 1 },
  cardCta: {
    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, alignSelf: "flex-start",
    color: "#fff", fontWeight: 700, fontSize: 14, padding: "9px 18px", borderRadius: 999,
  },
};
