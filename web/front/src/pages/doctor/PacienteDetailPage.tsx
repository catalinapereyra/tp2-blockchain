import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import EstudioCard, { Estudio } from "../../components/doctor/EstudioCard";

interface DocMeta {
  id: number;
  documentIdOnChain: number;
  title: string;
  documentType: string;
  studyType?: string;
  studyDate?: string;
  createdAt: string;
  emitterAddress: string;
  emitterName?: string | null;
  labName?: string;
  diagnosis?: string | null; // diagnóstico propio de este médico
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function toEstudio(doc: DocMeta): Estudio {
  return {
    id: doc.documentIdOnChain,
    category: doc.documentType,
    specificType: doc.studyType || doc.title,
    uploadedBy: doc.emitterAddress,
    labName: doc.labName || doc.emitterName || undefined,
    date: fmtDate(doc.studyDate ?? doc.createdAt),
    fileUrl: api.fileUrl(doc.documentIdOnChain),
    diagnosis: doc.diagnosis ?? undefined,
  };
}

export default function PacienteDetailPage() {
  const { address: patientAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { address: myAddress } = useWallet();

  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!myAddress || !patientAddress) return;
    api.getSharedDocs(patientAddress, myAddress)
      .then((docs: DocMeta[]) => setEstudios(docs.map(toEstudio)))
      .catch((e: any) => setError(e.message || "Error cargando estudios"))
      .finally(() => setLoading(false));
  }, [myAddress, patientAddress]);

  // Nombre off-chain del paciente (de la base de datos)
  useEffect(() => {
    if (!patientAddress) return;
    api.getProfileByWallet(patientAddress)
      .then((p) => { if (p?.name) setPatientName(`${p.name} ${p.lastName ?? ""}`.trim()); })
      .catch(() => { /* sin perfil cargado */ });
  }, [patientAddress]);

  async function handleSaveDiagnosis(studyId: number, text: string) {
    // Persiste el diagnóstico en la base de datos (off-chain) antes de actualizar la UI
    await api.saveDiagnosis(studyId, text);
    setEstudios((prev) =>
      prev.map((e) => (e.id === studyId ? { ...e, diagnosis: text } : e))
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
            {patientName ? (
              <>
                <h1 style={s.nameTitle}>{patientName}</h1>
                <p style={s.pageAddr}>{patientAddress?.slice(0, 12)}…{patientAddress?.slice(-8)}</p>
              </>
            ) : (
              <h1 style={s.pageTitle}>{patientAddress?.slice(0, 12)}…{patientAddress?.slice(-8)}</h1>
            )}
            <p style={s.pageSubtitle}>
              {loading ? "Cargando…" : `${estudios.length} estudios · ${done} diagnosticados · ${pending} pendientes`}
            </p>
          </div>
        </div>

        {!loading && estudios.length > 0 && (
          <div style={s.stats}>
            <div style={s.statCard}>
              <span style={s.statNum}>{estudios.length}</span>
              <span style={s.statLabel}>Compartidos</span>
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
        )}

        {loading && <div style={s.center}><div style={s.spinner} /></div>}

        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && estudios.length === 0 && !error && (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            </svg>
            <span style={s.emptyText}>Este paciente no tiene estudios compartidos con vos.</span>
          </div>
        )}

        {!loading && estudios.length > 0 && (
          <>
            {pending > 0 && (
              <>
                <div style={s.sectionLabel}>
                  <span style={s.sectionDot} />
                  Sin diagnóstico
                </div>
                <div style={s.list}>
                  {estudios.filter((e) => !e.diagnosis).map((e) => (
                    <EstudioCard key={e.id} estudio={e} onSaveDiagnosis={handleSaveDiagnosis} />
                  ))}
                </div>
              </>
            )}

            {done > 0 && (
              <>
                <div style={{ ...s.sectionLabel, marginTop: pending > 0 ? 24 : 0 }}>
                  <span style={{ ...s.sectionDot, background: "#16a34a" }} />
                  Diagnosticados
                </div>
                <div style={s.list}>
                  {estudios.filter((e) => !!e.diagnosis).map((e) => (
                    <EstudioCard key={e.id} estudio={e} onSaveDiagnosis={handleSaveDiagnosis} />
                  ))}
                </div>
              </>
            )}
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
    fontFamily: "'DM Sans', sans-serif", paddingBottom: 60,
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
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "monospace" },
  nameTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageAddr: { fontSize: 12, fontFamily: "monospace", color: "#94a3b8", margin: "2px 0 0" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "3px 0 0" },
  stats: { display: "flex", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, background: "#f8fafc", borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column" as const, gap: 2, border: "1px solid #f1f5f9",
  },
  statNum: { fontSize: 22, fontWeight: 700, color: "#0f172a" },
  statLabel: { fontSize: 11, color: "#94a3b8" },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: {
    width: 28, height: 28, border: "3px solid #e2e8f0",
    borderTopColor: "#6366f1", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#dc2626",
  },
  sectionLabel: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10,
  },
  sectionDot: { width: 7, height: 7, borderRadius: "50%", background: "#d97706", display: "inline-block" },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 10, padding: "48px 0", color: "#94a3b8", fontSize: 13,
  },
  emptyText: { fontSize: 14, color: "#94a3b8", margin: 0 },
};
