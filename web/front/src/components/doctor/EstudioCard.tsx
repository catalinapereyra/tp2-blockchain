import React, { useState } from "react";
import { useToast } from "../common/Toast";
import { palette, fontFamily } from "../../styles";

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
  const [savedDiagnosis, setSavedDiagnosis] = useState(estudio.diagnosis ?? "");
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
    analisis: { bg: palette.sky50, color: palette.sky500 },
    imagen:   { bg: palette.indigoSoft, color: palette.indigo500 },
    receta:   { bg: palette.emerald50, color: palette.emerald500 },
    otro:     { bg: palette.slate50, color: palette.slate500 },
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
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.slate300} strokeWidth="2"
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
    background: palette.white,
    border: `1px solid ${palette.slate100}`,
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
  specificType: { fontSize: 14, fontWeight: 600, color: palette.slate900 },
  meta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  pill: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  metaText: { fontSize: 11, color: palette.slate400 },
  headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  diagDone: { fontSize: 11, fontWeight: 600, color: palette.emerald600 },
  diagMissing: { fontSize: 11, color: palette.amber600 },
  body: {
    borderTop: `1px solid ${palette.slate50}`,
    padding: "14px 16px",
    display: "flex", flexDirection: "column" as const, gap: 12,
  },
  fileLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, color: palette.indigo500, fontWeight: 600, textDecoration: "none",
  },
  diagSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
  diagLabel: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 600, color: palette.slate600,
  },
  textarea: {
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 13, fontFamily: fontFamily.sans, outline: "none",
    resize: "vertical" as const, color: palette.slate800, lineHeight: 1.5,
  },
  diagFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  btnRow: { display: "flex", alignItems: "center", gap: 8 },
  savedText: {
    fontSize: 13, color: palette.slate800, lineHeight: 1.5, margin: 0,
    background: palette.slate50, border: `1px solid ${palette.slate100}`, borderRadius: 10,
    padding: "10px 12px", whiteSpace: "pre-wrap" as const,
  },
  editBtn: {
    display: "inline-flex", alignItems: "center",
    background: palette.white, color: palette.indigo500, border: `1.5px solid ${palette.indigo100}`,
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans, whiteSpace: "nowrap" as const,
  },
  cancelBtn: {
    background: palette.white, color: palette.slate500, border: `1.5px solid ${palette.slate200}`,
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  diagNote: { fontSize: 11, color: palette.slate300 },
  warnText: { fontSize: 11, color: palette.red600 },
  saveBtn: {
    background: palette.indigo500, color: palette.white, border: "none",
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
