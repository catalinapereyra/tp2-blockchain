import React from "react";
import { useNavigate } from "react-router-dom";
import { STUDY_CATEGORIES } from "../../lib/categories";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

export default function LabCategoriasPage() {
  const navigate = useNavigate();
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/lab")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>
        <div style={s.header}>
          <div style={s.iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <h1 style={s.title}>Tipos de análisis</h1>
            <p style={s.subtitle}>Categorías genéricas disponibles (lo que viaja on-chain)</p>
          </div>
        </div>
        <div style={s.list}>
          {STUDY_CATEGORIES.map((c) => (
            <div key={c.value} style={s.row}>
              <span style={s.label}>{c.label}</span>
              <code style={s.value}>{c.value}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 560, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.surface, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.lg, padding: "12px 16px", boxShadow: shadow.sm },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  value: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.lab, background: colors.labSoft, padding: "2px 8px", borderRadius: radius.sm },
};
