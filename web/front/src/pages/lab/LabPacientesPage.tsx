import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api, type DocumentMetadata } from "../../lib/api";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

interface PatientGroup {
  address: string;
  name?: string;
  count: number;
  lastDate: string;
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function LabPacientesPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!address) return;
    api.getLaboratoryStudies(address)
      .then(async (docs: DocumentMetadata[]) => {
        // Agrupar los estudios por paciente
        const byPatient = new Map<string, DocumentMetadata[]>();
        for (const d of docs) {
          const list = byPatient.get(d.patientAddress) ?? [];
          list.push(d);
          byPatient.set(d.patientAddress, list);
        }
        // Armar grupos con nombre off-chain + fecha del último estudio
        const result = await Promise.all(
          [...byPatient.entries()].map(async ([addr, studies]) => {
            let name: string | undefined;
            try {
              const p = await api.getProfileByWallet(addr);
              if (p?.name) name = `${p.name} ${p.lastName ?? ""}`.trim();
            } catch { /* sin perfil */ }
            const dates = studies.map((d) => new Date(d.studyDate ?? d.createdAt).getTime()).filter(Boolean);
            return {
              address: addr,
              name,
              count: studies.length,
              lastDate: dates.length ? fmtDate(new Date(Math.max(...dates)).toISOString()) : "—",
            };
          }),
        );
        setGroups(result);
      })
      .catch((e: any) => setError(e.message || "Error cargando pacientes"))
      .finally(() => setLoading(false));
  }, [address]);

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    return g.address.toLowerCase().includes(q) || (g.name?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/lab")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.header}>
          <div style={s.iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={s.title}>Mis pacientes</h1>
            <p style={s.subtitle}>
              {loading ? "Cargando…" : `${groups.length} paciente${groups.length !== 1 ? "s" : ""} con estudios subidos`}
            </p>
          </div>
        </div>

        {!loading && groups.length > 0 && (
          <div style={s.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={palette.slate400} strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input style={s.searchInput} placeholder="Buscar por nombre o dirección…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        {loading && <div style={s.center}><div style={s.spinner} /></div>}
        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && groups.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyText}>Todavía no le subiste estudios a ningún paciente.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={s.list}>
            {filtered.map((g) => (
              <div key={g.address} style={s.card} onClick={() => navigate(`/lab/pacientes/${g.address}`)}>
                <div style={s.avatarWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div style={s.info}>
                  {g.name && <span style={s.name}>{g.name}</span>}
                  <span style={g.name ? s.addrSmall : s.addr}>{g.address.slice(0, 10)}…{g.address.slice(-6)}</span>
                  <div style={s.meta}>
                    <span style={s.metaItem}>{g.count} {g.count === 1 ? "estudio" : "estudios"}</span>
                    <span style={s.dot}>·</span>
                    <span style={s.metaItem}>Último: {g.lastDate}</span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.slate300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>
        )}

        {!loading && search && filtered.length === 0 && (
          <div style={s.empty}><span style={s.emptyText}>No se encontraron pacientes.</span></div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  searchWrap: { position: "relative", marginBottom: 16 },
  searchInput: { width: "100%", padding: "10px 12px 10px 36px", border: `1.5px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.base, fontFamily: fontFamily.sans, outline: "none", boxSizing: "border-box" as const, background: colors.surface },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: { width: 28, height: 28, border: `3px solid ${colors.border}`, borderTopColor: colors.lab, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { background: colors.error.bg, border: `1px solid ${colors.error.border}`, borderRadius: radius.md, padding: "12px 16px", fontSize: fontSize.base, color: colors.error.fg },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  card: { background: colors.surface, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.xl, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: shadow.sm },
  avatarWrap: { width: 40, height: 40, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  info: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: palette.slate800, fontWeight: fontWeight.medium },
  addrSmall: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint },
  meta: { display: "flex", alignItems: "center", gap: 6 },
  metaItem: { fontSize: fontSize.sm, color: colors.textFaint },
  dot: { fontSize: fontSize.sm, color: colors.borderStrong },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, padding: "60px 0", textAlign: "center" as const },
  emptyText: { fontSize: fontSize.md, color: colors.textFaint, margin: 0 },
};
