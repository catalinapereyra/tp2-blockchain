import React from "react";
import { palette, fontFamily } from "../../styles";

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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={palette.sky500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    background: palette.white, border: `1px solid ${palette.slate100}`,
    borderRadius: 14, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, background: palette.sky50,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  info: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 0 },
  addr: { fontFamily: fontFamily.mono, fontSize: 13, color: palette.slate800, fontWeight: 500 },
  meta: { display: "flex", alignItems: "center", gap: 5 },
  metaItem: { fontSize: 12, color: palette.slate400 },
  dot: { fontSize: 12, color: palette.slate200 },
  revokeBtn: {
    background: "none", border: `1.5px solid ${palette.red300}`,
    color: palette.red600, borderRadius: 8, padding: "6px 14px",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: fontFamily.sans, flexShrink: 0,
  },
};
