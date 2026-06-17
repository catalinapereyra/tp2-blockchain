import React from "react";

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
  pending:  { label: "Pendiente",  bg: "#fffbeb", color: "#d97706" },
  accepted: { label: "Aceptada",   bg: "#f0fdf4", color: "#16a34a" },
  rejected: { label: "Rechazada",  bg: "#fef2f2", color: "#dc2626" },
  issued:   { label: "Emitida",    bg: "#eff6ff", color: "#2563eb" },
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
    background: "white",
    border: "1px solid #f1f5f9",
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
    background: "#f5f3ff", color: "#6366f1",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  addr: { fontFamily: "monospace", fontSize: 12, color: "#334155", fontWeight: 500 },
  desc: { fontSize: 13, color: "#475569", margin: 0, fontStyle: "italic" },
  statusPill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  date: { fontSize: 11, color: "#94a3b8" },
  actions: { display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid #f8fafc" },
  btnAccept: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#16a34a", color: "white", border: "none",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  btnReject: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", color: "#dc2626",
    border: "1.5px solid #fca5a5",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};
