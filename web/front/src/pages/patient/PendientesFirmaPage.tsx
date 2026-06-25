import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api, type SignedDoc } from "../../lib/api";
import { getDocumentRegistry, explorerTxUrl } from "../../lib/contracts";
import { categoryLabel } from "../../lib/categories";
import { getErrorMessage } from "../../lib/error";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";
import { Icon } from "../../components/landing/Icon";
import PageShell, { lu, iconBox, accentPill } from "../../components/patient/PageShell";
import { landing, sectionAccent, palette, fontFamily } from "../../styles";

const accent = sectionAccent.firmados;

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

      toast.show("Documento registrado en tu historial", "success", { link: { href: explorerTxUrl(tx.hash), label: "Ver en Etherscan" } });
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e: unknown) {
      toast.show(getErrorMessage(e) || "No se pudo registrar", "error");
    } finally {
      loader.hide();
      setRegistering(null);
    }
  }

  return (
    <PageShell
      back={() => navigate("/patient")}
      accent={accent}
      icon="shield"
      eyebrow="Firmados por un médico"
      title="Documentos firmados"
      subtitle={loading ? "Cargando…" : `${docs.length} pendiente${docs.length !== 1 ? "s" : ""} de registrar`}
    >
      {loading && <div style={s.center}><div style={{ ...lu.spinner, borderTopColor: accent.main }} /></div>}
      {error && <div style={s.errorBox}>{error}</div>}

      {!loading && docs.length === 0 && (
        <div style={s.empty}>
          <span style={{ ...iconBox(accent), width: 60, height: 60, borderRadius: 18 }}><Icon name="shield" size={30} /></span>
          <p style={s.emptyText}>No tenés documentos firmados pendientes.</p>
        </div>
      )}

      <div style={s.list}>
        {docs.map((doc) => (
          <div key={doc.id} style={s.card}>
            <div style={s.cardHead}>
              <div style={s.titleWrap}>
                <span style={s.docTitle}>{doc.title}</span>
                <span style={{ ...s.catPill, background: accent.soft, color: accent.main }}>{categoryLabel(doc.documentType)}</span>
              </div>
              <span style={s.date}>{fmtDate(doc.createdAt)}</span>
            </div>

            <p style={s.signedBy}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent.main} strokeWidth="2.5" style={{ marginRight: 5, verticalAlign: "-2px" }}><path d="M20 6 9 17l-5-5"/></svg>
              Firmado por <strong style={{ color: landing.navy }}>{doc.doctorName || `${doc.doctorAddress.slice(0, 8)}…`}</strong>
            </p>

            {doc.studyType && <p style={s.meta}>Tipo: {doc.studyType}</p>}
            {doc.notes && <p style={s.notes}>📝 {doc.notes}</p>}

            <div style={s.actions}>
              <a href={api.signedDocFileUrl(doc.id)} target="_blank" rel="noreferrer" style={{ ...s.viewBtn, color: accent.main }}>
                <Icon name="arrow" size={13} />
                Ver documento
              </a>
              <button
                style={{ ...s.registerBtn, background: accent.main, opacity: registering === doc.id ? 0.6 : 1 }}
                disabled={registering === doc.id}
                onClick={() => handleRegister(doc)}
              >
                {registering === doc.id ? "Registrando…" : "Registrar en mi historial"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

const s: Record<string, React.CSSProperties> = {
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  errorBox: { background: palette.red50, border: `1px solid ${palette.red200}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: palette.red600 },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "56px 0", textAlign: "center" as const },
  emptyText: { fontSize: 15, color: landing.textBody, margin: 0 },
  list: { display: "flex", flexDirection: "column" as const, gap: 12 },
  card: { ...lu.card, borderRadius: 18, padding: "18px 20px", display: "flex", flexDirection: "column" as const, gap: 9 },
  cardHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  docTitle: { fontSize: 15, fontWeight: 700, color: landing.navy },
  catPill: { fontSize: 11, fontWeight: 700, padding: "2px 11px", borderRadius: 999 },
  date: { fontSize: 13, color: landing.textFaint, whiteSpace: "nowrap" as const },
  signedBy: { fontSize: 14, color: landing.textBody, margin: 0 },
  meta: { fontSize: 13, color: landing.textFaint, margin: 0 },
  notes: { fontSize: 14, color: landing.textBody, lineHeight: 1.5, margin: 0, background: "rgba(8,31,73,0.04)", borderRadius: 12, padding: "9px 13px" },
  actions: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4, flexWrap: "wrap" as const },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, textDecoration: "none" },
  registerBtn: { color: landing.onBrand, border: "none", padding: "11px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: fontFamily.sans },
};
