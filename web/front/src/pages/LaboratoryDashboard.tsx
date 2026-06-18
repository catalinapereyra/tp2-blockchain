import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { api, type DocumentMetadata } from "../lib/api";
import { LaboratoryHeader } from "../components/laboratory/LaboratoryHeader";
import { LaboratorySidebar } from "../components/laboratory/LaboratorySidebar";
import { LaboratoryStats } from "../components/laboratory/LaboratoryStats";
import { QuickActions } from "../components/laboratory/QuickActions";
import { RecentActivity } from "../components/laboratory/RecentActivity";
import { StudyUploadForm } from "../components/laboratory/StudyUploadForm";

export default function LaboratoryDashboard() {
  const { address, roleLabel } = useWallet();
  const name = roleLabel === "Institución" ? "Institucion Central" : "Laboratorio Central";
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  async function loadLaboratoryStudies() {
    if (!address) return;

    setDocumentsLoading(true);
    setDocumentsError(null);

    return api.getLaboratoryStudies(address)
      .then((docs) => {
        setDocuments(docs);
      })
      .catch((err: Error) => {
        setDocumentsError(err.message || "No se pudieron cargar los estudios");
      })
      .finally(() => {
        setDocumentsLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;

    if (!address) return;
    setDocumentsLoading(true);
    setDocumentsError(null);

    api.getLaboratoryStudies(address)
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err: Error) => {
        if (!cancelled) setDocumentsError(err.message || "No se pudieron cargar los estudios");
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div style={styles.shell}>
      <LaboratorySidebar />
      <div style={styles.app}>
        <LaboratoryHeader address={address} />
        <main style={styles.main}>
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>¡Hola, {name}!</h1>
            <p style={styles.subtitle}>Subi y gestiona estudios de laboratorio de forma segura.</p>
          </div>

          <div style={styles.layout}>
            <section style={styles.left}>
              <LaboratoryStats totalStudies={documents.length} loading={documentsLoading} />
              <StudyUploadForm onStudyCreated={loadLaboratoryStudies} />
            </section>
            <aside style={styles.right}>
              <RecentActivity documents={documents} loading={documentsLoading} error={documentsError} />
              <QuickActions />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    background: "#f8fafc",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    minHeight: "100vh",
  },
  app: { minWidth: 0 },
  main: {
    margin: "0 auto",
    maxWidth: 1540,
    padding: "34px 44px 56px",
    width: "100%",
  },
  titleBlock: { marginBottom: 28 },
  title: { color: "#12224a", fontSize: 28, fontWeight: 900, marginBottom: 12 },
  subtitle: { color: "#64748b", fontSize: 14, fontWeight: 800 },
  layout: {
    alignItems: "start",
    display: "grid",
    gap: 32,
    gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 380px)",
  },
  left: { display: "grid", gap: 30, minWidth: 0 },
  right: { alignSelf: "start", display: "grid", gap: 28, minWidth: 0 },
};
