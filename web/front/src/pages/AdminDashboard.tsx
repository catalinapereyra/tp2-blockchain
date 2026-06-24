import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getUserRegistry, getUserRegistryReadOnly, ADDRESSES, ROLE_LABELS, STATUS_LABELS } from "../lib/contracts";
import { api } from "../lib/api";

interface UserInfo {
  address: string;
  role: number;
  status: number;
  registeredAt: number;
  name?: string;
  lastName?: string;
}

// Nombre y apellido off-chain (de la DB) para mostrar junto a la address
async function withName(u: UserInfo): Promise<UserInfo> {
  try {
    const p = await api.getProfileByWallet(u.address);
    return { ...u, name: p?.name || undefined, lastName: p?.lastName || undefined };
  } catch {
    return u;
  }
}

function fullName(u: UserInfo): string | null {
  if (!u.name) return null;
  return `${u.name} ${u.lastName ?? ""}`.trim();
}

const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string;
const PROF_REG_TOPIC = ethers.id("ProfessionalRegistrationRequested(address,uint8)");

async function fetchPendingFromEtherscan(): Promise<UserInfo[]> {
  const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=logs&action=getLogs&address=${ADDRESSES.userRegistry}&topic0=${PROF_REG_TOPIC}&apikey=${ETHERSCAN_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "1" || !data.result?.length) return [];
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const log of data.result) {
    const addr = ("0x" + log.topics[1].slice(26)).toLowerCase();
    if (!seen.has(addr)) { seen.add(addr); addresses.push(addr); }
  }
  const contract = getUserRegistryReadOnly();
  return Promise.all(
    addresses.map(async (addr) => {
      const u = await contract.getUser(addr);
      return { address: addr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) };
    })
  );
}

const ROLE_COLORS: Record<number, { bg: string; color: string }> = {
  0: { bg: "#f5f3ff", color: "#6366f1" },
  1: { bg: "#f0f9ff", color: "#0ea5e9" },
  2: { bg: "#f0fdf4", color: "#10b981" },
  3: { bg: "#fff7ed", color: "#f59e0b" },
};

