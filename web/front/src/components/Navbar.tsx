import { useWallet } from "../context/WalletContext";

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Paciente:     { bg: "#f5f3ff", color: "#6366f1" },
  Médico:       { bg: "#f0f9ff", color: "#0ea5e9" },
  Laboratorio:  { bg: "#f0fdf4", color: "#10b981" },
  Institución:  { bg: "#fff7ed", color: "#f59e0b" },
  Admin:        { bg: "#f5f3ff", color: "#6366f1" },
};

export default function Navbar() {
  const { address, roleLabel, isAdmin, logout } = useWallet();
  const label = isAdmin ? "Admin" : (roleLabel || "Sin rol");
  const chip = ROLE_COLORS[label] ?? { bg: "#f1f5f9", color: "#64748b" };

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        <div style={s.logoIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <span style={s.logoText}>MediChain</span>
      </div>

      {address && (
        <div style={s.right}>
          <span style={{ ...s.roleChip, background: chip.bg, color: chip.color }}>
            {label}
          </span>
          <span style={s.addr}>
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
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
    borderBottom: "1px solid #f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "#f5f3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.4px",
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
    fontFamily: "monospace",
    fontSize: 12,
    color: "#94a3b8",
  },
  divider: {
    width: 1,
    height: 18,
    background: "#e2e8f0",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "1.5px solid #e2e8f0",
    color: "#64748b",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.15s, color 0.15s",
  },
};
