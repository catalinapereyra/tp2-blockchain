import React from "react";
import { Icon, type IconName } from "../landing/Icon";
import { landing, fontFamily, type SectionAccent } from "../../styles";

// Estilos base del lenguaje landing (fondo radial, tarjeta blanca, sombras suaves,
// título navy). El color de acento lo aporta cada sección vía la prop `accent`.
export const lu: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: landing.pageBg,
    fontFamily: fontFamily.sans,
    paddingBottom: 70,
  },
  back: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: landing.cardBg, border: landing.cardBorder, color: landing.navy,
    fontWeight: 600, fontSize: 14, padding: "8px 16px", borderRadius: 999,
    cursor: "pointer", fontFamily: fontFamily.sans, marginBottom: 24,
  },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 26 },
  title: { fontSize: 28, fontWeight: 700, color: landing.navy, margin: "4px 0 0", letterSpacing: "-0.03em" },
  subtitle: { fontSize: 14, color: landing.textBody, margin: "4px 0 0" },
  card: { background: landing.cardBg, border: landing.cardBorder, borderRadius: 20, boxShadow: landing.softShadow, fontFamily: fontFamily.sans },
  spinner: { width: 30, height: 30, border: "3px solid rgba(8,31,73,0.1)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};

// Helpers que dependen del acento de la sección.
export const iconBox = (accent: SectionAccent): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
  background: accent.soft, color: accent.main,
  display: "flex", alignItems: "center", justifyContent: "center",
});

export const accentPill = (accent: SectionAccent): React.CSSProperties => ({
  marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
  color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 20px", borderRadius: 999,
  background: accent.main, border: "none", cursor: "pointer", fontFamily: fontFamily.sans,
});

interface ShellProps {
  back: () => void;
  accent: SectionAccent;
  icon?: IconName;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}

export default function PageShell({ back, accent, icon, eyebrow, title, subtitle, action, maxWidth = 680, children }: ShellProps) {
  return (
    <div style={lu.page}>
      <div style={{ maxWidth, margin: "0 auto", padding: "32px 24px" }}>
        <button style={lu.back} onClick={back}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={15} /></span>
          Volver
        </button>
        <div style={lu.header}>
          {icon && (
            <span style={{ ...iconBox(accent), width: 56, height: 56, borderRadius: 16 }}>
              <Icon name={icon} size={26} />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <p style={{ color: accent.main, fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
                {eyebrow}
              </p>
            )}
            <h1 style={lu.title}>{title}</h1>
            {subtitle && <p style={lu.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
