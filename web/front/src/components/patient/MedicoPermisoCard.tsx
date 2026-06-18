import React from "react";

export interface MedicoPermiso {
  address: string;
  name?: string;
  since: string;
  studiesShared: number;
}

interface Props {
  medico: MedicoPermiso;
  onRevoke: (address: string) => void;
}

export default function MedicoPermisoCard({ medico, onRevoke }: Props) {
  return (
    <div style={s.card}>
      <div style={s.iconWrap}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <div style={s.info}>
        <span style={s.addr}>{medico.address.slice(0, 10)}…{medico.address.slice(-6)}</span>
        <div style={s.meta}>
          <span style={s.metaItem}>Acceso desde {medico.since}</span>
          <span style={s.dot}>·</span>
          <span style={s.metaItem}>{medico.studiesShared} estudios compartidos</span>
        </div>
      </div>
      <button style={s.revokeBtn} onClick={() => onRevoke(medico.address)}>
        Revocar
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "white", border: "1px solid #f1f5f9",
    borderRadius: 14, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, background: "#f0f9ff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  info: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 0 },
  addr: { fontFamily: "monospace", fontSize: 13, color: "#1e293b", fontWeight: 500 },
  meta: { display: "flex", alignItems: "center", gap: 5 },
  metaItem: { fontSize: 12, color: "#94a3b8" },
  dot: { fontSize: 12, color: "#e2e8f0" },
  revokeBtn: {
    background: "none", border: "1.5px solid #fca5a5",
    color: "#dc2626", borderRadius: 8, padding: "6px 14px",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
  },
};
