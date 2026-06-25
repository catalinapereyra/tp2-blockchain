import React, { useState } from "react";
import { Icon } from "../landing/Icon";
import { lu, iconBox } from "./PageShell";
import { landing, palette, fontFamily, type SectionAccent } from "../../styles";
import { useDocViewer } from "../common/DocViewer";

export interface EstudioItem {
  id: number;
  documentIdOnChain?: number;
  studyDate: string; // ISO string o cualquier fecha parseable
  title: string;
  labName?: string;
  uploadedBy: "lab" | "patient" | "doctor";
  fileUrl?: string;
  fileName?: string;
  diagnoses?: { doctorName?: string | null; text: string }[];
}

interface Props {
  studyType: string;
  category: string;
  estudios: EstudioItem[];
  accent: SectionAccent;
}

function fmtDate(d: string): string {
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

export default function EstudioGrupoCard({ studyType, category, estudios, accent }: Props) {
  const viewer = useDocViewer();
  const [expanded, setExpanded] = useState(false);
  const sorted = [...estudios].sort(
    (a, b) => new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
  );
  const newest = sorted[0];

  // El origen del estudio mantiene su propio color (no el de la sección).
  const UPLOAD_PILL: Record<string, { label: string; color: string }> = {
    lab: { label: "✓ Lab", color: palette.emerald600 },
    doctor: { label: "✓ Médico", color: palette.sky500 },
    patient: { label: "Subido por vos", color: palette.violet500 },
  };

  return (
    <div style={s.card}>
      <div style={s.header} onClick={() => setExpanded(!expanded)}>
        <div style={s.headerLeft}>
          <span style={iconBox(accent)}><Icon name="document" size={20} /></span>
          <div style={s.titleGroup}>
            <span style={s.studyType}>{studyType}</span>
            <div style={s.metaRow}>
              <span style={{ ...s.pill, color: accent.main, background: accent.soft }}>{category}</span>
              <span style={s.metaText}>{estudios.length} {estudios.length === 1 ? "estudio" : "estudios"}</span>
              <span style={s.metaText}>· Último: {fmtDate(newest.studyDate)}</span>
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <span style={{ ...s.newestBadge, color: accent.main }}>● {fmtDate(newest.studyDate)}</span>
          <span style={{ display: "inline-flex", color: landing.textFaint, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
            <Icon name="arrow" size={15} />
          </span>
        </div>
      </div>

      {expanded && (
        <div style={s.body}>
          {sorted.map((e, idx) => (
            <div key={e.id} style={{ ...s.item, ...(idx === 0 ? { background: accent.soft } : {}) }}>
              <div style={s.itemLeft}>
                {idx === 0 && <span style={{ ...s.newestDot, background: accent.main }} title="Más reciente" />}
                <div style={s.itemInfo}>
                  <span style={s.itemTitle}>{e.title}</span>
                  <div style={s.itemMeta}>
                    <span style={s.metaText}>{fmtDate(e.studyDate)}</span>
                    {e.labName && <><span style={s.metaText}>·</span><span style={s.metaText}>{e.labName}</span></>}
                    {(() => {
                      const pill = UPLOAD_PILL[e.uploadedBy];
                      return (
                        <span style={{ ...s.uploadedPill, color: pill.color, background: `${pill.color}1a` }}>
                          {pill.label}
                        </span>
                      );
                    })()}
                  </div>
                  {e.diagnoses && e.diagnoses.length > 0 && (
                    <div style={s.diagList}>
                      {e.diagnoses.map((d, i) => (
                        <div key={i} style={{ ...s.diagItem, borderLeft: `2px solid ${accent.main}` }}>
                          <span style={{ ...s.diagDoctor, color: accent.main }}>🩺 {d.doctorName || "Médico"}</span>
                          <span style={s.diagText}>{d.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {e.fileUrl && (
                <button
                  style={{ ...s.viewBtn, background: accent.main }}
                  onClick={() => viewer.open({ url: e.fileUrl!, fileName: e.fileName, title: e.title, documentId: e.documentIdOnChain })}
                >
                  <Icon name="arrow" size={13} />
                  Ver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { ...lu.card, borderRadius: 18, overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", cursor: "pointer", gap: 12 },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  titleGroup: { display: "flex", flexDirection: "column" as const, gap: 5 },
  studyType: { fontSize: 15, fontWeight: 700, color: landing.navy },
  metaRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  pill: { fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" as const },
  metaText: { fontSize: 12, color: landing.textFaint },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  newestBadge: { fontSize: 11, fontWeight: 700 },
  body: { borderTop: `1px solid ${landing.hairline}`, display: "flex", flexDirection: "column" as const },
  item: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid rgba(8,31,73,0.05)", gap: 12 },
  itemLeft: { display: "flex", alignItems: "flex-start", gap: 8, flex: 1 },
  newestDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, display: "inline-block" },
  itemInfo: { display: "flex", flexDirection: "column" as const, gap: 4 },
  itemTitle: { fontSize: 14, fontWeight: 600, color: landing.navy },
  itemMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  uploadedPill: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 },
  diagList: { display: "flex", flexDirection: "column" as const, gap: 6, marginTop: 4 },
  diagItem: { display: "flex", flexDirection: "column" as const, gap: 2, background: "rgba(8,31,73,0.04)", borderRadius: 10, padding: "7px 11px" },
  diagDoctor: { fontSize: 11, fontWeight: 700 },
  diagText: { fontSize: 12, color: landing.textBody, lineHeight: 1.4 },
  viewBtn: {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#fff", fontWeight: 700,
    flexShrink: 0, border: "none", cursor: "pointer", fontFamily: fontFamily.sans,
    padding: "7px 14px", borderRadius: 999,
  },
};
