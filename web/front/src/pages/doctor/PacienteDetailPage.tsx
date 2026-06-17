import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EstudioCard, { Estudio } from "../../components/doctor/EstudioCard";

const MOCK_ESTUDIOS: Record<string, Estudio[]> = {
  "0xa05317a6208826d4f9c71b3e1234567890abcdef": [
    {
      id: 1,
      category: "analisis",
      specificType: "Colesterol total + HDL/LDL",
      uploadedBy: "0xb08d7b3c791b5ead",
      date: "16 jun 2026",
      ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmExample1",
      diagnosis: undefined,
    },
    {
      id: 2,
      category: "analisis",
      specificType: "TSH - Tiroides",
      uploadedBy: "0xb08d7b3c791b5ead",
      date: "10 jun 2026",
      ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmExample2",
      diagnosis: undefined,
    },
    {
      id: 3,
      category: "imagen",
      specificType: "Ecografía abdominal",
      uploadedBy: "0xb08d7b3c791b5ead",
      date: "2 jun 2026",
      ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmExample3",
      diagnosis: "Sin hallazgos patológicos. Hígado, vesícula y páncreas dentro de parámetros normales.",
    },
  ],
  "0xb08d7b3c791b5ead1234567890abcdefabcdef12": [
    {
      id: 4,
      category: "analisis",
      specificType: "Glucemia en ayunas + HbA1c",
      uploadedBy: "0xc1234567890abcdef",
      date: "10 jun 2026",
      diagnosis: undefined,
    },
  ],
  "0xc1234567890abcdefabcdef12b08d7b3c791b5ea": [
    {
      id: 5, category: "analisis", specificType: "Hemograma completo",
      uploadedBy: "0xb08d7b3c791b5ead", date: "14 jun 2026",
      diagnosis: "Valores normales. Hemoglobina en rango esperado.",
    },
    {
      id: 6, category: "imagen", specificType: "Radiografía de tórax",
      uploadedBy: "0xb08d7b3c791b5ead", date: "12 jun 2026",
      diagnosis: "Sin infiltrados ni consolidaciones. Campo pulmonar libre.",
    },
    {
      id: 7, category: "analisis", specificType: "Perfil lipídico",
      uploadedBy: "0xb08d7b3c791b5ead", date: "8 jun 2026",
      diagnosis: "LDL levemente elevado (148 mg/dL). Recomiendo ajuste dietario.",
    },
    {
      id: 8, category: "analisis", specificType: "Función renal (creatinina, urea)",
      uploadedBy: "0xb08d7b3c791b5ead", date: "5 jun 2026",
      diagnosis: "Dentro de rango normal.",
    },
    {
      id: 9, category: "imagen", specificType: "Ecografía renal",
      uploadedBy: "0xb08d7b3c791b5ead", date: "1 jun 2026",
      diagnosis: "Sin alteraciones estructurales.",
    },
  ],
};

export default function PacienteDetailPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [estudios, setEstudios] = useState<Estudio[]>(
    MOCK_ESTUDIOS[address ?? ""] ?? []
  );

  function handleSaveDiagnosis(studyId: number, text: string) {
    setEstudios((prev) =>
      prev.map((e) => e.id === studyId ? { ...e, diagnosis: text } : e)
    );
  }

  const pending = estudios.filter((e) => !e.diagnosis).length;
  const done = estudios.filter((e) => !!e.diagnosis).length;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/doctor/pacientes")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Mis pacientes
          </button>
        </div>

        <div style={s.pageHeader}>
          <div style={s.avatarWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>{address?.slice(0, 12)}…{address?.slice(-8)}</h1>
            <p style={s.pageSubtitle}>{estudios.length} estudios · {done} diagnosticados · {pending} pendientes</p>
          </div>
        </div>

        {/* Stats rápidas */}
        <div style={s.stats}>
          <div style={s.statCard}>
            <span style={s.statNum}>{estudios.length}</span>
            <span style={s.statLabel}>Estudios totales</span>
          </div>
          <div style={{ ...s.statCard, background: "#f0fdf4" }}>
            <span style={{ ...s.statNum, color: "#16a34a" }}>{done}</span>
            <span style={s.statLabel}>Diagnosticados</span>
          </div>
          <div style={{ ...s.statCard, background: "#fffbeb" }}>
            <span style={{ ...s.statNum, color: "#d97706" }}>{pending}</span>
            <span style={s.statLabel}>Sin diagnóstico</span>
          </div>
        </div>

        {estudios.length === 0 ? (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            <span>Este paciente no tiene estudios compartidos</span>
          </div>
        ) : (
          <>
            {pending > 0 && (
              <div style={s.sectionLabel}>
                <span style={s.sectionDot} />
                Sin diagnóstico
              </div>
            )}
            <div style={s.list}>
              {estudios.filter((e) => !e.diagnosis).map((e) => (
                <EstudioCard key={e.id} estudio={e} onSaveDiagnosis={handleSaveDiagnosis} />
              ))}
            </div>

            {done > 0 && (
              <div style={{ ...s.sectionLabel, marginTop: 24 }}>
                <span style={{ ...s.sectionDot, background: "#16a34a" }} />
                Diagnosticados
              </div>
            )}
            <div style={s.list}>
              {estudios.filter((e) => !!e.diagnosis).map((e) => (
                <EstudioCard key={e.id} estudio={e} onSaveDiagnosis={handleSaveDiagnosis} />
              ))}
            </div>
          </>
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
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 14, background: "#f5f3ff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "monospace", letterSpacing: 0 },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "3px 0 0" },
  stats: { display: "flex", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, background: "#f8fafc", borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column" as const, gap: 2,
    border: "1px solid #f1f5f9",
  },
  statNum: { fontSize: 22, fontWeight: 700, color: "#0f172a" },
  statLabel: { fontSize: 11, color: "#94a3b8" },
  sectionLabel: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, color: "#64748b",
    marginBottom: 10,
  },
  sectionDot: { width: 7, height: 7, borderRadius: "50%", background: "#d97706", display: "inline-block" },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10,
    padding: "48px 0", color: "#94a3b8", fontSize: 13,
  },
};
