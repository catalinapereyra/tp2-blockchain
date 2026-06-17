import React, { useState } from "react";

export interface Estudio {
  id: number;
  category: string;       // on-chain: "analisis", "imagen", etc.
  specificType: string;   // off-chain: "Colesterol", "TSH", "Rx tórax", etc.
  uploadedBy: string;     // wallet del lab
  date: string;
  ipfsUrl?: string;
  diagnosis?: string;     // off-chain, solo visible para el paciente
}

interface Props {
  estudio: Estudio;
  onSaveDiagnosis: (estudyId: number, text: string) => void;
}

export default function EstudioCard({ estudio, onSaveDiagnosis }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [diagText, setDiagText] = useState(estudio.diagnosis ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSaveDiagnosis(estudio.id, diagText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
    analisis: { bg: "#f0f9ff", color: "#0ea5e9" },
    imagen:   { bg: "#f5f3ff", color: "#6366f1" },
    receta:   { bg: "#f0fdf4", color: "#10b981" },
    otro:     { bg: "#f8fafc", color: "#64748b" },
  };
  const cs = CATEGORY_STYLE[estudio.category] ?? CATEGORY_STYLE.otro;

  return (
    <div style={s.card}>
      <div style={s.header} onClick={() => setExpanded(!expanded)}>
        <div style={s.headerLeft}>
          <div style={{ ...s.iconWrap, background: cs.bg, color: cs.color }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div style={s.titleGroup}>
            <span style={s.specificType}>{estudio.specificType}</span>
            <div style={s.meta}>
              <span style={{ ...s.pill, background: cs.bg, color: cs.color }}>{estudio.category}</span>
              <span style={s.metaText}>{estudio.date}</span>
              <span style={s.metaText}>Lab: {estudio.uploadedBy.slice(0, 8)}…</span>
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          {estudio.diagnosis ? (
            <span style={s.diagDone}>✓ Diagnóstico</span>
          ) : (
            <span style={s.diagMissing}>Sin diagnóstico</span>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={s.body}>
          {estudio.ipfsUrl && (
            <a href={estudio.ipfsUrl} target="_blank" rel="noreferrer" style={s.ipfsLink}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Ver estudio en IPFS
            </a>
          )}

          <div style={s.diagSection}>
            <label style={s.diagLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Diagnóstico / Observación
            </label>
            <textarea
              style={s.textarea}
              placeholder="Escribí tu diagnóstico u observación sobre este estudio…"
              value={diagText}
              onChange={(e) => { setDiagText(e.target.value); setSaved(false); }}
              rows={3}
            />
            <div style={s.diagFooter}>
              <span style={s.diagNote}>Solo visible para el paciente · off-chain</span>
              <button
                style={{ ...s.saveBtn, opacity: !diagText.trim() ? 0.5 : 1 }}
                disabled={!diagText.trim()}
                onClick={handleSave}
              >
                {saved ? "✓ Guardado" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "white",
    border: "1px solid #f1f5f9",
    borderRadius: 14,
    overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", cursor: "pointer", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  titleGroup: { display: "flex", flexDirection: "column" as const, gap: 4, minWidth: 0 },
  specificType: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  meta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  pill: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  metaText: { fontSize: 11, color: "#94a3b8" },
  headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  diagDone: { fontSize: 11, fontWeight: 600, color: "#16a34a" },
  diagMissing: { fontSize: 11, color: "#d97706" },
  body: {
    borderTop: "1px solid #f8fafc",
    padding: "14px 16px",
    display: "flex", flexDirection: "column" as const, gap: 12,
  },
  ipfsLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, color: "#6366f1", fontWeight: 600, textDecoration: "none",
  },
  diagSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
  diagLabel: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 600, color: "#475569",
  },
  textarea: {
    border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
    resize: "vertical" as const, color: "#1e293b", lineHeight: 1.5,
  },
  diagFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  diagNote: { fontSize: 11, color: "#cbd5e1" },
  saveBtn: {
    background: "#6366f1", color: "white", border: "none",
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};
