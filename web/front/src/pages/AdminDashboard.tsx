import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { getUserRegistry, getUserRegistryReadOnly, ADDRESSES, ROLE_LABELS, explorerTxUrl } from "../lib/contracts";
import { api } from "../lib/api";
import { useLoader } from "../components/common/Loader";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../styles";

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

function initials(u: UserInfo): string {
  const n = fullName(u);
  if (n) return n.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");
  return "?";
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
  0: { bg: palette.indigoSoft, color: palette.indigo500 },
  1: { bg: palette.sky50, color: palette.sky500 },
  2: { bg: palette.emerald50, color: palette.emerald600 },
  3: { bg: palette.amber100, color: palette.amber600 },
};

const STATUS_CONFIG: Record<number, { color: string; bg: string; label: string }> = {
  0: { color: palette.amber600, bg: palette.amber50, label: "Pendiente" },
  1: { color: palette.emerald600, bg: palette.emerald50, label: "Aprobado" },
  2: { color: palette.red600, bg: palette.red50, label: "Rechazado" },
  3: { color: palette.slate400, bg: palette.slate50, label: "Revocado" },
};

type Tab = "pending" | "approved" | "history";
type RoleFilter = "all" | 1 | 2 | 3;

export default function AdminDashboard() {
  const loader = useLoader();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("pending");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");

  // Búsqueda de wallet exacta (sirve también para pacientes, que no están en los logs)
  const [searchAddr, setSearchAddr] = useState("");
  const [searchData, setSearchData] = useState<UserInfo | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await fetchPendingFromEtherscan();
      setUsers(await Promise.all(list.map(withName)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando solicitudes");
    } finally {
      setLoading(false);
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
    setError(""); setSuccess(""); setSuccessTxHash(null);
    setActionLoading(addr + fn);
    loader.show("Confirmá en MetaMask…");
    try {
      const contract = await getUserRegistry();
      const tx = await (contract as any)[fn](addr);
      loader.show("Procesando transacción…");
      await tx.wait();
      const labels: Record<string, string> = { approveUser: "aprobado", rejectUser: "rechazado", revokeUser: "revocado" };
      setSuccess(`Usuario ${labels[fn]} correctamente`);
      setSuccessTxHash(tx.hash);
      await load();
      if (searchData?.address.toLowerCase() === addr.toLowerCase()) {
        const c = getUserRegistryReadOnly();
        const u = await c.getUser(addr);
        setSearchData(await withName({ address: addr, role: Number(u.role), status: Number(u.status), registeredAt: Number(u.registeredAt) }));
      }
    } catch (e: unknown) {
      const err = e as { reason?: string; message?: string };
      setError(err.reason || err.message || "Error desconocido");
    } finally {
      loader.hide();
      setActionLoading(null);
    }
  }

  const pending = users.filter((u) => u.status === 0);
  const approved = users.filter((u) => u.status === 1);
  const history = users.filter((u) => u.status === 2 || u.status === 3);

  const activeList = tab === "pending" ? pending : tab === "approved" ? approved : history;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeList.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.address.toLowerCase().includes(q) || (fullName(u)?.toLowerCase().includes(q) ?? false);
    });
  }, [activeList, roleFilter, query]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: pending.length },
    { key: "approved", label: "Aprobados", count: approved.length },
    { key: "history", label: "Historial", count: history.length },
  ];

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.indigo500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={s.title}>Panel de administración</h1>
            <p style={s.subtitle}>Gestioná usuarios y solicitudes de la plataforma</p>
          </div>
          <button style={s.refreshBtn} onClick={load} disabled={loading} title="Actualizar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {error && <div style={s.alertError}>{error}</div>}
        {success && (
          <div style={s.alertSuccess}>
            {success}
            {successTxHash && (
              <a href={explorerTxUrl(successTxHash)} target="_blank" rel="noopener noreferrer" style={s.alertLink}>
                Ver en Etherscan
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={s.stats}>
          {([
            { label: "Pendientes", value: pending.length, color: palette.amber600 },
            { label: "Aprobados", value: approved.length, color: palette.emerald600 },
            { label: "Historial", value: history.length, color: palette.slate500 },
            { label: "Total", value: users.length, color: palette.indigo500 },
          ]).map((st) => (
            <div key={st.label} style={s.statCard}>
              <span style={{ ...s.statValue, color: st.color }}>{loading ? "·" : st.value}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar: tabs + search + role chips */}
        <div style={s.card}>
          <div style={s.tabsRow}>
            {tabs.map((t) => (
              <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }} onClick={() => setTab(t.key)}>
                {t.label}
                <span style={{ ...s.tabCount, ...(tab === t.key ? s.tabCountActive : {}) }}>{t.count}</span>
              </button>
            ))}
          </div>

          <div style={s.filterRow}>
            <div style={s.searchWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={palette.slate400} strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input style={s.searchInput} placeholder="Buscar por nombre o dirección…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div style={s.chips}>
              {([["all", "Todos"], [1, "Médicos"], [2, "Labs"], [3, "Inst."]] as [RoleFilter, string][]).map(([r, label]) => (
                <button key={String(r)} style={{ ...s.chip, ...(roleFilter === r ? s.chipActive : {}) }} onClick={() => setRoleFilter(r)}>{label}</button>
              ))}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div style={s.emptyState}><div style={s.spinner} /><span>Cargando desde blockchain…</span></div>
          ) : filtered.length === 0 ? (
            <div style={s.emptyState}><span style={{ color: palette.slate400 }}>No hay usuarios en esta vista.</span></div>
          ) : (
            <div style={s.list}>
              {filtered.map((u) => <UserItem key={u.address} user={u} onAction={action} actionLoading={actionLoading} />)}
            </div>
          )}
        </div>

        {/* Buscar wallet exacta (incluye pacientes) */}
        <div style={s.card}>
          <span style={s.cardTitle}>Buscar wallet exacta</span>
          <p style={s.cardHint}>Cualquier dirección, incluso pacientes (que no aparecen en las listas).</p>
          <div style={s.searchRow}>
            <input style={s.walletInput} placeholder="0x… dirección de wallet" value={searchAddr} onChange={(e) => setSearchAddr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchAddr && lookup()} />
            <button style={s.btnPrimary} onClick={lookup} disabled={searchLoading || !searchAddr}>{searchLoading ? "…" : "Buscar"}</button>
          </div>
          {searchData && <div style={{ marginTop: 12 }}><UserItem user={searchData} onAction={action} actionLoading={actionLoading} showFullAddress /></div>}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function UserItem({ user, onAction, actionLoading, showFullAddress }: {
  user: UserInfo;
  onAction: (fn: "approveUser" | "rejectUser" | "revokeUser", addr: string) => void;
  actionLoading: string | null;
  showFullAddress?: boolean;
}) {
  const rc = ROLE_COLORS[user.role] ?? ROLE_COLORS[1];
  const sc = STATUS_CONFIG[user.status] ?? STATUS_CONFIG[0];
  const name = fullName(user);
  const busy = actionLoading !== null;

  return (
    <div style={s.item}>
      <div style={{ ...s.avatar, background: rc.bg, color: rc.color }}>{initials(user)}</div>
      <div style={s.itemInfo}>
        {name && <span style={s.itemName}>{name}</span>}
        <span style={name ? s.itemAddrSmall : s.itemAddr}>{showFullAddress ? user.address : `${user.address.slice(0, 10)}…${user.address.slice(-6)}`}</span>
        <div style={s.itemTags}>
          <span style={{ ...s.pill, background: rc.bg, color: rc.color }}>{ROLE_LABELS[user.role]}</span>
          <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{sc.label}</span>
          <span style={s.itemDate}>{new Date(user.registeredAt * 1000).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>
      </div>
      <div style={s.itemActions}>
        {user.status === 0 && (
          <>
            <button style={s.btnApprove} disabled={busy} onClick={() => onAction("approveUser", user.address)} title="Aprobar">
              {actionLoading === user.address + "approveUser" ? "…" : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
            <button style={s.btnReject} disabled={busy} onClick={() => onAction("rejectUser", user.address)} title="Rechazar">
              {actionLoading === user.address + "rejectUser" ? "…" : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </button>
          </>
        )}
        {user.status === 1 && user.role !== 0 && (
          <button style={s.btnRevoke} disabled={busy} onClick={() => onAction("revokeUser", user.address)}>
            {actionLoading === user.address + "revokeUser" ? "…" : "Revocar"}
          </button>
        )}
        {user.status === 3 && (
          <button style={{ ...s.btnRevoke, background: palette.emerald600, borderColor: palette.emerald600 }} disabled={busy} onClick={() => onAction("approveUser", user.address)}>
            {actionLoading === user.address + "approveUser" ? "…" : "Re-aprobar"}
          </button>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 760, margin: "0 auto", padding: "40px 20px" },
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
  headerIcon: { width: 44, height: 44, borderRadius: radius.lg, background: palette.indigoSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.5px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  refreshBtn: { background: palette.white, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center", color: colors.textMuted, flexShrink: 0 },
  alertError: { background: colors.error.bg, color: colors.error.fg, border: `1px solid ${colors.error.border}`, padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: fontSize.base },
  alertSuccess: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: colors.success.bg, color: colors.success.fg, border: `1px solid ${colors.success.border}`, padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: fontSize.base },
  alertLink: { display: "inline-flex", alignItems: "center", gap: 5, color: colors.success.fg, fontWeight: 600, textDecoration: "underline", whiteSpace: "nowrap" },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 },
  statCard: { background: palette.white, border: `1.5px solid ${colors.bgSubtle}`, borderRadius: radius.lg, padding: "14px 12px", display: "flex", flexDirection: "column" as const, alignItems: "flex-start", gap: 2, boxShadow: shadow.sm, fontFamily: fontFamily.sans, transition: "border-color 0.15s" },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.sm, color: colors.textFaint },
  card: { background: palette.white, borderRadius: radius["2xl"], padding: "18px 20px", boxShadow: shadow.sm, border: `1px solid ${colors.bgSubtle}`, marginBottom: 16 },
  tabsRow: { display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${colors.bgSubtle}`, paddingBottom: 12 },
  tab: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: radius.sm, padding: "7px 12px", fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textMuted, cursor: "pointer", fontFamily: fontFamily.sans },
  tabActive: { background: palette.indigoSoft, color: palette.indigo500 },
  tabCount: { fontSize: 11, fontWeight: fontWeight.bold, background: colors.bgSubtle, color: colors.textFaint, padding: "1px 7px", borderRadius: radius.full },
  tabCountActive: { background: palette.indigo100, color: palette.indigo500 },
  filterRow: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" as const, alignItems: "center" },
  searchWrap: { position: "relative", flex: 1, minWidth: 200 },
  searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: `1.5px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.base, fontFamily: fontFamily.sans, outline: "none", boxSizing: "border-box" as const, background: palette.white },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" as const },
  chip: { background: palette.white, border: `1.5px solid ${colors.border}`, borderRadius: radius.full, padding: "6px 12px", fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted, cursor: "pointer", fontFamily: fontFamily.sans },
  chipActive: { borderColor: palette.indigo500, color: palette.indigo500, background: palette.indigoSoft },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  emptyState: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, padding: "32px 0", color: colors.textFaint, fontSize: fontSize.base },
  spinner: { width: 22, height: 22, border: `2px solid ${colors.border}`, borderTopColor: palette.indigo500, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  item: { display: "flex", alignItems: "center", gap: 12, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.lg, padding: "12px 14px", background: palette.white },
  avatar: { width: 40, height: 40, borderRadius: radius.lg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fontSize.base, fontWeight: fontWeight.bold, flexShrink: 0 },
  itemInfo: { display: "flex", flexDirection: "column" as const, gap: 3, flex: 1, minWidth: 0 },
  itemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  itemAddr: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: palette.slate800, fontWeight: fontWeight.medium },
  itemAddrSmall: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint },
  itemTags: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const, marginTop: 2 },
  pill: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, padding: "2px 9px", borderRadius: radius.full },
  itemDate: { fontSize: fontSize.xs, color: colors.textFaint },
  itemActions: { display: "flex", gap: 6, flexShrink: 0 },
  btnApprove: { width: 38, height: 38, background: palette.emerald600, color: palette.white, border: "none", borderRadius: radius.md, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btnReject: { width: 38, height: 38, background: palette.red600, color: palette.white, border: "none", borderRadius: radius.md, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btnRevoke: { background: palette.red600, border: `1.5px solid ${palette.red600}`, color: palette.white, borderRadius: radius.sm, padding: "8px 16px", fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: "pointer", fontFamily: fontFamily.sans, whiteSpace: "nowrap" as const },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  cardHint: { fontSize: fontSize.sm, color: colors.textFaint, margin: "4px 0 12px" },
  searchRow: { display: "flex", gap: 8 },
  walletInput: { flex: 1, padding: "10px 14px", border: `1.5px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.base, fontFamily: fontFamily.mono, outline: "none" },
  btnPrimary: { background: palette.indigo500, color: palette.white, border: "none", padding: "10px 20px", borderRadius: radius.md, cursor: "pointer", fontWeight: fontWeight.semibold, fontSize: fontSize.md, fontFamily: fontFamily.sans, whiteSpace: "nowrap" as const },
};
