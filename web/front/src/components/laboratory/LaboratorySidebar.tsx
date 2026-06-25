import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { palette } from "../../styles";

const items = [
  { icon: "⌂", label: "Inicio", active: true },
];

export function LaboratorySidebar() {
  const navigate = useNavigate();
  const { logout } = useWallet();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.shield}>✚</div>
        <div>
          <div style={styles.brandName}>MediChain</div>
          <div style={styles.brandText}>Salud segura en blockchain</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {items.map((item) => (
          <button key={item.label} style={{ ...styles.navItem, ...(item.active ? styles.active : {}) }}>
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={styles.bottom}>
        <button style={styles.bottomItem}>? Soporte</button>
        <button type="button" style={styles.bottomItem} onClick={handleLogout}>↪ Cerrar sesion</button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    background: palette.white,
    borderRight: `1px solid ${palette.labBorder3}`,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    padding: "26px 18px",
    width: 280,
  },
  brand: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    marginBottom: 38,
  },
  shield: {
    alignItems: "center",
    border: `3px solid ${palette.blue600}`,
    borderRadius: 8,
    color: palette.blue600,
    display: "flex",
    fontSize: 18,
    fontWeight: 900,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  brandName: { color: palette.blue700, fontSize: 20, fontWeight: 900 },
  brandText: { color: palette.labGray3, fontSize: 11, fontWeight: 700 },
  nav: { display: "grid", gap: 10 },
  navItem: {
    alignItems: "center",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: palette.slate500,
    cursor: "pointer",
    display: "flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 14,
    minHeight: 48,
    padding: "0 14px",
    textAlign: "left",
  },
  active: {
    background: palette.violetSoft2,
    color: palette.blue600,
  },
  navIcon: {
    alignItems: "center",
    display: "inline-flex",
    fontSize: 19,
    justifyContent: "center",
    width: 22,
  },
  bottom: {
    display: "grid",
    gap: 10,
    marginTop: "auto",
  },
  bottomItem: {
    background: "transparent",
    border: "none",
    color: palette.slate500,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    padding: "10px 0",
    textAlign: "left",
  },
};
