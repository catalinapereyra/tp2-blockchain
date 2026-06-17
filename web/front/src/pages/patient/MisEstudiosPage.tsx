import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import EstudioGrupoCard, { EstudioItem } from "../../components/patient/EstudioGrupoCard";

interface DocRecord {
  id: number;
  documentIdOnChain: number;
  patientAddress: string;
  emitterAddress: string;
  title: string;
  description?: string;
  documentType: string;
  studyType?: string;
  studyDate?: string;
  labName?: string;
  ipfsCid: string;
  ipfsUrl: string;
  createdAt: string;
}

interface Grupo {
  studyType: string;
  category: string;
  estudios: EstudioItem[];
}

function groupDocuments(docs: DocRecord[], myAddress: string): Grupo[] {
  const map = new Map<string, Grupo>();

  for (const doc of docs) {
    const key = doc.studyType || doc.documentType;
    if (!map.has(key)) {
      map.set(key, { studyType: key, category: doc.documentType, estudios: [] });
    }
    map.get(key)!.estudios.push({
      id: doc.id,
      studyDate: doc.studyDate ?? doc.createdAt,
      title: doc.title,
      labName: doc.labName ?? undefined,
      uploadedBy: doc.emitterAddress.toLowerCase() === myAddress.toLowerCase() ? "patient" : "lab",
      ipfsUrl: doc.ipfsUrl || undefined,
      diagnosis: undefined, // diagnóstico viene on top luego
    });
  }

  return Array.from(map.values());
}

export default function MisEstudiosPage() {
  const navigate = useNavigate();
  const { address } = useWallet();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api
      .getDocuments(address)
      .then((docs: DocRecord[]) => {
        setGrupos(groupDocuments(docs, address));
      })
      .catch((err: any) => setError(err.message || "Error cargando estudios"))
      .finally(() => setLoading(false));
  }, [address]);

  const totalEstudios = grupos.reduce((sum, g) => sum + g.estudios.length, 0);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/patient")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.pageHeader}>
          <div style={s.pageIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Mis estudios</h1>
            <p style={s.pageSubtitle}>
              {loading ? "Cargando…" : `${totalEstudios} estudios · ${grupos.length} tipos distintos`}
            </p>
          </div>
          <button style={s.uploadBtn} onClick={() => navigate("/patient/subir")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Subir
          </button>
        </div>

        {loading && (
          <div style={s.center}>
            <div style={s.spinner} />
          </div>
        )}

        {!loading && error && (
          <div style={s.errorBox}>{error}</div>
        )}

        {!loading && !error && grupos.length === 0 && (
          <div style={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p style={s.emptyText}>No tenés estudios todavía.</p>
            <button style={s.emptyBtn} onClick={() => navigate("/patient/subir")}>Subir tu primer estudio</button>
          </div>
        )}

        {!loading && grupos.length > 0 && (
          <>
            <div style={s.legend}>
              <span style={s.legendItem}><span style={{ ...s.dot, background: "#10b981" }} />Más reciente del tipo</span>
              <span style={s.legendItem}><span style={{ ...s.dot, background: "#6366f1" }} />Subido por vos</span>
              <span style={s.legendItem}><span style={{ ...s.dot, background: "#16a34a" }} />Verificado por lab</span>
            </div>
            <div style={s.list}>
              {grupos.map((g) => (
                <EstudioGrupoCard
                  key={g.studyType}
                  studyType={g.studyType}
                  category={g.category}
                  estudios={g.estudios}
                />
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
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: "#f5f3ff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "2px 0 0" },
  uploadBtn: {
    marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
    background: "#6366f1", color: "white", border: "none",
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
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
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" as const },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" },
  dot: { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 12, padding: "60px 0", textAlign: "center" as const,
  },
  emptyText: { fontSize: 14, color: "#94a3b8", margin: 0 },
  emptyBtn: {
    background: "#6366f1", color: "white", border: "none",
    padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};
