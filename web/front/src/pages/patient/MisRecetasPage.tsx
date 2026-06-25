import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api, type DocumentMetadata, type PrescriptionMeta } from "../../lib/api";
import { getPrescriptionManager, explorerTxUrl } from "../../lib/contracts";
import { getErrorMessage } from "../../lib/error";
import { useDocViewer } from "../../components/common/DocViewer";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";
import { useConfirm } from "../../components/common/Confirm";
import { Icon } from "../../components/landing/Icon";
import PageShell, { lu, iconBox, accentPill } from "../../components/patient/PageShell";
import { landing, sectionAccent, palette, colors, fontFamily } from "../../styles";

const accent = sectionAccent.recetas;

type Solicitud = { id: number; doctorName: string; description: string; status: number; createdAt?: string };
type Tab = "curso" | "emitidas";

const REQ_STATUS: Record<number, { label: string; bg: string; color: string }> = {
  0: { label: "Pendiente", bg: colors.warning.bg, color: colors.warning.fg },
  1: { label: "Aceptada", bg: colors.success.bg, color: colors.success.fg },
  2: { label: "Rechazada", bg: colors.error.bg, color: colors.error.fg },
};

const STATUS_FILTERS: { value: "all" | 0 | 1 | 2; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: 0, label: "Pendientes" },
  { value: 1, label: "Aceptadas" },
  { value: 2, label: "Rechazadas" },
];

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  return isNaN(p.getTime()) ? d : p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MisRecetasPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const viewer = useDocViewer();
  const toast = useToast();
  const loader = useLoader();
  const confirm = useConfirm();
  const [emitidas, setEmitidas] = useState<DocumentMetadata[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("curso");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | 0 | 1 | 2>("all");

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const docs = await api.getDocuments(address);
      setEmitidas(docs.filter((d) => d.documentType === "receta"));

      const pm = await getPrescriptionManager();
      const ids: bigint[] = await pm.getPatientPrescriptions(address);
      const metas: PrescriptionMeta[] = await api.getPrescriptions({ patient: address });
      const byId = new Map(metas.map((m) => [m.prescriptionIdOnChain, m]));
      const reqs = await Promise.all(
        ids.map(async (idBn) => {
          const id = Number(idBn);
          const p = await pm.getPrescription(idBn);
          const meta = byId.get(id);
          return { id, doctorName: meta?.doctorName || "Médico", description: meta?.description ?? p.prescriptionType, status: Number(p.status), createdAt: meta?.createdAt };
        }),
      );
      setSolicitudes(reqs.filter((r) => r.status === 0 || r.status === 1 || r.status === 2).sort((a, b) => b.id - a.id));
    } catch {
      /* sin datos */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (address) load(); }, [address]);

  // Por defecto abrimos la solapa con algo accionable; si no hay solicitudes y sí emitidas, mostramos esas.
  useEffect(() => {
    if (loading) return;
    if (solicitudes.length === 0 && emitidas.length > 0) setTab("emitidas");
  }, [loading, solicitudes.length, emitidas.length]);

  async function handleCancel(id: number) {
    const ok = await confirm({
      title: "Cancelar solicitud",
      message: "¿Querés cancelar esta solicitud de receta?",
      confirmText: "Sí, cancelar",
      cancelText: "No",
      danger: true,
    });
    if (!ok) return;
    setCancelling(id);
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPrescriptionManager();
      const tx = await pm.cancelPrescription(id);
      loader.show("Procesando transacción…");
      await tx.wait();
      toast.show("Solicitud cancelada", "success", { link: { href: explorerTxUrl(tx.hash), label: "Ver en Etherscan" } });
      await load();
    } catch (e) {
      toast.show(getErrorMessage(e) || "No se pudo cancelar", "error");
    } finally {
      loader.hide();
      setCancelling(null);
    }
  }

  const q = query.trim().toLowerCase();

  const filteredSolicitudes = useMemo(
    () =>
      solicitudes
        .filter((r) => statusFilter === "all" || r.status === statusFilter)
        .filter((r) => !q || r.description.toLowerCase().includes(q) || r.doctorName.toLowerCase().includes(q)),
    [solicitudes, statusFilter, q],
  );

  const filteredEmitidas = useMemo(
    () =>
      emitidas.filter((d) => !q || d.title.toLowerCase().includes(q) || (d.emitterName ?? "").toLowerCase().includes(q)),
    [emitidas, q],
  );

  const pendientes = solicitudes.filter((r) => r.status === 0).length;

  return (
    <PageShell
      back={() => navigate("/patient")}
      accent={accent}
      icon="clipboard"
      eyebrow="Recetas médicas"
      title="Mis recetas"
      subtitle={
        loading
          ? "Cargando…"
          : `${emitidas.length} emitida${emitidas.length !== 1 ? "s" : ""} · ${solicitudes.length} en curso${pendientes > 0 ? ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}` : ""}`
      }
      action={
        <button style={accentPill(accent)} onClick={() => navigate("/patient/recetas/solicitar")}>
          <Icon name="arrow" size={15} />
          Solicitar receta
        </button>
      }
    >
      {/* Tabs */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === "curso" ? s.tabActive : {}) }} onClick={() => setTab("curso")}>
          En curso
          <span style={{ ...s.tabBadge, ...(tab === "curso" ? { background: accent.main, color: landing.onBrand } : {}) }}>{solicitudes.length}</span>
        </button>
        <button style={{ ...s.tab, ...(tab === "emitidas" ? s.tabActive : {}) }} onClick={() => setTab("emitidas")}>
          Emitidas
          <span style={{ ...s.tabBadge, ...(tab === "emitidas" ? { background: accent.main, color: landing.onBrand } : {}) }}>{emitidas.length}</span>
        </button>
      </div>

      {/* Buscador + filtros */}
      {!loading && (solicitudes.length > 0 || emitidas.length > 0) && (
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={landing.textFaint} strokeWidth="2" style={s.searchIcon}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              style={s.search}
              placeholder={tab === "curso" ? "Buscar por médico o motivo…" : "Buscar por título o médico…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button style={s.clearBtn} onClick={() => setQuery("")} aria-label="Limpiar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          {tab === "curso" && (
            <div style={s.chips}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={String(f.value)}
                  style={{ ...s.chip, ...(statusFilter === f.value ? { background: accent.main, borderColor: accent.main, color: landing.onBrand } : {}) }}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <div style={s.center}><div style={{ ...lu.spinner, borderTopColor: accent.main }} /></div>}

      {/* En curso */}
      {!loading && tab === "curso" && (
        solicitudes.length === 0 ? (
          <EmptyState text="No tenés solicitudes en curso." actionText="Solicitar una receta" onAction={() => navigate("/patient/recetas/solicitar")} />
        ) : filteredSolicitudes.length === 0 ? (
          <p style={s.noResults}>No hay solicitudes que coincidan con el filtro.</p>
        ) : (
          <div style={s.list}>
            {filteredSolicitudes.map((r) => {
              const sc = REQ_STATUS[r.status] ?? REQ_STATUS[0];
              return (
                <div key={r.id} style={s.card}>
                  <div style={s.cardInfo}>
                    <span style={s.cardDesc}>"{r.description}"</span>
                    <span style={s.cardMeta}>Dr. {r.doctorName}{r.createdAt ? ` · ${fmtDate(r.createdAt)}` : ""}</span>
                  </div>
                  <div style={s.reqActions}>
                    <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    {(r.status === 0 || r.status === 1) && (
                      <button style={{ ...s.cancelBtn, opacity: cancelling === r.id ? 0.5 : 1 }} disabled={cancelling === r.id} onClick={() => handleCancel(r.id)}>
                        {cancelling === r.id ? "…" : "Cancelar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Emitidas */}
      {!loading && tab === "emitidas" && (
        emitidas.length === 0 ? (
          <EmptyState text="Todavía no tenés recetas emitidas." />
        ) : filteredEmitidas.length === 0 ? (
          <p style={s.noResults}>No hay recetas que coincidan con la búsqueda.</p>
        ) : (
          <div style={s.list}>
            {filteredEmitidas.map((d) => (
              <div key={d.documentIdOnChain} style={s.card}>
                <div style={s.cardInfo}>
                  <span style={s.cardTitle}>{d.title}</span>
                  <span style={s.cardMeta}>
                    {d.emitterName ? `Dr. ${d.emitterName}` : d.emitterAddress.slice(0, 8) + "…"} · {fmtDate(d.studyDate ?? d.createdAt)}
                  </span>
                </div>
                <button
                  style={{ ...s.viewBtn, background: accent.main }}
                  onClick={() => viewer.open({ url: api.fileUrl(d.documentIdOnChain), fileName: d.fileName, title: d.title, documentId: d.documentIdOnChain })}
                >
                  <Icon name="arrow" size={13} />
                  Ver receta
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </PageShell>
  );
}

function EmptyState({ text, actionText, onAction }: { text: string; actionText?: string; onAction?: () => void }) {
  return (
    <div style={s.empty}>
      <span style={{ ...iconBox(accent), width: 60, height: 60, borderRadius: 18 }}><Icon name="clipboard" size={30} /></span>
      <p style={s.emptyText}>{text}</p>
      {actionText && onAction && (
        <button style={accentPill(accent)} onClick={onAction}>
          <Icon name="arrow" size={15} />
          {actionText}
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  tabs: { display: "flex", gap: 4, background: "rgba(8,31,73,0.05)", borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: "none", border: "none", padding: "9px 12px", borderRadius: 11, fontSize: 14, fontWeight: 700, color: landing.textBody, cursor: "pointer", fontFamily: fontFamily.sans, transition: "background 0.15s, color 0.15s" },
  tabActive: { background: palette.white, color: landing.navy, boxShadow: "0 2px 8px rgba(8,31,73,0.08)" },
  tabBadge: { fontSize: 11, fontWeight: 700, background: "rgba(8,31,73,0.08)", color: landing.textBody, borderRadius: 999, padding: "1px 8px", minWidth: 18, textAlign: "center" as const },

  toolbar: { display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 16 },
  searchWrap: { position: "relative" as const, display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute" as const, left: 13, pointerEvents: "none" as const },
  search: { width: "100%", boxSizing: "border-box" as const, padding: "11px 36px", background: palette.white, border: "1px solid rgba(8,31,73,0.1)", borderRadius: 12, fontSize: 14, color: landing.navy, fontFamily: fontFamily.sans, outline: "none" },
  clearBtn: { position: "absolute" as const, right: 8, display: "inline-flex", background: "none", border: "none", color: landing.textFaint, cursor: "pointer", padding: 4 },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" as const },
  chip: { background: palette.white, border: "1px solid rgba(8,31,73,0.1)", color: landing.textBody, padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans },

  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  card: { ...lu.card, borderRadius: 16, padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardInfo: { display: "flex", flexDirection: "column" as const, gap: 3, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: landing.navy },
  cardDesc: { fontSize: 14, color: landing.navy, fontStyle: "italic" },
  cardMeta: { fontSize: 13, color: landing.textFaint },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: landing.onBrand, fontWeight: 700, flexShrink: 0, border: "none", cursor: "pointer", fontFamily: fontFamily.sans, padding: "8px 16px", borderRadius: 999 },
  reqActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  statusPill: { fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999, flexShrink: 0 },
  cancelBtn: { background: "none", color: colors.error.fg, border: `1.5px solid ${palette.red200}`, padding: "6px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans },

  noResults: { fontSize: 14, color: landing.textFaint, textAlign: "center" as const, padding: "32px 0", margin: 0 },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "52px 0", textAlign: "center" as const },
  emptyText: { fontSize: 15, color: landing.textBody, margin: 0 },
};
