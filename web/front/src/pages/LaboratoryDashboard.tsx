import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { api, type DocumentMetadata } from "../lib/api";
import { LaboratoryStats } from "../components/laboratory/LaboratoryStats";
import { RecentActivity } from "../components/laboratory/RecentActivity";
import { StudyUploadForm } from "../components/laboratory/StudyUploadForm";
import { QuickActions } from "../components/laboratory/QuickActions";
import { Icon } from "../components/landing/Icon";
import { landing, colors, gradients, fontFamily, fontSize, fontWeight, radius } from "../styles";

export default function LaboratoryDashboard() {
  const { address, name, roleLabel } = useWallet();
  const roleTag = roleLabel === "Institución" ? "Institución" : "Laboratorio";
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
            <span style={s.avatarInner}><Icon name="lab" size={24} /></span>
          </div>
          <div>
            <p style={s.eyebrow}>Tu espacio en MediChain</p>
            <div style={s.greetingRow}>
              <h1 style={s.greeting}>Hola, {name || "👋"}</h1>
              <span style={s.roleTag}>{roleTag}</span>
            </div>
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
    background: landing.pageBg,
    fontFamily: fontFamily.sans,
    padding: "44px 40px 60px",
  },
  container: { width: "100%", maxWidth: 1320, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
  },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 18,
    background: landing.cardBg, border: landing.cardBorder,
    boxShadow: "0 14px 36px rgba(8,31,73,0.10)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarInner: {
    width: 44, height: 44, borderRadius: 13,
    background: "linear-gradient(135deg, rgba(3,190,195,0.18), rgba(120,82,255,0.16))",
    color: colors.lab, display: "flex", alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: colors.lab, fontWeight: fontWeight.bold, fontSize: fontSize.sm, letterSpacing: "0.05em", textTransform: "uppercase" as const, margin: 0 },
  greetingRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, margin: "5px 0 0" },
  greeting: { fontSize: 28, fontWeight: fontWeight.bold, color: landing.navy, margin: 0, letterSpacing: "-0.03em" },
  roleTag: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: landing.onBrand, background: gradients.brand, padding: "4px 12px", borderRadius: radius.full },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: landing.textBody, margin: "5px 0 0" },
  layout: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "minmax(0, 1fr) 360px",
    alignItems: "start",
  },
  left: { display: "grid", gap: 20, minWidth: 0 },
  right: { display: "grid", gap: 16, minWidth: 0 },
};
