import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import EstudioGrupoCard, { EstudioItem } from "../../components/patient/EstudioGrupoCard";
import { categoryLabel } from "../../lib/categories";
import Icon from "../../components/common/Icon";
import { palette, fontFamily, gradients } from "../../styles";

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
  emitterName?: string | null;
  emitterRole?: number | null;
  fileName: string;
  mimeType: string;
  diagnoses?: { doctorName?: string | null; text: string }[];
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
    if (doc.documentType === "receta") continue; // las recetas van en su propia solapa
    const key = doc.studyType || doc.documentType;
    if (!map.has(key)) {
      map.set(key, { studyType: key, category: doc.documentType, estudios: [] });
    }
    map.get(key)!.estudios.push({
      id: doc.id,
      studyDate: doc.studyDate ?? doc.createdAt,
      title: doc.title,
      labName: doc.labName ?? doc.emitterName ?? undefined,
      uploadedBy:
        doc.emitterAddress.toLowerCase() === myAddress.toLowerCase()
          ? "patient"
          : doc.emitterRole === 1
            ? "doctor"
            : "lab",
      fileUrl: api.fileUrl(doc.documentIdOnChain),
      fileName: doc.fileName,
      documentIdOnChain: doc.documentIdOnChain,
      diagnoses: doc.diagnoses ?? [],
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
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api
      .getDocuments(address)
      .then((docs: DocRecord[]) => setGrupos(groupDocuments(docs, address)))
      .catch((err: any) => setError(err.message || "Error cargando estudios"))
      .finally(() => setLoading(false));
  }, [address]);

  const totalEstudios = grupos.reduce((sum, g) => sum + g.estudios.length, 0);

  // Categorías con su cantidad de estudios (primer nivel)
  const categorias = Array.from(
    grupos.reduce((m, g) => m.set(g.category, (m.get(g.category) ?? 0) + g.estudios.length), new Map<string, number>()),
  ).map(([value, count]) => ({ value, label: categoryLabel(value), count }));

  // Estudios de la categoría seleccionada (segundo nivel)
  const gruposDeCategoria = selectedCat ? grupos.filter((g) => g.category === selectedCat) : [];

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
          <div>
            <h1 style={s.pageTitle}>Mis estudios</h1>
            <p style={s.pageSubtitle}>
              {loading ? "Cargando…" : `${totalEstudios} estudios · ${grupos.length} categoría${grupos.length !== 1 ? "s" : ""}`}
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={palette.slate200} strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p style={s.emptyText}>No tenés estudios todavía.</p>
            <button style={s.emptyBtn} onClick={() => navigate("/patient/subir")}>Subir tu primer estudio</button>
          </div>
        )}

        {/* Nivel 1: categorías clickeables */}
        {!loading && grupos.length > 0 && !selectedCat && (
          <div style={s.catGrid}>
            {categorias.map((c) => (
              <button key={c.value} style={s.catCard} onClick={() => setSelectedCat(c.value)}>
                <div style={s.catIcon}>
                  <Icon name={c.value} size={18} color={palette.indigo500} />
                </div>
                <div style={s.catInfo}>
                  <span style={s.catLabel}>{c.label}</span>
                  <span style={s.catCount}>{c.count} {c.count === 1 ? "estudio" : "estudios"}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.slate300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        )}

        {/* Nivel 2: estudios de la categoría elegida */}
        {!loading && selectedCat && (
          <>
            <button style={s.catBack} onClick={() => setSelectedCat(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Categorías
            </button>
            <div style={s.legend}>
              <span style={s.legendItem}><span style={{ ...s.dot, background: palette.emerald500 }} />Más reciente del tipo</span>
              <span style={s.legendItem}><span style={{ ...s.dot, background: palette.indigo500 }} />Subido por vos</span>
              <span style={s.legendItem}><span style={{ ...s.dot, background: palette.emerald600 }} />Verificado por lab</span>
            </div>
            <div style={s.list}>
              {gruposDeCategoria.map((g) => (
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
    background: gradients.app,
    fontFamily: fontFamily.sans, paddingBottom: 60,
  },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: palette.slate500,
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: fontFamily.sans,
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: palette.indigoSoft,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  uploadBtn: {
    marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
    background: palette.indigo500, color: palette.white, border: "none",
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: {
    width: 28, height: 28, border: `3px solid ${palette.slate200}`,
    borderTopColor: palette.indigo500, borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: palette.red50, border: `1px solid ${palette.red200}`,
    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: palette.red600,
  },
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" as const },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: palette.slate400 },
  dot: { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  catCard: {
    display: "flex", alignItems: "center", gap: 12,
    background: palette.white, border: `1px solid ${palette.slate100}`, borderRadius: 14,
    padding: "14px 16px", cursor: "pointer", textAlign: "left" as const,
    fontFamily: fontFamily.sans, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "border-color 0.15s",
  },
  catIcon: {
    width: 40, height: 40, borderRadius: 12, background: palette.indigoSoft,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  catInfo: { display: "flex", flexDirection: "column" as const, gap: 2, flex: 1, minWidth: 0 },
  catLabel: { fontSize: 14, fontWeight: 600, color: palette.slate900 },
  catCount: { fontSize: 12, color: palette.slate400 },
  catBack: {
    display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
    color: palette.indigo500, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0,
    fontFamily: fontFamily.sans, marginBottom: 16,
  },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 12, padding: "60px 0", textAlign: "center" as const,
  },
  emptyText: { fontSize: 14, color: palette.slate400, margin: 0 },
  emptyBtn: {
    background: palette.indigo500, color: palette.white, border: "none",
    padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
