import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import PacienteCard, { Paciente } from "../../components/doctor/PacienteCard";
import { palette, fontFamily, gradients } from "../../styles";

interface DocMeta {
  documentIdOnChain: number;
  studyDate?: string;
  createdAt: string;
}

interface PatientEntry {
  patientAddress: string;
  documents: DocMeta[];
}

function toLastDate(docs: DocMeta[]): string {
  const dates = docs.map((d) => new Date(d.studyDate ?? d.createdAt).getTime()).filter(Boolean);
  if (dates.length === 0) return "—";
  const max = new Date(Math.max(...dates));
  return max.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PacientesPage() {
  const navigate = useNavigate();
  const { address } = useWallet();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!address) return;
    api.getDoctorPatients(address)
      .then(async (entries: PatientEntry[]) => {
        // Enriquece cada paciente con su nombre off-chain (de la base de datos)
        const withNames = await Promise.all(entries.map(async (e) => {
          let name: string | undefined;
          try {
            const p = await api.getProfileByWallet(e.patientAddress);
            if (p?.name) name = `${p.name} ${p.lastName ?? ""}`.trim();
          } catch { /* sin perfil cargado */ }
          return {
            address: e.patientAddress,
            name,
            studyCount: e.documents.length,
            lastStudyDate: toLastDate(e.documents),
            pendingDiagnosis: 0,
          };
        }));
        setPacientes(withNames);
      })
      .catch((e: any) => setError(e.message || "Error cargando pacientes"))
      .finally(() => setLoading(false));
  }, [address]);

  const filtered = pacientes.filter((p) => {
    const q = search.toLowerCase();
    return p.address.toLowerCase().includes(q) || (p.name?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/doctor")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.pageHeader}>
          <div style={s.pageIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.indigo500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Mis pacientes</h1>
            <p style={s.pageSubtitle}>
              {loading ? "Cargando…" : `${pacientes.length} paciente${pacientes.length !== 1 ? "s" : ""} con acceso activo`}
            </p>
          </div>
        </div>

        {!loading && pacientes.length > 0 && (
          <div style={s.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={palette.slate400} strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre o dirección…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading && <div style={s.center}><div style={s.spinner} /></div>}

        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && pacientes.length === 0 && (
          <div style={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={palette.slate200} strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p style={s.emptyText}>Ningún paciente te dio acceso a sus estudios todavía.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={s.list}>
            {filtered.map((p) => <PacienteCard key={p.address} paciente={p} />)}
          </div>
        )}

        {!loading && search && filtered.length === 0 && (
          <div style={s.empty}>
            <span style={s.emptyText}>No se encontraron pacientes con esa dirección.</span>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: gradients.app,
    fontFamily: fontFamily.sans, paddingBottom: 60,
  },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: palette.slate500,
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: fontFamily.sans,
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: palette.indigoSoft,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  searchWrap: { position: "relative", marginBottom: 16 },
  searchInput: {
    width: "100%", padding: "10px 12px 10px 36px",
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, fontSize: 13,
    fontFamily: fontFamily.sans, outline: "none", boxSizing: "border-box" as const,
    background: palette.white,
  },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: {
    width: 28, height: 28, border: `3px solid ${palette.slate200}`,
    borderTopColor: palette.indigo500, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: palette.red50, border: `1px solid ${palette.red200}`,
    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: palette.red600,
  },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 12, padding: "60px 0", textAlign: "center" as const,
  },
  emptyText: { fontSize: 14, color: palette.slate400, margin: 0 },
};
