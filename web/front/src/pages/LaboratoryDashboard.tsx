import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { api, type DocumentMetadata } from "../lib/api";
import { LaboratoryStats } from "../components/laboratory/LaboratoryStats";
import { RecentActivity } from "../components/laboratory/RecentActivity";
import { StudyUploadForm } from "../components/laboratory/StudyUploadForm";
import { QuickActions } from "../components/laboratory/QuickActions";

export default function LaboratoryDashboard() {
  const { address, roleLabel } = useWallet();
  const name = roleLabel === "Institución" ? "Institución Central" : "Laboratorio Central";
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  async function loadLaboratoryStudies() {
    if (!address) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    return api.getLaboratoryStudies(address)
      .then((docs) => { setDocuments(docs); })
      .catch((err: Error) => { setDocumentsError(err.message || "No se pudieron cargar los estudios"); })
      .finally(() => { setDocumentsLoading(false); });
  }

  useEffect(() => {
    let cancelled = false;
    if (!address) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    api.getLaboratoryStudies(address)
      .then((docs) => { if (!cancelled) setDocuments(docs); })
      .catch((err: Error) => { if (!cancelled) setDocumentsError(err.message || "No se pudieron cargar los estudios"); })
      .finally(() => { if (!cancelled) setDocumentsLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.header}>
          <div style={s.avatarWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0a5 5 0 0 0 10 0M9 14H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4"/>
            </svg>
          </div>
          <div>
            <h1 style={s.greeting}>Hola, {name}</h1>
            <p style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</p>
          </div>
          <LaboratoryStats totalStudies={documents.length} loading={documentsLoading} />
        </div>

        <div style={s.layout}>
          <section style={s.left}>
            <StudyUploadForm onStudyCreated={loadLaboratoryStudies} />
          </section>
          <aside style={s.right}>
            <RecentActivity documents={documents} loading={documentsLoading} error={documentsError} />
            <QuickActions />
          </aside>
        </div>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif",
    padding: "40px 20px 60px",
  },
  container: { width: "100%", maxWidth: 1040, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 32,
  },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 16,
    background: "white", border: "1px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  greeting: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" },
  addr: { fontFamily: "monospace", fontSize: 12, color: "#94a3b8", margin: "3px 0 0" },
  layout: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1fr) 340px",
    alignItems: "start",
  },
  left: { display: "grid", gap: 20, minWidth: 0 },
  right: { display: "grid", gap: 16, minWidth: 0 },
};
