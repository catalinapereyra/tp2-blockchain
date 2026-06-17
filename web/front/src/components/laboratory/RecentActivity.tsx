import { useMemo, useState } from "react";
import { type DocumentMetadata } from "../../lib/api";
import { LaboratoryCard } from "./LaboratoryCard";

type RecentActivityProps = {
  documents: DocumentMetadata[];
  loading?: boolean;
  error?: string | null;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RecentActivity({ documents, loading = false, error = null }: RecentActivityProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleDocuments = useMemo(
    () => (showAll ? documents : documents.slice(0, 5)),
    [documents, showAll],
  );

  return (
    <LaboratoryCard
      title="Actividad Reciente"
      action={documents.length > 5 ? (showAll ? "Ver menos" : "Ver todo") : undefined}
      onAction={() => setShowAll((current) => !current)}
    >
      <div style={styles.list}>
        {loading ? <p style={styles.state}>Cargando actividad...</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}
        {!loading && !error && visibleDocuments.length === 0 ? (
          <p style={styles.state}>Todavia no hay estudios subidos por este laboratorio.</p>
        ) : null}
        {visibleDocuments.map((document) => (
          <div key={document.id} style={styles.item}>
            <span style={{ ...styles.icon, ...toneStyles.green }}>OK</span>
            <div>
              <strong style={styles.title}>Estudio subido</strong>
              <p style={styles.text}>
                {document.title || document.documentType} - {shortAddress(document.patientAddress)}
              </p>
            </div>
            <time style={styles.time}>{formatDate(document.createdAt)}</time>
          </div>
        ))}
      </div>
    </LaboratoryCard>
  );
}

const toneStyles: Record<string, React.CSSProperties> = {
  green: { background: "#dcfce7", color: "#16a34a" },
};

const styles: Record<string, React.CSSProperties> = {
  list: { display: "grid", gap: 20, padding: "20px 22px 22px" },
  item: {
    alignItems: "center",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "32px minmax(0, 1fr) auto",
    minWidth: 0,
  },
  icon: {
    alignItems: "center",
    borderRadius: "50%",
    display: "flex",
    fontSize: 9,
    fontWeight: 900,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  title: { color: "#2b3b59", display: "block", fontSize: 12, fontWeight: 900 },
  text: { color: "#61708d", fontSize: 11, fontWeight: 800, marginTop: 5, overflowWrap: "anywhere" },
  time: { color: "#61708d", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" },
  state: { color: "#64748b", fontSize: 12, fontWeight: 800, lineHeight: 1.5 },
  error: { color: "#dc2626", fontSize: 12, fontWeight: 800, lineHeight: 1.5 },
};
