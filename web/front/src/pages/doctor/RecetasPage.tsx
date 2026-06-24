import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RecetaCard, { Receta } from "../../components/doctor/RecetaCard";
import { palette, fontFamily, gradients } from "../../styles";

const MOCK_RECETAS: Receta[] = [
  {
    id: 1,
    patientAddress: "0xa05317a6208826d4f9c71b3e1234567890abcdef",
    description: "Losartán 50mg - 1 comp por día",
    requestedAt: "16 jun 2026",
    status: "pending",
  },
  {
    id: 2,
    patientAddress: "0xb08d7b3c791b5ead1234567890abcdefabcdef12",
    description: "Metformina 850mg - 2 veces al día con comida",
    requestedAt: "15 jun 2026",
    status: "pending",
  },
  {
    id: 3,
    patientAddress: "0xa05317a6208826d4f9c71b3e1234567890abcdef",
    description: "Levotiroxina 50mcg - en ayunas",
    requestedAt: "10 jun 2026",
    status: "issued",
  },
  {
    id: 4,
    patientAddress: "0xc1234567890abcdefabcdef12b08d7b3c791b5ea",
    description: "Ibuprofeno 400mg - según dolor",
    requestedAt: "8 jun 2026",
    status: "rejected",
  },
];

export default function RecetasPage() {
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState<Receta[]>(MOCK_RECETAS);
  const [filter, setFilter] = useState<"all" | "pending" | "issued" | "rejected">("all");

  function handleAccept(id: number) {
    setRecetas((prev) => prev.map((r) => r.id === id ? { ...r, status: "accepted" } : r));
  }

  function handleReject(id: number) {
    setRecetas((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
  }

  const filtered = filter === "all" ? recetas : recetas.filter((r) => r.status === filter);
  const pendingCount = recetas.filter((r) => r.status === "pending").length;

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.sky500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Solicitudes de recetas</h1>
            <p style={s.pageSubtitle}>
              {pendingCount > 0 ? `${pendingCount} solicitudes pendientes de respuesta` : "Todas las solicitudes atendidas"}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div style={s.filters}>
          {(["all", "pending", "issued", "rejected"] as const).map((f) => (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {{ all: "Todas", pending: "Pendientes", issued: "Emitidas", rejected: "Rechazadas" }[f]}
              <span style={{ ...s.filterCount, ...(filter === f ? s.filterCountActive : {}) }}>
                {f === "all" ? recetas.length : recetas.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={palette.slate200} strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            <span>No hay solicitudes en esta categoría</span>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((r) => (
              <RecetaCard key={r.id} receta={r} onAccept={handleAccept} onReject={handleReject} />
            ))}
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
    fontFamily: fontFamily.sans,
    paddingBottom: 60,
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
    width: 44, height: 44, borderRadius: 12, background: palette.sky50,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  filters: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
  filterBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: palette.white, border: `1.5px solid ${palette.slate200}`,
    borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 500,
    cursor: "pointer", color: palette.slate600, fontFamily: fontFamily.sans,
  },
  filterBtnActive: { borderColor: palette.sky500, color: palette.sky500, background: palette.sky50 },
  filterCount: {
    background: palette.slate100, color: palette.slate400,
    fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
  },
  filterCountActive: { background: palette.sky100, color: palette.sky500 },
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10,
    padding: "48px 0", color: palette.slate400, fontSize: 13,
  },
};
