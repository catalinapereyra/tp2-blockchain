import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import EstudioGrupoCard, { EstudioItem } from "../../components/patient/EstudioGrupoCard";
import { categoryLabel } from "../../lib/categories";
import { Icon } from "../../components/landing/Icon";
import CategoryIcon from "../../components/common/Icon";
import PageShell, { lu, iconBox, accentPill } from "../../components/patient/PageShell";
import { landing, colors, sectionAccent, categoryAccentOf, palette } from "../../styles";

const accent = sectionAccent.estudios;

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

  const categorias = Array.from(
    grupos.reduce((m, g) => m.set(g.category, (m.get(g.category) ?? 0) + g.estudios.length), new Map<string, number>()),
  ).map(([value, count]) => ({ value, label: categoryLabel(value), count }));

  const gruposDeCategoria = selectedCat ? grupos.filter((g) => g.category === selectedCat) : [];

  return (
    <PageShell
      back={() => (selectedCat ? setSelectedCat(null) : navigate("/patient"))}
      accent={accent}
      icon="document"
      eyebrow="Historial médico"
      title="Mis estudios"
      subtitle={loading ? "Cargando…" : `${totalEstudios} estudios · ${grupos.length} categoría${grupos.length !== 1 ? "s" : ""}`}
      action={
        <button style={accentPill(accent)} onClick={() => navigate("/patient/subir")}>
          <Icon name="arrow" size={15} />
          Subir estudio
        </button>
      }
    >
      {loading && <div style={s.center}><div style={{ ...lu.spinner, borderTopColor: accent.main }} /></div>}

      {!loading && error && <div style={s.errorBox}>{error}</div>}

      {!loading && !error && grupos.length === 0 && (
        <div style={s.empty}>
          <span style={{ ...iconBox(accent), width: 60, height: 60, borderRadius: 18 }}><Icon name="document" size={30} /></span>
          <p style={s.emptyText}>No tenés estudios todavía.</p>
          <button style={accentPill(accent)} onClick={() => navigate("/patient/subir")}>
            <Icon name="arrow" size={15} />
            Subir tu primer estudio
          </button>
        </div>
      )}

      {/* Nivel 1: categorías */}
      {!loading && grupos.length > 0 && !selectedCat && (
        <div style={s.catGrid}>
          {categorias.map((c) => {
            const ca = categoryAccentOf(c.value);
            return (
              <button key={c.value} style={s.catCard} onClick={() => setSelectedCat(c.value)}>
                <span style={iconBox(ca)}><CategoryIcon name={c.value} size={20} color={ca.main} /></span>
                <div style={s.catInfo}>
                  <span style={s.catLabel}>{c.label}</span>
                  <span style={s.catCount}>{c.count} {c.count === 1 ? "estudio" : "estudios"}</span>
                </div>
                <span style={{ color: landing.textFaint, display: "inline-flex" }}><Icon name="arrow" size={16} /></span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nivel 2: estudios de la categoría */}
      {!loading && selectedCat && (
        <>
          <button style={s.catBack} onClick={() => setSelectedCat(null)}>
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={14} /></span>
            Categorías
          </button>
          <div style={s.legend}>
            <span style={s.legendItem}><span style={{ ...s.dot, background: categoryAccentOf(selectedCat).main }} />Más reciente del tipo</span>
            <span style={s.legendItem}><span style={{ ...s.dot, background: palette.violet500 }} />Subido por vos</span>
            <span style={s.legendItem}><span style={{ ...s.dot, background: palette.emerald500 }} />Verificado por lab</span>
          </div>
          <div style={s.list}>
            {gruposDeCategoria.map((g) => (
              <EstudioGrupoCard key={g.studyType} studyType={g.studyType} category={g.category} estudios={g.estudios} accent={categoryAccentOf(g.category)} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

const s: Record<string, React.CSSProperties> = {
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  errorBox: { background: palette.red50, border: `1px solid ${palette.red200}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: palette.red600 },
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" as const },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: landing.textFaint },
  dot: { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  list: { display: "flex", flexDirection: "column" as const, gap: 12 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 },
  catCard: {
    display: "flex", alignItems: "center", gap: 14,
    ...lu.card, borderRadius: 18, padding: "16px 18px", cursor: "pointer", textAlign: "left" as const,
    minHeight: 92, boxSizing: "border-box" as const,
  },
  catInfo: { display: "flex", flexDirection: "column" as const, gap: 3, flex: 1, minWidth: 0 },
  catLabel: { fontSize: 15, fontWeight: 700, color: landing.navy },
  catCount: { fontSize: 13, color: landing.textBody },
  catBack: {
    display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
    color: colors.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0,
    fontFamily: lu.card.fontFamily, marginBottom: 16,
  },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "60px 0", textAlign: "center" as const },
  emptyText: { fontSize: 15, color: landing.textBody, margin: 0 },
};
