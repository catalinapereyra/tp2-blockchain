import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api, type SignedDoc } from "../../lib/api";
import { getDocumentRegistry } from "../../lib/contracts";
import { categoryLabel } from "../../lib/categories";
import { getErrorMessage } from "../../lib/error";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PendientesFirmaPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const toast = useToast();
  const loader = useLoader();

  const [docs, setDocs] = useState<SignedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState<number | null>(null);

  function load() {
    if (!address) return;
    setLoading(true);
    api.getSignedDocuments(address)
      .then(setDocs)
      .catch((e: any) => setError(e.message || "Error cargando documentos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (address) load(); }, [address]);

  async function handleRegister(doc: SignedDoc) {
    if (!address) return;
    setRegistering(doc.id);
    loader.show("Confirmá en MetaMask…");
    try {
      const registry = await getDocumentRegistry();

      if (await registry.isHashRegistered(doc.documentHash)) {
        throw new Error("Este documento ya fue registrado en la blockchain.");
      }

      //paciente paga el gas, el contrato verifica la firma del medico
      const tx = await registry.registerSignedDocument(
        ethers.getAddress(address),
        doc.documentHash,
        doc.documentType,
        doc.offChainRef,
        ethers.getAddress(doc.doctorAddress),
        doc.signature,
      );
      loader.show("Registrando en la blockchain…");
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log: any) => { try { return registry.interface.parseLog(log); } catch { return null; } })
        .find((parsed: any) => parsed?.name === "DocumentRegistered");
      if (!event) throw new Error("No se pudo obtener el id del documento registrado");
      const documentIdOnChain = Number(event.args.documentId ?? event.args[0]);

      await api.registerSignedDocument(doc.id, documentIdOnChain);

      toast.show("Documento registrado en tu historial");
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e: unknown) {
      toast.show(getErrorMessage(e) || "No se pudo registrar", "error");
    } finally {
      loader.hide();
      setRegistering(null);
    }
  }

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
          <div style={s.iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/>
            </svg>
          </div>
          <div>
            <h1 style={s.title}>Documentos firmados</h1>
            <p style={s.subtitle}>{loading ? "Cargando…" : `${docs.length} pendiente${docs.length !== 1 ? "s" : ""} de registrar`}</p>
          </div>
        </div>

        {loading && <div style={s.center}><div style={s.spinner} /></div>}
        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && docs.length === 0 && (
          <div style={s.empty}><span style={s.emptyText}>No tenés documentos firmados pendientes.</span></div>
        )}

        <div style={s.list}>
          {docs.map((doc) => (
            <div key={doc.id} style={s.card}>
              <div style={s.cardHead}>
                <div style={s.titleWrap}>
                  <span style={s.docTitle}>{doc.title}</span>
                  <span style={s.catPill}>{categoryLabel(doc.documentType)}</span>
                </div>
                <span style={s.date}>{fmtDate(doc.createdAt)}</span>
              </div>

              <p style={s.signedBy}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={palette.emerald600} strokeWidth="2" style={{ marginRight: 5, verticalAlign: "-2px" }}><path d="M20 6 9 17l-5-5"/></svg>
                Firmado por <strong>{doc.doctorName || `${doc.doctorAddress.slice(0, 8)}…`}</strong>
              </p>

              {doc.studyType && <p style={s.meta}>Tipo: {doc.studyType}</p>}
              {doc.notes && <p style={s.notes}>📝 {doc.notes}</p>}

              <div style={s.actions}>
                <a href={api.signedDocFileUrl(doc.id)} target="_blank" rel="noreferrer" style={s.viewBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Ver documento
                </a>
                <button
                  style={{ ...s.registerBtn, opacity: registering === doc.id ? 0.5 : 1 }}
                  disabled={registering === doc.id}
                  onClick={() => handleRegister(doc)}
                >
                  {registering === doc.id ? "Registrando…" : "Registrar en mi historial"}
                </button>
              </div>
            </div>
          ))}
        </div>
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
  iconWrap: { width: 44, height: 44, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: { width: 28, height: 28, border: `3px solid ${colors.border}`, borderTopColor: colors.lab, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { background: colors.error.bg, border: `1px solid ${colors.error.border}`, borderRadius: radius.md, padding: "12px 16px", fontSize: fontSize.base, color: colors.error.fg },
  empty: { display: "flex", justifyContent: "center", padding: "48px 0" },
  emptyText: { fontSize: fontSize.md, color: colors.textFaint },
  list: { display: "flex", flexDirection: "column" as const, gap: 12 },
  card: { background: colors.surface, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.xl, padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 8, boxShadow: shadow.sm },
  cardHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  docTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  catPill: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, background: colors.labSoft, color: colors.lab, padding: "2px 10px", borderRadius: radius.full },
  date: { fontSize: fontSize.sm, color: colors.textFaint, whiteSpace: "nowrap" as const },
  signedBy: { fontSize: fontSize.base, color: colors.textSecondary, margin: 0 },
  meta: { fontSize: fontSize.sm, color: colors.textFaint, margin: 0 },
  notes: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 1.5, margin: 0, background: colors.bgApp, borderRadius: radius.md, padding: "8px 12px" },
  actions: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4, flexWrap: "wrap" as const },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold, textDecoration: "none" },
  registerBtn: { background: palette.emerald500, color: palette.white, border: "none", padding: "10px 18px", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.bold, cursor: "pointer", fontFamily: fontFamily.sans },
};
