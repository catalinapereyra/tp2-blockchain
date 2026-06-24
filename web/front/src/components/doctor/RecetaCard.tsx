import React from "react";
import { palette, fontFamily } from "../../styles";

export type RecetaStatus = "pending" | "accepted" | "rejected" | "issued";

export interface Receta {
  id: number;
  patientAddress: string;
  patientName?: string;
  description: string;
  requestedAt: string;
  status: RecetaStatus;
}

const STATUS_CONFIG: Record<RecetaStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pendiente",  bg: palette.amber50, color: palette.amber600 },
  accepted: { label: "Aceptada",   bg: palette.emerald50, color: palette.emerald600 },
  rejected: { label: "Rechazada",  bg: palette.red50, color: palette.red600 },
  issued:   { label: "Emitida",    bg: palette.blue50, color: palette.blue600 },
};

interface Props {
  receta: Receta;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
}

export default function RecetaCard({ receta, onAccept, onReject }: Props) {
  const sc = STATUS_CONFIG[receta.status];

  return (
    <div style={s.card}>
      <div style={s.top}>
        <div style={s.left}>
          <div style={s.patientRow}>
            <div style={s.avatar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span style={s.addr}>{receta.patientAddress.slice(0, 10)}…{receta.patientAddress.slice(-6)}</span>
          </div>
          <p style={s.desc}>"{receta.description}"</p>
        </div>
        <div style={s.right}>
          <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>{sc.label}</span>
          <span style={s.date}>{receta.requestedAt}</span>
        </div>
      </div>

      {receta.status === "pending" && (
        <div style={s.actions}>
          <button style={s.btnAccept} onClick={() => onAccept?.(receta.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Aceptar
          </button>
          <button style={s.btnReject} onClick={() => onReject?.(receta.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Rechazar
          </button>
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
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  left: { display: "flex", flexDirection: "column" as const, gap: 6, flex: 1 },
  right: { display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4, flexShrink: 0 },
  patientRow: { display: "flex", alignItems: "center", gap: 6 },
  avatar: {
    width: 26, height: 26, borderRadius: 8,
    background: palette.indigoSoft, color: palette.indigo500,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  addr: { fontFamily: fontFamily.mono, fontSize: 12, color: palette.slate700, fontWeight: 500 },
  desc: { fontSize: 13, color: palette.slate600, margin: 0, fontStyle: "italic" },
  statusPill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  date: { fontSize: 11, color: palette.slate400 },
  actions: { display: "flex", gap: 8, paddingTop: 4, borderTop: `1px solid ${palette.slate50}` },
  btnAccept: {
    display: "flex", alignItems: "center", gap: 6,
    background: palette.emerald600, color: palette.white, border: "none",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  btnReject: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", color: palette.red600,
    border: `1.5px solid ${palette.red300}`,
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