const STATUS_CONFIG: Record<number, { color: string; bg: string; label: string }> = {
  0: { color: "#d97706", bg: "#fffbeb", label: "Pendiente" },
  1: { color: "#16a34a", bg: "#f0fdf4", label: "Aprobado" },
  2: { color: "#dc2626", bg: "#fef2f2", label: "Rechazado" },
  3: { color: "#94a3b8", bg: "#f8fafc", label: "Revocado" },
};

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
    setError("");
    try {
      const users = await fetchPendingFromEtherscan();
      setPendingUsers(await Promise.all(users.map(withName)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando solicitudes");
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
      setSearchData(await withName({ address: searchAddr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) }));
    } catch (e: unknown) {
      const err = e as { reason?: string; message?: string };
      setError(err.reason || err.message || "Error desconocido");
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
      if (searchData?.address.toLowerCase() === addr.toLowerCase()) {
        const c = getUserRegistryReadOnly();
        const u = await c.getUser(addr);
        setSearchData(await withName({ address: addr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) }));
      }
    } catch (e: unknown) {
      const err = e as { reason?: string; message?: string };
      setError(err.reason || err.message || "Error desconocido");
    } finally {
      setActionLoading(null);
    }
  }

  const pending = pendingUsers.filter((u) => u.status === 0);
  const approved = pendingUsers.filter((u) => u.status === 1);
  const rejected = pendingUsers.filter((u) => u.status === 2 || u.status === 3);

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Page title */}
        <div style={s.pageHeader}>
          <div style={s.pageIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Panel de administración</h1>
            <p style={s.pageSubtitle}>Gestioná usuarios y solicitudes de la plataforma</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={s.alertError}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}
        {success && (
          <div style={s.alertSuccess}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            {success}
          </div>
        )}

        {/* Solicitudes pendientes */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardHeaderLeft}>
              <span style={s.cardTitle}>Solicitudes pendientes</span>
              <span style={{ ...s.badge, background: pending.length > 0 ? "#fffbeb" : "#f1f5f9", color: pending.length > 0 ? "#d97706" : "#94a3b8" }}>
                {pending.length}
              </span>
            </div>
            <button style={s.refreshBtn} onClick={loadPending} disabled={loadingPending} title="Actualizar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: loadingPending ? "spin 1s linear infinite" : "none" }}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          {loadingPending ? (
            <div style={s.emptyState}>
              <div style={s.spinner} />
              <span>Cargando desde blockchain…</span>
            </div>
          ) : pending.length === 0 ? (
            <div style={s.emptyState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              <span style={{ color: "#94a3b8", fontSize: 14 }}>No hay solicitudes pendientes</span>
            </div>
          ) : (
            <div style={s.list}>
              {pending.map((u) => <PendingCard key={u.address} user={u} onAction={action} actionLoading={actionLoading} />)}
            </div>
          )}
        </div>

        {/* Aprobados */}
        {approved.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardHeaderLeft}>
                <span style={s.cardTitle}>Profesionales aprobados</span>
                <span style={{ ...s.badge, background: "#f0fdf4", color: "#16a34a" }}>{approved.length}</span>
              </div>
            </div>
            <div style={s.list}>
              {approved.map((u) => <UserRow key={u.address} user={u} onAction={action} actionLoading={actionLoading} />)}
            </div>
          </div>
        )}

        {/* Historial */}
        {rejected.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardHeaderLeft}>
                <span style={s.cardTitle}>Historial</span>
                <span style={{ ...s.badge, background: "#fef2f2", color: "#dc2626" }}>{rejected.length}</span>
              </div>
            </div>
            <div style={s.list}>
              {rejected.map((u) => <UserRow key={u.address} user={u} onAction={action} actionLoading={actionLoading} />)}
            </div>
          </div>
        )}

        {/* Buscar */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardHeaderLeft}>
              <span style={s.cardTitle}>Buscar usuario</span>
            </div>
          </div>
          <div style={s.searchRow}>
            <input
              style={s.input}
              placeholder="0x... dirección de wallet"
              value={searchAddr}
              onChange={(e) => setSearchAddr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddr && lookup()}
            />
            <button style={s.btnPrimary} onClick={lookup} disabled={searchLoading || !searchAddr}>
              {searchLoading ? "…" : "Buscar"}
            </button>
          </div>
          {searchData && (
            <UserRow user={searchData} onAction={action} actionLoading={actionLoading} showAddress />
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function PendingCard({ user, onAction, actionLoading }: {
  user: UserInfo;
  onAction: (fn: "approveUser" | "rejectUser" | "revokeUser", addr: string) => void;
  actionLoading: string | null;
}) {
  const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS[1];
  return (
    <div style={s.pendingItem}>
      <div style={s.pendingLeft}>
        <span style={{ ...s.rolePill, background: roleStyle.bg, color: roleStyle.color }}>
          {ROLE_LABELS[user.role]}
        </span>
        {fullName(user) && <span style={s.pendingName}>{fullName(user)}</span>}
        <span style={s.pendingAddr}>{user.address.slice(0, 10)}…{user.address.slice(-8)}</span>
        <span style={s.pendingDate}>{new Date(user.registeredAt * 1000).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
      </div>
      <div style={s.pendingActions}>
        <button
          style={s.btnApprove}
          disabled={actionLoading !== null}
          onClick={() => onAction("approveUser", user.address)}
          title="Aprobar"
        >
          {actionLoading === user.address + "approveUser" ? "…" : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>
        <button
          style={s.btnReject}
          disabled={actionLoading !== null}
          onClick={() => onAction("rejectUser", user.address)}
          title="Rechazar"
        >
          {actionLoading === user.address + "rejectUser" ? "…" : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          )}
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
  const sc = STATUS_CONFIG[user.status] ?? STATUS_CONFIG[0];
  const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS[1];
  return (
    <div style={s.userRow}>
      <div style={s.userRowInner}>
        <div style={s.userRowLeft}>
          {fullName(user) && <span style={s.userName}>{fullName(user)}</span>}
          <span style={s.userAddr}>
            {showAddress ? user.address : `${user.address.slice(0, 10)}…${user.address.slice(-8)}`}
          </span>
          <div style={s.userRowTags}>
            <span style={{ ...s.rolePill, background: roleStyle.bg, color: roleStyle.color }}>
              {ROLE_LABELS[user.role]}
            </span>
            <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>
              {sc.label}
            </span>
            <span style={s.metaDate}>
              {new Date(user.registeredAt * 1000).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        {user.status === 1 && user.role !== 0 && (
          <button
            style={{ ...s.btnRevoke, opacity: actionLoading !== null ? 0.6 : 1 }}
            disabled={actionLoading !== null}
            onClick={() => onAction("revokeUser", user.address)}
          >
            {actionLoading === user.address + "revokeUser" ? "…" : "Revocar"}
          </button>
        )}
        {user.status === 3 && (
          <button
            style={{ ...s.btnRevoke, background: "#16a34a", opacity: actionLoading !== null ? 0.6 : 1 }}
            disabled={actionLoading !== null}
            onClick={() => onAction("approveUser", user.address)}
          >
            {actionLoading === user.address + "approveUser" ? "…" : "Re-aprobar"}
          </button>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 60,
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 20px",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  pageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#f5f3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "2px 0 0",
  },
  alertError: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fef2f2", color: "#dc2626",
    border: "1px solid #fecaca",
    padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 13,
  },
  alertSuccess: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#f0fdf4", color: "#16a34a",
    border: "1px solid #bbf7d0",
    padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 13,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9",
    marginBottom: 16,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    letterSpacing: "-0.2px",
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
  },
  refreshBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    cursor: "pointer",
    padding: "6px 8px",
    display: "flex",
    alignItems: "center",
    color: "#64748b",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: "24px 0",
    color: "#94a3b8",
    fontSize: 13,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #e2e8f0",
    borderTop: "2px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  // Pending
  pendingItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #fde68a",
    borderRadius: 12,
    padding: "14px 16px",
    background: "#fffdf5",
  },
  pendingLeft: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  pendingName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  pendingAddr: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#64748b",
  },
  pendingDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  pendingActions: {
    display: "flex",
    gap: 8,
  },
  btnApprove: {
    width: 40,
    height: 40,
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnReject: {
    width: 40,
    height: 40,
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
    display: "inline-block",
  },
  // User row
  userRow: {
    border: "1px solid #f1f5f9",
    borderRadius: 12,
    padding: "14px 16px",
    background: "#fafafa",
  },
  userRowInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  userRowLeft: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  userAddr: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#1e293b",
    fontWeight: 500,
  },
  userRowTags: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
  },
  metaDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  btnRevoke: {
    background: "#dc2626",
    border: "none",
    color: "white",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  // Search
  searchRow: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    fontFamily: "monospace",
    outline: "none",
  },
  btnPrimary: {
    background: "#6366f1",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap" as const,
  },
};
