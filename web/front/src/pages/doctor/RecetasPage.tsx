import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import { getPrescriptionManager, DOCUMENT_REGISTRY_ABI } from "../../lib/contracts";
import { getErrorMessage } from "../../lib/error";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";
import RecetaCard, { Receta, RecetaStatus } from "../../components/doctor/RecetaCard";
import { palette, fontFamily, gradients } from "../../styles";

// PrescriptionStatus del contrato → estado del front
const STATUS: Record<number, RecetaStatus> = { 0: "pending", 1: "accepted", 2: "rejected", 3: "issued", 4: "rejected" };

function fmtDate(ts: bigint | number): string {
  const d = new Date(Number(ts) * 1000);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function RecetasPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const toast = useToast();
  const loader = useLoader();

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "issued" | "rejected">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const issuingIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const pm = await getPrescriptionManager();
      const ids: bigint[] = await pm.getDoctorPrescriptions(address);
      // Texto privado + nombres del paciente (off-chain)
      const metas = await api.getPrescriptions({ doctor: address });
      const metaById = new Map(metas.map((m) => [m.prescriptionIdOnChain, m]));

      const list = await Promise.all(
        ids.map(async (idBn) => {
          const id = Number(idBn);
          const p = await pm.getPrescription(idBn);
          const meta = metaById.get(id);
          return {
            id,
            patientAddress: p.patient as string,
            patientName: meta?.patientName ?? undefined,
            description: meta?.description ?? p.prescriptionType,
            requestedAt: fmtDate(p.requestedAt),
            status: STATUS[Number(p.status)] ?? "pending",
          } as Receta;
        }),
      );
      // más nuevas primero
      setRecetas(list.sort((a, b) => b.id - a.id));
    } catch (e) {
      toast.show(getErrorMessage(e) || "No se pudieron cargar las recetas", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (address) load(); }, [address]);

  async function handleAccept(id: number) {
    setBusyId(id);
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPrescriptionManager();
      const tx = await pm.acceptPrescription(id);
      loader.show("Procesando transacción…");
      await tx.wait();
      toast.show("Receta aceptada");
      await load();
    } catch (e) {
      toast.show(getErrorMessage(e) || "No se pudo aceptar", "error");
    } finally {
      loader.hide();
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPrescriptionManager();
      const tx = await pm.rejectPrescription(id);
      loader.show("Procesando transacción…");
      await tx.wait();
      toast.show("Receta rechazada");
      await load();
    } catch (e) {
      toast.show(getErrorMessage(e) || "No se pudo rechazar", "error");
    } finally {
      loader.hide();
      setBusyId(null);
    }
  }

  // Emitir: el médico adjunta el PDF de la receta → se registra como documento del paciente
  function handleIssue(id: number) {
    issuingIdRef.current = id;
    fileInputRef.current?.click();
  }

  async function onIssueFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = issuingIdRef.current;
    if (!file || id == null || !address) return;

    const receta = recetas.find((r) => r.id === id);
    setBusyId(id);
    loader.show("Procesando archivo…");
    try {
      const upload = await api.uploadFile(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const documentHash = ethers.keccak256(bytes);
      const offChainRef = crypto.randomUUID();

      loader.show("Confirmá en MetaMask…");
      const pm = await getPrescriptionManager();
      const tx = await pm.issuePrescription(id, documentHash, offChainRef);
      loader.show("Registrando en la blockchain…");
      const receipt = await tx.wait();

      // El documento lo registra MedicalDocumentRegistry (evento DocumentRegistered)
      const iface = new ethers.Interface(DOCUMENT_REGISTRY_ABI);
      let documentIdOnChain = -1;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "DocumentRegistered") { documentIdOnChain = Number(parsed.args.documentId); break; }
        } catch { /* otro contrato */ }
      }
      if (documentIdOnChain < 0) throw new Error("No se pudo obtener el id del documento");

      // Guardamos el PDF en la DB (emisor = el médico, para que el paciente lo vea como receta médica)
      await api.createDocument({
        documentIdOnChain,
        patientAddress: receta?.patientAddress ?? address,
        emitterAddress: ethers.getAddress(address),
        title: "Receta médica",
        documentType: "receta",
        fileBase64: upload.fileBase64,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      });

      toast.show("Receta emitida");
      await load();
    } catch (err) {
      toast.show(getErrorMessage(err) || "No se pudo emitir la receta", "error");
    } finally {
      loader.hide();
      setBusyId(null);
      issuingIdRef.current = null;
    }
  }

  const filtered = filter === "all" ? recetas : recetas.filter((r) => r.status === filter);
  const pendingCount = recetas.filter((r) => r.status === "pending").length;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/doctor")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Solicitudes de recetas</h1>
            <p style={s.pageSubtitle}>
              {loading ? "Cargando…" : pendingCount > 0 ? `${pendingCount} solicitudes pendientes de respuesta` : "Todas las solicitudes atendidas"}
            </p>
          </div>
        </div>

        <div style={s.filters}>
          {(["all", "pending", "issued", "rejected"] as const).map((f) => (
            <button key={f} style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }} onClick={() => setFilter(f)}>
              {{ all: "Todas", pending: "Pendientes", issued: "Emitidas", rejected: "Rechazadas" }[f]}
              <span style={{ ...s.filterCount, ...(filter === f ? s.filterCountActive : {}) }}>
                {f === "all" ? recetas.length : recetas.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.empty}><span>Cargando recetas…</span></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={palette.slate200} strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            <span>No hay solicitudes en esta categoría</span>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((r) => (
              <RecetaCard key={r.id} receta={r} busy={busyId === r.id} onAccept={handleAccept} onReject={handleReject} onIssue={handleIssue} />
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={onIssueFile} />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: palette.slate500, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  filters: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
  filterBtn: { display: "flex", alignItems: "center", gap: 6, background: palette.white, border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: palette.slate600, fontFamily: fontFamily.sans },
  filterBtnActive: { borderColor: palette.sky500, color: palette.sky500, background: palette.sky50 },
  filterCount: { background: palette.slate100, color: palette.slate400, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20 },
  filterCountActive: { background: palette.sky100, color: palette.sky500 },
  list: { display: "flex", flexDirection: "column" as const, gap: 10 },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10, padding: "48px 0", color: palette.slate400, fontSize: 13 },
};
