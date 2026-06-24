import React from "react";
import { useWallet } from "../context/WalletContext";
import { palette, fontFamily, gradients } from "../styles";

export default function Pending() {
  const { address, refresh, userStatus } = useWallet();
  const isRevoked = userStatus === 3;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ ...s.iconWrap, background: isRevoked ? palette.red50 : palette.amber50 }}>
          {isRevoked ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.red600} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.amber600} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          )}
        </div>

        <h2 style={{ ...s.title, color: isRevoked ? palette.red600 : palette.slate900 }}>
          {isRevoked ? "Cuenta revocada" : "Solicitud pendiente"}
        </h2>

        <p style={s.text}>
          {isRevoked
            ? "Tu acceso a la plataforma fue revocado por el administrador. Contactate con el administrador para más información."
            : "Tu solicitud de registro está siendo revisada por el administrador. Una vez aprobada, podrás acceder a la plataforma."}
        </p>

        <p style={s.wallet}>{address}</p>

        {!isRevoked && (
          <button style={s.btn} onClick={refresh}>
            Verificar estado
          </button>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: gradients.app,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: fontFamily.sans, padding: "24px 16px",
  },
  card: {
    background: palette.white, borderRadius: 20, padding: "48px 40px",
    textAlign: "center" as const, maxWidth: 420, width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: `1px solid ${palette.slate100}`,
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 18,
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.4px" },
  text: { color: palette.slate500, lineHeight: 1.6, fontSize: 14, margin: 0, maxWidth: 320 },
  wallet: { fontSize: 11, color: palette.slate400, fontFamily: fontFamily.mono, margin: 0, wordBreak: "break-all" as const },
  btn: {
    marginTop: 8, background: palette.indigo500, color: palette.white, border: "none",
    padding: "11px 28px", borderRadius: 10, cursor: "pointer",
    fontWeight: 600, fontSize: 14, fontFamily: fontFamily.sans,
  },
};
