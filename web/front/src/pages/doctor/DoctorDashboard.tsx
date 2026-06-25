import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { Icon, type IconName } from "../../components/landing/Icon";
import { landing, sectionAccent, gradients, fontFamily, fontSize, fontWeight, radius, type SectionAccent } from "../../styles";

const ACTIONS: { path: string; icon: IconName; title: string; desc: string; badge: string | null; accent: SectionAccent }[] = [
  {
    path: "/doctor/recetas",
    icon: "clipboard",
    title: "Solicitudes de recetas",
    desc: "Revisá y respondé las solicitudes de tus pacientes.",
    badge: null,
    accent: sectionAccent.recetas,
  },
  {
    path: "/doctor/pacientes",
    icon: "user",
    title: "Mis pacientes",
    desc: "Mirá los estudios compartidos y dejá diagnósticos.",
    badge: null,
    accent: sectionAccent.estudios,
  },
  {
    path: "/doctor/firmar",
    icon: "shield",
    title: "Firmar estudio",
    desc: "Firmás el estudio sin pagar gas; el paciente lo registra en su historial.",
    badge: "Sin gas",
    accent: sectionAccent.firmados,
  },
];

export default function DoctorDashboard() {
  const { address, name } = useWallet();
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.avatarWrap}>
            <span style={s.avatarInner}><Icon name="doctor" size={24} /></span>
          </div>
          <div>
            <p style={s.eyebrow}>Tu espacio en MediChain</p>
            <div style={s.greetingRow}>
              <h1 style={s.greeting}>Hola, {name || "👋"}</h1>
              <span style={s.roleTag}>Médico</span>
            </div>
            <p style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</p>
          </div>
        </div>

        <div style={s.actions}>
          {ACTIONS.map((a) => {
            const isHover = hover === a.path;
            return (
              <button
                key={a.path}
                style={{
                  ...s.card,
                  transform: isHover ? "translateY(-3px)" : "none",
                  boxShadow: isHover ? "0 24px 56px rgba(8,31,73,0.13)" : landing.softShadow,
                }}
                onClick={() => navigate(a.path)}
                onMouseEnter={() => setHover(a.path)}
                onMouseLeave={() => setHover(null)}
              >
                <div style={s.cardTop}>
                  <span style={{ ...s.cardIcon, background: a.accent.soft, color: a.accent.main }}>
                    <Icon name={a.icon} size={26} />
                  </span>
                  {a.badge && (
                    <span style={{ ...s.badge, background: a.accent.soft, color: a.accent.main }}>{a.badge}</span>
                  )}
                </div>
                <h2 style={s.cardTitle}>{a.title}</h2>
                <p style={s.cardDesc}>{a.desc}</p>
                <span style={{ ...s.cardCta, background: a.accent.main }}>
                  Ver todo
                  <Icon name="arrow" size={15} />
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
  container: { width: "100%", maxWidth: 640 },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 32 },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 18, flexShrink: 0,
    background: landing.cardBg, border: landing.cardBorder,
    boxShadow: "0 14px 36px rgba(8,31,73,0.10)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 44, height: 44, borderRadius: 13,
    background: "linear-gradient(135deg, rgba(3,190,195,0.18), rgba(120,82,255,0.16))",
    color: sectionAccent.recetas.main,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: sectionAccent.recetas.main, fontWeight: fontWeight.bold, fontSize: fontSize.sm, letterSpacing: "0.05em", textTransform: "uppercase" as const, margin: 0 },
  greetingRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, margin: "5px 0 0" },
  greeting: { fontSize: 28, fontWeight: fontWeight.bold, color: landing.navy, margin: 0, letterSpacing: "-0.03em" },
  roleTag: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: landing.onBrand, background: gradients.brand, padding: "4px 12px", borderRadius: radius.full },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: landing.textBody, margin: "5px 0 0" },
  actions: { display: "flex", flexDirection: "column" as const, gap: 14 },
  card: {
    background: landing.cardBg, border: landing.cardBorder,
    borderRadius: radius["3xl"], padding: 24, textAlign: "left" as const,
    cursor: "pointer", fontFamily: fontFamily.sans,
    display: "flex", flexDirection: "column" as const, gap: 9,
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  cardIcon: {
    width: 52, height: 52, borderRadius: radius["2xl"],
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  badge: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, padding: "4px 11px", borderRadius: radius.full },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: landing.navy, margin: "4px 0 0", letterSpacing: "-0.01em" },
  cardDesc: { fontSize: fontSize.md, color: landing.textBody, margin: 0, lineHeight: 1.55 },
  cardCta: {
    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start",
    color: landing.onBrand, fontWeight: fontWeight.bold, fontSize: fontSize.md, padding: "9px 18px", borderRadius: radius.full,
  },
};
