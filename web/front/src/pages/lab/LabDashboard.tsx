import React from "react";
import { useWallet } from "../../context/WalletContext";
import { palette, fontFamily, gradients } from "../../styles";

export default function LabDashboard() {
  const { address } = useWallet();

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0a5 5 0 0 0 10 0M9 14H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4"/>
          </svg>
        </div>
        <h1 style={s.title}>Hola, Laboratorio</h1>
        <p style={s.addr}>{address}</p>
        <p style={s.desc}>Próximamente podrás subir estudios y asociarlos a pacientes.</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: gradients.app,
    fontFamily: fontFamily.sans,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  },
  card: {
    background: palette.white, borderRadius: 20, padding: "48px 40px",
    maxWidth: 480, width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    border: `1px solid ${palette.slate100}`,
    textAlign: "center" as const,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 18, background: palette.emerald50,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: { fontSize: 28, fontWeight: 700, color: palette.slate900, margin: "0 0 8px", letterSpacing: "-0.5px" },
  addr: { fontFamily: fontFamily.mono, fontSize: 12, color: palette.slate400, margin: "0 0 16px", wordBreak: "break-all" as const },
  desc: { color: palette.slate500, fontSize: 14, lineHeight: 1.6, margin: 0 },
};
