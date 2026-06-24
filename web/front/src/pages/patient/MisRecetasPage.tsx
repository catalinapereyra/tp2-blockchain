import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api, type DocumentMetadata, type PrescriptionMeta } from "../../lib/api";
import { getPrescriptionManager } from "../../lib/contracts";
import { useDocViewer } from "../../components/common/DocViewer";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

type Solicitud = { id: number; doctorName: string; description: string; status: number };

const REQ_STATUS: Record<number, { label: string; bg: string; color: string }> = {
  0: { label: "Pendiente", bg: palette.amber50, color: palette.amber600 },
  1: { label: "Aceptada", bg: palette.emerald50, color: palette.emerald600 },
  2: { label: "Rechazada", bg: palette.red50, color: palette.red600 },
};

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  return isNaN(p.getTime()) ? d : p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MisRecetasPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const viewer = useDocViewer();
  const [emitidas, setEmitidas] = useState<DocumentMetadata[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        // Recetas emitidas = documentos de categoría "receta"
        const docs = await api.getDocuments(address);
        setEmitidas(docs.filter((d) => d.documentType === "receta"));

        // Solicitudes en curso (estado on-chain) + texto/nombre off-chain
        const pm = await getPrescriptionManager();
        const ids: bigint[] = await pm.getPatientPrescriptions(address);
        const metas: PrescriptionMeta[] = await api.getPrescriptions({ patient: address });
        const byId = new Map(metas.map((m) => [m.prescriptionIdOnChain, m]));
        const reqs = await Promise.all(
          ids.map(async (idBn) => {
            const id = Number(idBn);
            const p = await pm.getPrescription(idBn);
            const meta = byId.get(id);
            return { id, doctorName: meta?.doctorName || "Médico", description: meta?.description ?? p.prescriptionType, status: Number(p.status) };
          }),
        );
        // mostramos solo las que NO están emitidas (esas aparecen arriba con su PDF)
        setSolicitudes(reqs.filter((r) => r.status === 0 || r.status === 1 || r.status === 2).sort((a, b) => b.id - a.id));
      } catch {
        /* sin datos */
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/patient")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.header}>
          <div>
            <h1 style={s.title}>Mis recetas</h1>
            <p style={s.subtitle}>{loading ? "Cargando…" : `${emitidas.length} emitida${emitidas.length !== 1 ? "s" : ""} · ${solicitudes.length} en curso`}</p>
          </div>
          <button style={s.requestBtn} onClick={() => navigate("/patient/recetas/solicitar")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Solicitar receta
          </button>
        </div>

        {/* Emitidas */}
        <h2 style={s.sectionTitle}>Emitidas</h2>
        {!loading && emitidas.length === 0 && <p style={s.emptyText}>Todavía no tenés recetas emitidas.</p>}
        <div style={s.list}>
          {emitidas.map((d) => (
            <div key={d.documentIdOnChain} style={s.card}>
              <div style={s.cardInfo}>
                <span style={s.cardTitle}>{d.title}</span>
                <span style={s.cardMeta}>
                  {d.emitterName ? `Dr. ${d.emitterName}` : d.emitterAddress.slice(0, 8) + "…"} · {fmtDate(d.studyDate ?? d.createdAt)}
                </span>
              </div>
              <button
                style={s.viewBtn}
                onClick={() => viewer.open({ url: api.fileUrl(d.documentIdOnChain), fileName: d.fileName, title: d.title })}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ver receta
              </button>
            </div>
          ))}
        </div>

        {/* Solicitudes en curso */}
        {solicitudes.length > 0 && (
          <>
            <h2 style={{ ...s.sectionTitle, marginTop: 24 }}>Solicitudes en curso</h2>
            <div style={s.list}>
              {solicitudes.map((r) => {
                const sc = REQ_STATUS[r.status] ?? REQ_STATUS[0];
                return (
                  <div key={r.id} style={s.card}>
                    <div style={s.cardInfo}>
                      <span style={s.cardDesc}>"{r.description}"</span>
                      <span style={s.cardMeta}>Dr. {r.doctorName}</span>
                    </div>
                    <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 600, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  requestBtn: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, background: colors.doctor, color: palette.white, border: "none", padding: "9px 16px", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.semibold, cursor: "pointer", fontFamily: fontFamily.sans, flexShrink: 0 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, margin: "0 0 10px" },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  card: { background: colors.surface, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.lg, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: shadow.sm },
  cardInfo: { display: "flex", flexDirection: "column" as const, gap: 3, minWidth: 0 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  cardDesc: { fontSize: fontSize.base, color: colors.text, fontStyle: "italic" },
  cardMeta: { fontSize: fontSize.sm, color: colors.textFaint },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold, flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontFamily: fontFamily.sans, padding: 0 },
  statusPill: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, padding: "3px 10px", borderRadius: radius.full, flexShrink: 0 },
  emptyText: { fontSize: fontSize.base, color: colors.textFaint, margin: "0 0 16px" },
};
