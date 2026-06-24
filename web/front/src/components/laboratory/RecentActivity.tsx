import { useMemo, useState } from "react";
import { type DocumentMetadata } from "../../lib/api";
import { LaboratoryCard } from "./LaboratoryCard";
import { palette, fontFamily } from "../../styles";

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
      title="Actividad reciente"
      action={documents.length > 5 ? (showAll ? "Ver menos" : "Ver todo") : undefined}
      onAction={() => setShowAll((current) => !current)}
    >
      <div style={styles.list}>
        {loading ? <p style={styles.state}>Cargando actividad...</p> : null}
        {error ? <p style={styles.errorText}>{error}</p> : null}
        {!loading && !error && visibleDocuments.length === 0 ? (
          <p style={styles.state}>Todavía no hay estudios subidos.</p>
        ) : null}
        {visibleDocuments.map((document) => (
          <div key={document.id} style={styles.item}>
            <div style={styles.dot} />
            <div style={styles.info}>
              <strong style={styles.itemTitle}>{document.title || document.documentType}</strong>
              <p style={styles.itemSub}>{shortAddress(document.patientAddress)}</p>
            </div>
            <time style={styles.time}>{formatDate(document.createdAt)}</time>
          </div>
        ))}
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "grid", gap: 12, padding: "16px 20px 20px" },
  item: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "8px minmax(0, 1fr) auto",
    minWidth: 0,
  },
  dot: {
    width: 8, height: 8, borderRadius: "50%",
    background: palette.emerald500, flexShrink: 0,
  },
  info: { minWidth: 0 },
  itemTitle: { display: "block", fontSize: 12, fontWeight: 600, color: palette.slate900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemSub: { fontSize: 11, color: palette.slate400, margin: "2px 0 0", fontFamily: fontFamily.mono },
  time: { fontSize: 10, color: palette.slate400, whiteSpace: "nowrap" },
  state: { color: palette.slate400, fontSize: 12, lineHeight: 1.5, margin: 0 },
  errorText: { color: palette.red500, fontSize: 12, lineHeight: 1.5, margin: 0 },
};
