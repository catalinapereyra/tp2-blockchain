import React, { useState } from "react";
import { palette } from "../../styles";

export interface EstudioItem {
  id: number;
  studyDate: string; // ISO string o cualquier fecha parseable
  title: string;
  labName?: string;
  uploadedBy: "lab" | "patient";
  fileUrl?: string;
  diagnoses?: { doctorName?: string | null; text: string }[];
}

interface Props {
  studyType: string;
  category: string;
  estudios: EstudioItem[];
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  analisis:  { bg: palette.sky50, color: palette.sky500 },
  imagen:    { bg: palette.indigoSoft, color: palette.indigo500 },
  patologia: { bg: palette.amber100, color: palette.amber500 },
  otro:      { bg: palette.slate50, color: palette.slate500 },
};

function fmtDate(d: string): string {
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

export default function EstudioGrupoCard({ studyType, category, estudios }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cs = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.otro;
  const sorted = [...estudios].sort(
    (a, b) => new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
  );
  const newest = sorted[0];

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
            <span style={s.studyType}>{studyType}</span>
            <div style={s.metaRow}>
              <span style={{ ...s.pill, background: cs.bg, color: cs.color }}>{category}</span>
              <span style={s.metaText}>{estudios.length} {estudios.length === 1 ? "estudio" : "estudios"}</span>
              <span style={s.metaText}>· Último: {fmtDate(newest.studyDate)}</span>
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <span style={s.newestBadge}>● {fmtDate(newest.studyDate)}</span>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={palette.slate300} strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={s.body}>
          {sorted.map((e, idx) => (
            <div key={e.id} style={{ ...s.item, ...(idx === 0 ? s.itemNewest : {}) }}>
              <div style={s.itemLeft}>
                {idx === 0 && <span style={s.newestDot} title="Más reciente" />}
                <div style={s.itemInfo}>
                  <span style={s.itemTitle}>{e.title}</span>
                  <div style={s.itemMeta}>
                    <span style={s.metaText}>{fmtDate(e.studyDate)}</span>
                    {e.labName && <><span style={s.metaText}>·</span><span style={s.metaText}>{e.labName}</span></>}
                    <span style={{
                      ...s.uploadedPill,
                      background: e.uploadedBy === "lab" ? palette.emerald50 : palette.indigoSoft,
                      color: e.uploadedBy === "lab" ? palette.emerald600 : palette.indigo500,
                    }}>
                      {e.uploadedBy === "lab" ? "✓ Lab" : "Subido por vos"}
                    </span>
                  </div>
                  {e.diagnoses && e.diagnoses.length > 0 && (
                    <div style={s.diagList}>
                      {e.diagnoses.map((d, i) => (
                        <div key={i} style={s.diagItem}>
                          <span style={s.diagDoctor}>🩺 {d.doctorName || "Médico"}</span>
                          <span style={s.diagText}>{d.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {e.fileUrl && (
                <a href={e.fileUrl} target="_blank" rel="noreferrer" style={s.viewBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Ver
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: palette.white, border: `1px solid ${palette.slate100}`, borderRadius: 14, overflow: "hidden" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", cursor: "pointer", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  titleGroup: { display: "flex", flexDirection: "column" as const, gap: 4 },
  studyType: { fontSize: 14, fontWeight: 600, color: palette.slate900 },
  metaRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  pill: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  metaText: { fontSize: 11, color: palette.slate400 },
  headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  newestBadge: { fontSize: 11, color: palette.emerald500, fontWeight: 600 },
  body: { borderTop: `1px solid ${palette.slate50}`, display: "flex", flexDirection: "column" as const },
  item: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "12px 16px", borderBottom: `1px solid ${palette.slate50}`, gap: 12,
  },
  itemNewest: { background: palette.gray50 },
  itemLeft: { display: "flex", alignItems: "flex-start", gap: 8, flex: 1 },
  newestDot: {
    width: 8, height: 8, borderRadius: "50%", background: palette.emerald500,
    marginTop: 5, flexShrink: 0, display: "inline-block",
  },
  itemInfo: { display: "flex", flexDirection: "column" as const, gap: 4 },
  itemTitle: { fontSize: 13, fontWeight: 500, color: palette.slate800 },
  itemMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  uploadedPill: { fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  diagList: { display: "flex", flexDirection: "column" as const, gap: 6, marginTop: 4 },
  diagItem: {
    display: "flex", flexDirection: "column" as const, gap: 2,
    background: palette.slate50, borderRadius: 8, padding: "6px 10px",
    borderLeft: `2px solid ${palette.indigo500}`,
  },
  diagDoctor: { fontSize: 11, fontWeight: 700, color: palette.indigo500 },
  diagText: { fontSize: 12, color: palette.slate600, lineHeight: 1.4 },
  viewBtn: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 12, color: palette.indigo500, fontWeight: 600,
    textDecoration: "none", flexShrink: 0, paddingTop: 2,
  },
};
