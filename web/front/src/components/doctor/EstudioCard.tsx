import React, { useState } from "react";
import { useToast } from "../common/Toast";

export interface Estudio {
  id: number;
  category: string;       // on-chain: "analisis", "imagen", etc.
  specificType: string;   // off-chain: "Colesterol", "TSH", "Rx tórax", etc.
  uploadedBy: string;     // wallet del lab
  labName?: string;       // off-chain: nombre del laboratorio
  date: string;
  fileUrl?: string;       // descarga del archivo guardado en la base de datos
  diagnosis?: string;     // off-chain, solo visible para el paciente
}

interface Props {
  estudio: Estudio;
  onSaveDiagnosis: (estudyId: number, text: string) => void | Promise<void>;
}

export default function EstudioCard({ estudio, onSaveDiagnosis }: Props) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [diagText, setDiagText] = useState(estudio.diagnosis ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Diagnóstico ya guardado (lo muestra en modo lectura)
  const [savedDiagnosis, setSavedDiagnosis] = useState(estudio.diagnosis ?? "");
  // Modo edición activo (textarea + Guardar). Si no hay diagnóstico, arranca editando.
  const [editing, setEditing] = useState(!estudio.diagnosis);

  const hasDiagnosis = savedDiagnosis.trim().length > 0;

  function startEdit() {
    setDiagText(savedDiagnosis);
    setSaveError("");
    setEditing(true);
  }

  function cancelEdit() {
    setDiagText(savedDiagnosis);
    setSaveError("");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      await onSaveDiagnosis(estudio.id, diagText);
      const wasEditing = hasDiagnosis;
      setSavedDiagnosis(diagText);
      setEditing(false);
      toast.show(wasEditing ? "Diagnóstico actualizado" : "Diagnóstico enviado");
    } catch (e: any) {
      setSaveError(e?.message || "No se pudo guardar el diagnóstico");
      toast.show("No se pudo guardar el diagnóstico", "error");
    } finally {
      setSaving(false);
    }
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
              <span style={s.metaText}>
                Lab: {estudio.labName ? `${estudio.labName} · ` : ""}{estudio.uploadedBy.slice(0, 8)}…
              </span>
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
          {estudio.fileUrl && (
            <a href={estudio.fileUrl} target="_blank" rel="noreferrer" style={s.fileLink}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Ver / descargar estudio
            </a>
          )}

          <div style={s.diagSection}>
            <label style={s.diagLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Diagnóstico / Observación
            </label>
            {hasDiagnosis && !editing ? (
              // Ya hay diagnóstico: solo lectura + botón Editar
              <>
                <p style={s.savedText}>{savedDiagnosis}</p>
                <div style={s.diagFooter}>
                  <span style={s.diagNote}>Solo visible para el paciente · off-chain</span>
                  <button style={s.editBtn} onClick={startEdit}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar diagnóstico
                  </button>
                </div>
              </>
            ) : (
              // Modo edición: recién acá se puede escribir y guardar
              <>
                <textarea
                  style={s.textarea}
                  placeholder="Escribí tu diagnóstico u observación sobre este estudio…"
                  value={diagText}
                  onChange={(e) => { setDiagText(e.target.value); setSaveError(""); }}
                  rows={3}
                />
                <div style={s.diagFooter}>
                  <span style={saveError ? s.warnText : s.diagNote}>
                    {saveError || "Solo visible para el paciente · off-chain"}
                  </span>
                  <div style={s.btnRow}>
                    {hasDiagnosis && (
                      <button style={s.cancelBtn} onClick={cancelEdit} disabled={saving}>
                        Cancelar
                      </button>
                    )}
                    <button
                      style={{ ...s.saveBtn, opacity: !diagText.trim() || saving ? 0.5 : 1 }}
                      disabled={!diagText.trim() || saving}
                      onClick={handleSave}
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </div>
              </>
            )}
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
  fileLink: {
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
  diagFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  btnRow: { display: "flex", alignItems: "center", gap: 8 },
  savedText: {
    fontSize: 13, color: "#1e293b", lineHeight: 1.5, margin: 0,
    background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10,
    padding: "10px 12px", whiteSpace: "pre-wrap" as const,
  },
  editBtn: {
    display: "inline-flex", alignItems: "center",
    background: "white", color: "#6366f1", border: "1.5px solid #e0e7ff",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" as const,
  },
  cancelBtn: {
    background: "white", color: "#64748b", border: "1.5px solid #e2e8f0",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  diagNote: { fontSize: 11, color: "#cbd5e1" },
  warnText: { fontSize: 11, color: "#dc2626" },
  saveBtn: {
    background: "#6366f1", color: "white", border: "none",
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};
