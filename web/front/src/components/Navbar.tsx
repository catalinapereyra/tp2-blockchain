import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { palette, fontFamily } from "../styles";
import BrandLogo from "./BrandLogo";

const HOME_BY_LABEL: Record<string, string> = {
  Paciente: "/patient",
  Médico: "/doctor",
  Laboratorio: "/lab",
  Institución: "/lab",
  Admin: "/admin",
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Paciente:     { bg: palette.indigoSoft, color: palette.indigo500 },
  Médico:       { bg: palette.sky50, color: palette.sky500 },
  Laboratorio:  { bg: palette.emerald50, color: palette.emerald500 },
  Institución:  { bg: palette.amber100, color: palette.amber500 },
  Admin:        { bg: palette.indigoSoft, color: palette.indigo500 },
};

export default function Navbar() {
  const navigate = useNavigate();
  const { address, roleLabel, isAdmin, isRegistered, logout } = useWallet();
  const label = isAdmin ? "Admin" : (roleLabel || "Sin rol");
  const chip = ROLE_COLORS[label] ?? { bg: palette.slate100, color: palette.slate500 };

  return (
    <nav style={s.nav}>
      <button
        style={s.logo}
        onClick={() => navigate(isAdmin ? "/admin" : HOME_BY_LABEL[label] ?? "/")}
        aria-label="MediChain, inicio"
      >
        <BrandLogo markHeight={26} fontSize={16} />
      </button>

      {address && (
        <div style={s.right}>
          <span style={{ ...s.roleChip, background: chip.bg, color: chip.color }}>
            {label}
          </span>
          <span style={s.addr}>
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          {!isAdmin && isRegistered && (
            <button style={s.btn} onClick={() => navigate("/perfil")} title="Mi perfil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Perfil
            </button>
          )}
          <div style={s.divider} />
          <button style={s.btn} onClick={logout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    height: 56,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${palette.slate100}`,
    fontFamily: fontFamily.sans,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  roleChip: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
    letterSpacing: "0.2px",
  },
  addr: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: palette.slate400,
  },
  divider: {
    width: 1,
    height: 18,
    background: palette.slate200,
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: `1.5px solid ${palette.slate200}`,
    color: palette.slate500,
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: fontFamily.sans,
    transition: "border-color 0.15s, color 0.15s",
  },
};
