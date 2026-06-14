import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getUserRegistry, getUserRegistryReadOnly, ADDRESSES, ROLE_LABELS, STATUS_LABELS } from "../lib/contracts";

interface UserInfo {
  address: string;
  role: number;
  status: number;
  registeredAt: number;
}

const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string;

// keccak256("ProfessionalRegistrationRequested(address,uint8)")
const PROF_REG_TOPIC = ethers.id("ProfessionalRegistrationRequested(address,uint8)");

async function fetchPendingFromEtherscan(): Promise<UserInfo[]> {
  const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=logs&action=getLogs&address=${ADDRESSES.userRegistry}&topic0=${PROF_REG_TOPIC}&apikey=${ETHERSCAN_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "1" || !data.result?.length) return [];

  // Deduplicate addresses
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const log of data.result) {
    const addr = ("0x" + log.topics[1].slice(26)).toLowerCase();
    if (!seen.has(addr)) { seen.add(addr); addresses.push(addr); }
  }

  // Fetch current status for each address
  const contract = getUserRegistryReadOnly();
  const users = await Promise.all(
    addresses.map(async (addr) => {
      const u = await contract.getUser(addr);
      return { address: addr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) };
    })
  );

  return users;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<UserInfo[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const [searchAddr, setSearchAddr] = useState("");
  const [searchData, setSearchData] = useState<UserInfo | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setLoadingPending(true);
    try {
      const all = await fetchPendingFromEtherscan();
      setPendingUsers(all);
    } catch (e: any) {
      console.error("Error cargando solicitudes:", e);
    } finally {
      setLoadingPending(false);
    }
  }

  async function lookup() {
    if (!searchAddr) return;
    setSearchData(null); setError(""); setSuccess("");
    setSearchLoading(true);
    try {
      const contract = getUserRegistryReadOnly();
      const reg = await contract.isRegistered(searchAddr);
      if (!reg) { setError("Wallet no registrada"); return; }
      const u = await contract.getUser(searchAddr);
      setSearchData({ address: searchAddr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) });
    } catch (e: any) {
      setError(e.reason || e.message);
    } finally {
      setSearchLoading(false);
    }
  }

  async function action(fn: "approveUser" | "rejectUser" | "revokeUser", addr: string) {
    setError(""); setSuccess("");
    setActionLoading(addr + fn);
    try {
      const contract = await getUserRegistry();
      const tx = await (contract as any)[fn](addr);
      await tx.wait();
      const labels: Record<string, string> = { approveUser: "aprobado", rejectUser: "rechazado", revokeUser: "revocado" };
      setSuccess(`Usuario ${labels[fn]} correctamente`);
      await loadPending();
      // Refresh search if same user
      if (searchData?.address.toLowerCase() === addr.toLowerCase()) {
        const c = getUserRegistryReadOnly();
        const u = await c.getUser(addr);
        setSearchData({ address: addr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) });
      }
    } catch (e: any) {
      setError(e.reason || e.message);
    } finally {
      setActionLoading(null);
    }
  }

  const pending = pendingUsers.filter((u) => u.status === 0);
  const approved = pendingUsers.filter((u) => u.status === 1);
  const rejected = pendingUsers.filter((u) => u.status === 2 || u.status === 3);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Panel Admin</h2>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successBox}>{success}</div>}

      {/* Solicitudes pendientes */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.section}>Solicitudes pendientes</h3>
          <span style={styles.countBadge}>{pending.length}</span>
          <button style={styles.refreshBtn} onClick={loadPending} disabled={loadingPending}>↻</button>
        </div>
        {loadingPending ? (
          <p style={styles.empty}>Cargando...</p>
        ) : pending.length === 0 ? (
          <p style={styles.empty}>No hay solicitudes pendientes</p>
        ) : (
          <div style={styles.list}>
            {pending.map((u) => (
              <PendingCard key={u.address} user={u} onAction={action} actionLoading={actionLoading} />
            ))}
          </div>
        )}
      </div>

      {/* Usuarios aprobados */}
      {approved.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.section}>Profesionales aprobados</h3>
            <span style={{ ...styles.countBadge, background: "#dcfce7", color: "#16a34a" }}>{approved.length}</span>
          </div>
          <div style={styles.list}>
            {approved.map((u) => (
              <UserRow key={u.address} user={u} onAction={action} actionLoading={actionLoading} />
            ))}
          </div>
        </div>
      )}

      {/* Rechazados / revocados */}
      {rejected.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.section}>Historial</h3>
            <span style={{ ...styles.countBadge, background: "#fee2e2", color: "#dc2626" }}>{rejected.length}</span>
          </div>
          <div style={styles.list}>
            {rejected.map((u) => (
              <UserRow key={u.address} user={u} onAction={action} actionLoading={actionLoading} />
            ))}
          </div>
        </div>
      )}

      {/* Buscar cualquier usuario */}
      <div style={styles.card}>
        <h3 style={styles.section}>Buscar usuario por address</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="0x... dirección"
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAddr && lookup()}
          />
          <button style={styles.btnPrimary} onClick={lookup} disabled={searchLoading || !searchAddr}>
            {searchLoading ? "..." : "Buscar"}
          </button>
        </div>
        {searchData && (
          <UserRow user={searchData} onAction={action} actionLoading={actionLoading} showAddress />
        )}
      </div>
    </div>
  );
}

