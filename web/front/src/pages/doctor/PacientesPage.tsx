import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PacienteCard, { Paciente } from "../../components/doctor/PacienteCard";

const MOCK_PACIENTES: Paciente[] = [
  {
    address: "0xa05317a6208826d4f9c71b3e1234567890abcdef",
    studyCount: 3,
    lastStudyDate: "16 jun 2026",
    pendingDiagnosis: 2,
  },
  {
    address: "0xb08d7b3c791b5ead1234567890abcdefabcdef12",
    studyCount: 1,
    lastStudyDate: "10 jun 2026",
    pendingDiagnosis: 1,
  },
  {
    address: "0xc1234567890abcdefabcdef12b08d7b3c791b5ea",
    studyCount: 5,
    lastStudyDate: "14 jun 2026",
    pendingDiagnosis: 0,
  },
];

export default function PacientesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = MOCK_PACIENTES.filter((p) =>
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = MOCK_PACIENTES.reduce((sum, p) => sum + p.pendingDiagnosis, 0);

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Mis pacientes</h1>
            <p style={s.pageSubtitle}>
              {MOCK_PACIENTES.length} pacientes · {totalPending > 0 ? `${totalPending} estudios sin diagnóstico` : "Todo diagnosticado"}
            </p>
          </div>
        </div>

        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={s.searchInput}
            placeholder="Buscar por dirección…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span>No se encontraron pacientes</span>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((p) => <PacienteCard key={p.address} paciente={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 60,
  },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: "#64748b",
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: "#f5f3ff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "2px 0 0" },
  searchWrap: { position: "relative", marginBottom: 16 },
  searchInput: {
    width: "100%", padding: "10px 12px 10px 36px",
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" as const,
    background: "white",
  },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10,
    padding: "48px 0", color: "#94a3b8", fontSize: 13,
  },
};
