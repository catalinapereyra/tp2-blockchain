import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api, AppUser } from "../../lib/api";
import { getPermissionManager, getUserRegistryReadOnly } from "../../lib/contracts";
import { getErrorMessage } from "../../lib/error";
import UserSelect from "../../components/common/UserSelect";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";

interface DocMeta {
  id: number;
  documentIdOnChain: number;
  title: string;
  documentType: string;
  studyType?: string;
  studyDate?: string;
}

interface DoctorEntry {
  doctorAddress: string;
  documents: DocMeta[];
}

function fmtAddr(a: string) { return `${a.slice(0, 8)}…${a.slice(-6)}`; }
function fmtDate(d?: string) {
  if (!d) return null;
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function MisMedicosPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const toast = useToast();
  const loader = useLoader();

  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [myDocs, setMyDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Flujo "nuevo médico"
  const [showGrant, setShowGrant] = useState(false);
  const [medicos, setMedicos] = useState<AppUser[]>([]);
  const [newDoctorAddr, setNewDoctorAddr] = useState("");
  const [newSelectedIds, setNewSelectedIds] = useState<number[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");

  // Flujo "agregar doc a médico existente"
  const [addingToDoctor, setAddingToDoctor] = useState<string | null>(null);
  const [addDocIds, setAddDocIds] = useState<number[]>([]);
  const [addingDocs, setAddingDocs] = useState(false);
  const [addDocError, setAddDocError] = useState("");

  // Revocación
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState("");

  useEffect(() => { if (address) load(); }, [address]);

  // Carga los médicos registrados y aprobados on-chain para el desplegable
  useEffect(() => {
    (async () => {
      try {
        const doctors = await api.getUsers(1);
        const registry = getUserRegistryReadOnly();
        const verified = await Promise.all(
          doctors.map(async (d) => {
            try {
              return (await registry.isVerifiedEmitter(ethers.getAddress(d.walletAddress))) ? d : null;
            } catch {
              return null;
            }
          }),
        );
        setMedicos(verified.filter((d): d is AppUser => d !== null));
      } catch {
        setMedicos([]);
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [perms, docs] = await Promise.all([
        api.getPermissions(address!),
        api.getDocuments(address!),
      ]);
      setDoctors(perms);
      setMyDocs(docs);
    } catch (e: any) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  async function grantDocs(targetDoctor: string, docIds: number[], onError: (m: string) => void) {
    if (!address || docIds.length === 0) return;
    const pm = await getPermissionManager();
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i];
      loader.show(
        docIds.length > 1
          ? `Confirmá en MetaMask (${i + 1}/${docIds.length})…`
          : "Confirmá en MetaMask…",
      );
      try {
        const tx = await pm.grantDocumentAccess(docId, targetDoctor);
        loader.show("Procesando transacción…");
        await tx.wait();
      } catch (contractErr: unknown) {
        const msg = getErrorMessage(contractErr);
        if (!msg.includes("acceso ya otorgado")) throw contractErr;
      }
      await api.grantPermission({ patientAddress: address, doctorAddress: targetDoctor, documentIdOnChain: docId });
    }
  }

  // Nuevo médico
  async function handleGrantNew() {
    if (!newDoctorAddr.startsWith("0x") || newSelectedIds.length === 0) return;
    setGranting(true);
    setGrantError("");
    try {
      await grantDocs(newDoctorAddr, newSelectedIds, setGrantError);
      setShowGrant(false);
      setNewDoctorAddr("");
      setNewSelectedIds([]);
      await load();
      toast.show("Acceso otorgado");
    } catch (e: unknown) {
      setGrantError(getErrorMessage(e));
      toast.show("No se pudo otorgar el acceso", "error");
    } finally {
      loader.hide();
      setGranting(false);
    }
  }

  // Agregar más docs a médico existente
  async function handleAddDocs(doctorAddress: string) {
    if (addDocIds.length === 0) return;
    setAddingDocs(true);
    setAddDocError("");
    try {
      await grantDocs(doctorAddress, addDocIds, setAddDocError);
      setAddingToDoctor(null);
      setAddDocIds([]);
      await load();
      toast.show("Acceso otorgado");
    } catch (e: unknown) {
      setAddDocError(getErrorMessage(e));
      toast.show("No se pudo otorgar el acceso", "error");
    } finally {
      loader.hide();
      setAddingDocs(false);
    }
  }

  async function handleRevoke(doctorAddress: string, docId: number) {
    if (!address) return;
    const key = `${doctorAddress}-${docId}`;
    setRevoking(key);
    setRevokeError("");
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPermissionManager();
      try {
        const tx = await pm.revokeDocumentAccess(docId, doctorAddress);
        loader.show("Procesando transacción…");
        await tx.wait();
      } catch (contractErr: unknown) {
        const msg = getErrorMessage(contractErr);
        // Si ya fue revocado on-chain, igual limpiamos la DB
        if (!msg.includes("no tiene acceso")) throw contractErr;
      }
      await api.revokePermission({ patientAddress: address, doctorAddress, documentIdOnChain: docId });
      setDoctors((prev) =>
        prev
          .map((d) =>
            d.doctorAddress !== doctorAddress
              ? d
              : { ...d, documents: d.documents.filter((doc) => doc.documentIdOnChain !== docId) }
          )
          .filter((d) => d.documents.length > 0)
      );
      toast.show("Acceso revocado");
    } catch (e: unknown) {
      setRevokeError(getErrorMessage(e));
      toast.show("No se pudo revocar el acceso", "error");
    } finally {
      loader.hide();
      setRevoking(null);
    }
  }

  function unavailableIds(doctor: DoctorEntry) {
    return new Set(doctor.documents.map((d) => d.documentIdOnChain));
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

        <div style={s.pageHeader}>
          <div style={s.pageIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Mis médicos</h1>
            <p style={s.pageSubtitle}>{loading ? "Cargando…" : `${doctors.length} médico${doctors.length !== 1 ? "s" : ""} con acceso`}</p>
          </div>
          <button style={s.addBtn} onClick={() => { setShowGrant(!showGrant); setGrantError(""); setNewSelectedIds([]); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Dar acceso
          </button>
        </div>

        {/* Panel nuevo médico */}
        {showGrant && (
          <div style={s.grantPanel}>
            <h3 style={s.grantTitle}>Dar acceso a un médico nuevo</h3>
            <div style={s.field}>
              <label style={s.label}>Médico <span style={s.req}>*</span></label>
              <UserSelect
                users={medicos}
                value={newDoctorAddr}
                onChange={setNewDoctorAddr}
                placeholder="Seleccioná un médico…"
                emptyText="No hay médicos aprobados disponibles todavía."
                accent="#f59e0b"
              />
            </div>
            {myDocs.length === 0 ? (
              <p style={s.emptySmall}>No tenés estudios para compartir aún.</p>
            ) : (
              <DocPicker
                docs={myDocs}
                selectedIds={newSelectedIds}
                onToggle={(id) => setNewSelectedIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id])}
              />
            )}
            {grantError && <p style={s.errorMsg}>{grantError}</p>}
            <div style={s.grantActions}>
              <button
                style={{ ...s.confirmBtn, opacity: newDoctorAddr.startsWith("0x") && newSelectedIds.length > 0 && !granting ? 1 : 0.5 }}
                disabled={!newDoctorAddr.startsWith("0x") || newSelectedIds.length === 0 || granting}
                onClick={handleGrantNew}
              >
                {granting ? "Firmando en MetaMask…" : `Confirmar (${newSelectedIds.length} doc${newSelectedIds.length !== 1 ? "s" : ""})`}
              </button>
              <button style={s.cancelBtn} onClick={() => { setShowGrant(false); setNewDoctorAddr(""); setNewSelectedIds([]); setGrantError(""); }}>
                Cancelar
              </button>
            </div>
            {granting && <p style={s.grantNote}>Una firma de MetaMask por cada documento.</p>}
          </div>
        )}

        {error && <div style={s.errorBox}>{error}</div>}
        {revokeError && <div style={s.errorBox}>{revokeError}</div>}
        {loading && <div style={s.center}><div style={s.spinner} /></div>}

        {!loading && doctors.length === 0 && (
          <div style={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p style={s.emptyText}>Ningún médico tiene acceso a tus estudios todavía.</p>
          </div>
        )}

        {!loading && doctors.map((doctor) => {
          const sharedIds = unavailableIds(doctor);
          const unsharedDocs = myDocs.filter((d) => !sharedIds.has(d.documentIdOnChain));
          const isAddingHere = addingToDoctor === doctor.doctorAddress;

          return (
            <div key={doctor.doctorAddress} style={s.doctorCard}>
              <div style={s.doctorHeader}>
                <div style={s.doctorIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div>
                  <p style={s.doctorAddr}>{fmtAddr(doctor.doctorAddress)}</p>
                  <p style={s.doctorFull}>{doctor.doctorAddress}</p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={s.docCount}>{doctor.documents.length} doc{doctor.documents.length !== 1 ? "s" : ""}</span>
                  {unsharedDocs.length > 0 && (
                    <button
                      style={s.addDocBtn}
                      onClick={() => {
                        if (isAddingHere) { setAddingToDoctor(null); setAddDocIds([]); setAddDocError(""); }
                        else { setAddingToDoctor(doctor.doctorAddress); setAddDocIds([]); setAddDocError(""); }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {isAddingHere ? "Cerrar" : "Agregar doc"}
                    </button>
                  )}
                </div>
              </div>

              {/* Picker inline para agregar más docs */}
              {isAddingHere && (
                <div style={s.addDocPanel}>
                  <p style={s.addDocLabel}>Estudios que todavía no ve:</p>
                  <DocPicker
                    docs={unsharedDocs}
                    selectedIds={addDocIds}
                    onToggle={(id) => setAddDocIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id])}
                  />
                  {addDocError && <p style={s.errorMsg}>{addDocError}</p>}
                  <div style={s.grantActions}>
                    <button
                      style={{ ...s.confirmBtn, opacity: addDocIds.length > 0 && !addingDocs ? 1 : 0.5 }}
                      disabled={addDocIds.length === 0 || addingDocs}
                      onClick={() => handleAddDocs(doctor.doctorAddress)}
                    >
                      {addingDocs ? "Firmando en MetaMask…" : `Compartir (${addDocIds.length} doc${addDocIds.length !== 1 ? "s" : ""})`}
                    </button>
                    <button style={s.cancelBtn} onClick={() => { setAddingToDoctor(null); setAddDocIds([]); setAddDocError(""); }}>
                      Cancelar
                    </button>
                  </div>
                  {addingDocs && <p style={s.grantNote}>Una firma de MetaMask por cada documento.</p>}
                </div>
              )}

              {/* Lista de docs que ya puede ver */}
              <div style={s.docAccesList}>
                {doctor.documents.map((doc) => {
                  const key = `${doctor.doctorAddress}-${doc.documentIdOnChain}`;
                  const isRevoking = revoking === key;
                  return (
                    <div key={doc.documentIdOnChain} style={s.accessRow}>
                      <div style={s.accessInfo}>
                        <span style={s.accessTitle}>{doc.title}</span>
                        <span style={s.accessMeta}>
                          {doc.studyType || doc.documentType}
                          {doc.studyDate ? ` · ${fmtDate(doc.studyDate)}` : ""}
                        </span>
                      </div>
                      <button
                        style={{ ...s.revokeBtn, opacity: isRevoking ? 0.5 : 1 }}
                        disabled={isRevoking}
                        onClick={() => handleRevoke(doctor.doctorAddress, doc.documentIdOnChain)}
                      >
                        {isRevoking ? "…" : "Revocar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocPicker({ docs, selectedIds, onToggle }: { docs: DocMeta[]; selectedIds: number[]; onToggle: (id: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
      {docs.map((doc) => {
        const checked = selectedIds.includes(doc.documentIdOnChain);
        return (
          <label key={doc.documentIdOnChain} style={{ ...sp.docRow, ...(checked ? sp.docRowActive : {}) }}>
            <input type="checkbox" checked={checked} onChange={() => onToggle(doc.documentIdOnChain)} style={sp.checkbox} />
            <div style={sp.docInfo}>
              <span style={sp.docTitle}>{doc.title}</span>
              <span style={sp.docMeta}>
                {doc.studyType || doc.documentType}
                {doc.studyDate ? ` · ${new Date(doc.studyDate).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

const sp: Record<string, React.CSSProperties> = {
  docRow: { display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: "white" },
  docRowActive: { borderColor: "#f59e0b", background: "#fffbeb" },
  checkbox: { width: 16, height: 16, accentColor: "#f59e0b", flexShrink: 0, cursor: "pointer" },
  docInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  docTitle: { fontSize: 13, fontWeight: 500, color: "#1e293b" },
  docMeta: { fontSize: 11, color: "#94a3b8" },
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)", fontFamily: "'DM Sans', sans-serif", paddingBottom: 60 },
  container: { maxWidth: 620, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif" },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageIconWrap: { width: 44, height: 44, borderRadius: 12, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "2px 0 0" },
  addBtn: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "white", border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  grantPanel: { background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: "1px solid #fde68a", display: "flex", flexDirection: "column" as const, gap: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  grantTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 },
  field: { display: "flex", flexDirection: "column" as const, gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569" },
  req: { color: "#dc2626" },
  input: { border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box" as const },
  grantActions: { display: "flex", gap: 8 },
  confirmBtn: { background: "#f59e0b", color: "white", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  cancelBtn: { background: "none", color: "#64748b", border: "1.5px solid #e2e8f0", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  grantNote: { fontSize: 11, color: "#94a3b8", margin: 0 },
  errorMsg: { fontSize: 12, color: "#dc2626", margin: 0 },
  emptySmall: { fontSize: 13, color: "#94a3b8", margin: 0 },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#dc2626", marginBottom: 16 },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: { width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, padding: "60px 0", textAlign: "center" as const },
  emptyText: { fontSize: 14, color: "#94a3b8", margin: 0 },
  doctorCard: { background: "white", border: "1px solid #f1f5f9", borderRadius: 14, marginBottom: 12, overflow: "hidden" },
  doctorHeader: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f8fafc" },
  doctorIcon: { width: 36, height: 36, borderRadius: 10, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  doctorAddr: { fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 },
  doctorFull: { fontFamily: "monospace", fontSize: 10, color: "#94a3b8", margin: "2px 0 0" },
  docCount: { background: "#f0f9ff", color: "#0ea5e9", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0 },
  addDocBtn: { background: "#f5f3ff", color: "#6366f1", border: "1px solid #ddd6fe", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  addDocPanel: { background: "#fafafa", borderBottom: "1px solid #f1f5f9", padding: "14px 16px", display: "flex", flexDirection: "column" as const, gap: 12 },
  addDocLabel: { fontSize: 12, fontWeight: 600, color: "#475569", margin: 0 },
  docAccesList: { display: "flex", flexDirection: "column" as const },
  accessRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f8fafc", gap: 12 },
  accessInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  accessTitle: { fontSize: 13, fontWeight: 500, color: "#1e293b" },
  accessMeta: { fontSize: 11, color: "#94a3b8" },
  revokeBtn: { background: "none", color: "#dc2626", border: "1.5px solid #fecaca", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
};