function PendingCard({ user, onAction, actionLoading }: {
  user: UserInfo;
  onAction: (fn: "approveUser" | "rejectUser" | "revokeUser", addr: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div style={styles.pendingItem}>
      <div style={styles.pendingLeft}>
        <div style={styles.pendingRole}>{ROLE_LABELS[user.role]}</div>
        <div style={styles.pendingAddr}>{user.address.slice(0, 12)}...{user.address.slice(-8)}</div>
        <div style={styles.pendingDate}>{new Date(user.registeredAt * 1000).toLocaleDateString()}</div>
      </div>
      <div style={styles.pendingActions}>
        <button
          style={styles.btnApprove}
          disabled={actionLoading !== null}
          onClick={() => onAction("approveUser", user.address)}
        >
          {actionLoading === user.address + "approveUser" ? "..." : "✓"}
        </button>
        <button
          style={styles.btnReject}
          disabled={actionLoading !== null}
          onClick={() => onAction("rejectUser", user.address)}
        >
          {actionLoading === user.address + "rejectUser" ? "..." : "✗"}
        </button>
      </div>
    </div>
  );
}

function UserRow({ user, onAction, actionLoading, showAddress }: {
  user: UserInfo;
  onAction: (fn: "approveUser" | "rejectUser" | "revokeUser", addr: string) => void;
  actionLoading: string | null;
  showAddress?: boolean;
}) {
  const statusColor: Record<number, string> = { 0: "#d97706", 1: "#16a34a", 2: "#dc2626", 3: "#94a3b8" };

  return (
    <div style={styles.item}>
      <div style={styles.itemHeader}>
        <span style={{ fontFamily: "monospace", fontSize: 13 }}>
          {showAddress ? user.address : `${user.address.slice(0, 10)}...${user.address.slice(-6)}`}
        </span>
        <span style={{ ...styles.badge, color: statusColor[user.status] }}>
          {STATUS_LABELS[user.status]}
        </span>
      </div>
      <div style={styles.itemMeta}>
        <span>{ROLE_LABELS[user.role]}</span>
        <span>·</span>
        <span>{new Date(user.registeredAt * 1000).toLocaleDateString()}</span>
      </div>
      {user.status === 1 && user.role !== 0 && (
        <button
          style={{ ...styles.btnSmall, background: "#ea580c" }}
          disabled={actionLoading !== null}
          onClick={() => onAction("revokeUser", user.address)}
        >
          {actionLoading === user.address + "revokeUser" ? "..." : "Revocar"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 680, margin: "40px auto", padding: "0 16px" },
  title: { fontSize: 24, fontWeight: 700, color: "#1e40af", marginBottom: 20 },
  error: { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  successBox: { background: "#dcfce7", color: "#16a34a", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  card: { background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 20 },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  section: { fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0 },
  countBadge: { background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  refreshBtn: { marginLeft: "auto", background: "none", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: "4px 10px", fontSize: 14, color: "#64748b" },
  empty: { color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "16px 0" },
  list: { display: "flex", flexDirection: "column", gap: 10 },

  // Pending card — prominent with big ✓✗
  pendingItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", background: "#fff7ed",
  },
  pendingLeft: { display: "flex", flexDirection: "column", gap: 2 },
  pendingRole: { fontWeight: 700, fontSize: 15, color: "#1e40af" },
  pendingAddr: { fontFamily: "monospace", fontSize: 12, color: "#64748b" },
  pendingDate: { fontSize: 11, color: "#94a3b8" },
  pendingActions: { display: "flex", gap: 8 },
  btnApprove: { width: 44, height: 44, background: "#16a34a", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 20, fontWeight: 700 },
  btnReject: { width: 44, height: 44, background: "#dc2626", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 20, fontWeight: 700 },

  // Regular user row
  item: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" },
  itemHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemMeta: { fontSize: 12, color: "#94a3b8", display: "flex", gap: 6 },
  badge: { fontSize: 12, fontWeight: 600 },
  btnSmall: { color: "white", border: "none", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8 },

  row: { display: "flex", gap: 8, marginBottom: 14 },
  input: { flex: 1, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "monospace" },
  btnPrimary: { background: "#1e40af", color: "white", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const },
};
