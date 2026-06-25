import React from "react";
import { useNavigate } from "react-router-dom";
import { colors, palette, fontFamily, fontSize, fontWeight, radius } from "../../styles";

export interface Paciente {
  address: string;
  name?: string;
  studyCount: number;
  lastStudyDate: string;
  pendingDiagnosis: number;
}

export default function PacienteCard({ paciente }: { paciente: Paciente }) {
  const navigate = useNavigate();

  return (
    <div style={s.card} onClick={() => navigate(`/doctor/pacientes/${paciente.address}`)}>
      <div style={s.avatarWrap}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div style={s.info}>
        {paciente.name ? (
          <>
            <span style={s.name}>{paciente.name}</span>
            <span style={s.addrSmall}>{paciente.address.slice(0, 10)}…{paciente.address.slice(-6)}</span>
          </>
        ) : (
          <span style={s.addr}>{paciente.address.slice(0, 10)}…{paciente.address.slice(-6)}</span>
        )}
        <div style={s.meta}>
          <span style={s.metaItem}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            {paciente.studyCount} {paciente.studyCount === 1 ? "estudio" : "estudios"}
          </span>
          <span style={s.dot}>·</span>
          <span style={s.metaItem}>Último: {paciente.lastStudyDate}</span>
        </div>
      </div>
      {paciente.pendingDiagnosis > 0 && (
        <span style={s.pendingBadge}>{paciente.pendingDiagnosis} sin diagnóstico</span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.borderStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: colors.surface,
    border: `1px solid ${colors.bgSubtle}`,
    borderRadius: radius.xl,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: radius.lg,
    background: colors.primarySoft,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  info: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: palette.slate800, fontWeight: fontWeight.medium },
  addrSmall: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint },
  meta: { display: "flex", alignItems: "center", gap: 6 },
  metaItem: { fontSize: fontSize.sm, color: colors.textFaint, display: "flex", alignItems: "center", gap: 3 },
  dot: { fontSize: fontSize.sm, color: colors.borderStrong },
  pendingBadge: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    background: colors.warning.bg, color: colors.warning.fg,
    padding: "3px 8px", borderRadius: radius.full,
    flexShrink: 0,
  },
};
