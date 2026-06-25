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
import { useConfirm } from "../../components/common/Confirm";
import Icon from "../../components/common/Icon";
import { palette, colors, fontFamily, gradients } from "../../styles";

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
  const confirm = useConfirm();

  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [myDocs, setMyDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showGrant, setShowGrant] = useState(false);
  const [medicos, setMedicos] = useState<AppUser[]>([]);
  const [newDoctorAddr, setNewDoctorAddr] = useState("");
  const [newSelectedIds, setNewSelectedIds] = useState<number[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");


  const [addingToDoctor, setAddingToDoctor] = useState<string | null>(null);
  const [addDocIds, setAddDocIds] = useState<number[]>([]);
  const [addingDocs, setAddingDocs] = useState(false);
  const [addDocError, setAddDocError] = useState("");

  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState("");

  const [grantingAllTo, setGrantingAllTo] = useState<string | null>(null);

  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [doctorSpecialties, setDoctorSpecialties] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<string | null>(null);

  function toggleExpanded(addr: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(addr) ? next.delete(addr) : next.add(addr);
      return next;
    });
  }

  useEffect(() => { if (address) load(); }, [address]);


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

      const names = new Map<string, string>();
      const specialties = new Map<string, string>();
      await Promise.all(
        perms.map(async (d: DoctorEntry) => {
          try {
            const p = await api.getProfileByWallet(d.doctorAddress);
            if (p?.name) names.set(d.doctorAddress, `${p.name} ${p.lastName ?? ""}`.trim());
            if (p?.specialty) specialties.set(d.doctorAddress, p.specialty);
          } catch { /* sin perfil */ }
        }),
      );
      setDoctorNames(names);
      setDoctorSpecialties(specialties);
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

  // Agrega el médico a "mis médicos" sin compartir ningún documento (solo DB, sin gas)
  async function handleAddDoctorOnly() {
    if (!address || !newDoctorAddr.startsWith("0x")) return;
    setGranting(true);
    setGrantError("");
    try {
      await api.addMyDoctor(address, newDoctorAddr);
      setShowGrant(false);
      setNewDoctorAddr("");
      setNewSelectedIds([]);
      await load();
      toast.show("Médico agregado");
    } catch (e: unknown) {
      setGrantError(getErrorMessage(e));
      toast.show("No se pudo agregar el médico", "error");
    } finally {
      setGranting(false);
    }
  }


  async function handleGrantAll() {
    if (!address || !newDoctorAddr.startsWith("0x")) return;
    setGranting(true);
    setGrantError("");
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPermissionManager();
      try {
        const tx = await pm.grantGlobalAccess(newDoctorAddr);
        loader.show("Procesando transacción…");
        await tx.wait();
      } catch (contractErr: unknown) {
        const msg = getErrorMessage(contractErr);
        if (!msg.includes("acceso ya otorgado")) throw contractErr;
      }
      for (const doc of myDocs) {
        await api.grantPermission({ patientAddress: address, doctorAddress: newDoctorAddr, documentIdOnChain: doc.documentIdOnChain });
      }
      setShowGrant(false);
      setNewDoctorAddr("");
      setNewSelectedIds([]);
      await load();
      toast.show("Acceso total otorgado");
    } catch (e: unknown) {
      setGrantError(getErrorMessage(e));
      toast.show("No se pudo otorgar el acceso", "error");
    } finally {
      loader.hide();
      setGranting(false);
    }
  }

  async function handleGrantAllToDoctor(doctorAddress: string) {
    if (!address) return;
    const ok = await confirm({
      title: "Dar acceso a todos tus documentos",
      message: "Este médico va a poder ver todos tus estudios actuales ¿Confirmás?",
      confirmText: "Sí, dar acceso",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setGrantingAllTo(doctorAddress);
    loader.show("Confirmá en MetaMask…");
    try {
      const pm = await getPermissionManager();
      try {
        const tx = await pm.grantGlobalAccess(doctorAddress);
        loader.show("Procesando transacción…");
        await tx.wait();
      } catch (contractErr: unknown) {
        const msg = getErrorMessage(contractErr);
        if (!msg.includes("acceso ya otorgado")) throw contractErr;
      }
      for (const doc of myDocs) {
        await api.grantPermission({ patientAddress: address, doctorAddress, documentIdOnChain: doc.documentIdOnChain });
      }
      setAddingToDoctor(null);
      await load();
      toast.show("Acceso total otorgado");
    } catch (e: unknown) {
      toast.show("No se pudo otorgar el acceso", "error");
    } finally {
      loader.hide();
      setGrantingAllTo(null);
    }
  }

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
    setRevokeError("");
    try {
      const pm = await getPermissionManager();
      const me = ethers.getAddress(address);
      const doctor = ethers.getAddress(doctorAddress);

      // Si el acceso es GLOBAL (otorgado con "Dar acceso a todo"), no existe un
      // permiso por-documento que revocar: hay que revocar el acceso global.
      const isGlobal = await pm.hasGlobalAccess(me, doctor);

      if (isGlobal) {
        const ok = await confirm({
          title: "Revocar acceso total",
          message: "Este médico tiene acceso a todos tus documentos. Al revocar le quitás el acceso a todos. ¿Confirmás?",
          confirmText: "Sí, revocar todo",
          cancelText: "Cancelar",
        });
        if (!ok) return;
        setRevoking(key);
        loader.show("Confirmá en MetaMask…");
        const tx = await pm.revokeGlobalAccess(doctor);
        loader.show("Procesando transacción…");
        await tx.wait();
        // Limpiamos en la DB todos los accesos de ese médico
        const entry = doctors.find((d) => d.doctorAddress === doctorAddress);
        for (const doc of entry?.documents ?? []) {
          await api.revokePermission({ patientAddress: address, doctorAddress, documentIdOnChain: doc.documentIdOnChain });
        }
        toast.show("Acceso total revocado");
      } else {
        setRevoking(key);
        loader.show("Confirmá en MetaMask…");
        const tx = await pm.revokeDocumentAccess(docId, doctor);
        loader.show("Procesando transacción…");
        await tx.wait();
        await api.revokePermission({ patientAddress: address, doctorAddress, documentIdOnChain: docId });
        toast.show("Acceso revocado");
      }

      await load();
    } catch (e: unknown) {
      setRevokeError(getErrorMessage(e));
      toast.show("No se pudo revocar el acceso", "error");
    } finally {
      loader.hide();
      setRevoking(null);
    }
  }

  // Quita un médico de "mis médicos" (relación off-chain, sin gas).
  // Solo aplica a médicos sin documentos compartidos.
  async function handleRemoveDoctor(doctorAddress: string) {
    if (!address) return;
    const ok = await confirm({
      title: "Quitar médico",
      message: "¿Sacar a este médico de tu lista? Podés volver a agregarlo cuando quieras.",
      confirmText: "Sí, quitar",
      cancelText: "Cancelar",
      danger: true,
    });
    if (!ok) return;
    setRemoving(doctorAddress);
    try {
      await api.removeMyDoctor(address, doctorAddress);
      toast.show("Médico quitado de tu lista");
      await load();
    } catch (e) {
      toast.show(getErrorMessage(e) || "No se pudo quitar", "error");
    } finally {
      setRemoving(null);
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
                accent={palette.amber500}
              />
            </div>

            <button
              style={{ ...s.addOnlyBtn, opacity: newDoctorAddr.startsWith("0x") && !granting ? 1 : 0.5 }}
              disabled={!newDoctorAddr.startsWith("0x") || granting}
              onClick={handleAddDoctorOnly}
            >
              + Agregar a mis médicos (sin compartir documentos)
            </button>
            {myDocs.length === 0 ? (
              <p style={s.emptySmall}>No tenés estudios para compartir aún.</p>
            ) : (
              <>
                <span style={s.pickerHint}>Elegí documentos puntuales:</span>
                <DocPicker
                  docs={myDocs}
                  selectedIds={newSelectedIds}
                  onToggle={(id) => setNewSelectedIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id])}
                />
                <div style={s.orRow}>
                  <span style={s.orLine} /><span style={s.orText}>o</span><span style={s.orLine} />
                </div>
                <button
                  style={{ ...s.grantAllBtn, opacity: newDoctorAddr.startsWith("0x") && !granting ? 1 : 0.5 }}
                  disabled={!newDoctorAddr.startsWith("0x") || granting}
                  onClick={handleGrantAll}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Dar acceso a TODOS mis documentos
                </button>
              </>
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={palette.slate200} strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p style={s.emptyText}>Ningún médico tiene acceso a tus estudios todavía.</p>
          </div>
        )}

        {!loading && doctors.map((doctor) => {
          const sharedIds = unavailableIds(doctor);
          const unsharedDocs = myDocs.filter((d) => !sharedIds.has(d.documentIdOnChain));
          const isAddingHere = addingToDoctor === doctor.doctorAddress;
          const isOpen = expanded.has(doctor.doctorAddress);
          const name = doctorNames.get(doctor.doctorAddress);
          const specialty = doctorSpecialties.get(doctor.doctorAddress);

          return (
            <div key={doctor.doctorAddress} style={s.doctorCard}>
              <div style={s.doctorHeader} onClick={() => toggleExpanded(doctor.doctorAddress)}>
                <div style={s.doctorIcon}>
                  <Icon name="doctor" size={17} color={palette.sky500} />
                </div>
                <div style={{ minWidth: 0 }}>
                  {name && <p style={s.doctorName}>{name}</p>}
                  {specialty && <p style={s.doctorSpecialty}>{specialty}</p>}
                  <p style={name ? s.doctorAddrSmall : s.doctorAddr}>{fmtAddr(doctor.doctorAddress)}</p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={s.docCount}>{doctor.documents.length} doc{doctor.documents.length !== 1 ? "s" : ""}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.slate300} strokeWidth="2"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {isOpen && (
              <>
              <div style={s.addDocBar}>
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
                <button
                  style={{ ...s.grantAllInlineBtn, opacity: grantingAllTo === doctor.doctorAddress ? 0.5 : 1 }}
                  disabled={grantingAllTo === doctor.doctorAddress}
                  onClick={() => handleGrantAllToDoctor(doctor.doctorAddress)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {grantingAllTo === doctor.doctorAddress ? "Otorgando…" : "Dar acceso a todos mis docs"}
                </button>
                {doctor.documents.length === 0 && (
                  <button
                    style={{ ...s.removeDocBtn, opacity: removing === doctor.doctorAddress ? 0.5 : 1 }}
                    disabled={removing === doctor.doctorAddress}
                    onClick={() => handleRemoveDoctor(doctor.doctorAddress)}
                  >
                    {removing === doctor.doctorAddress ? "Quitando…" : "Quitar de mis médicos"}
                  </button>
                )}
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
              </>
              )}
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
  docRow: { display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: palette.white },
  docRowActive: { borderColor: palette.amber500, background: palette.amber50 },
  checkbox: { width: 16, height: 16, accentColor: palette.amber500, flexShrink: 0, cursor: "pointer" },
  docInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  docTitle: { fontSize: 13, fontWeight: 500, color: palette.slate800 },
  docMeta: { fontSize: 11, color: palette.slate400 },
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 620, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: palette.slate500, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageIconWrap: { width: 44, height: 44, borderRadius: 12, background: palette.amber50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  addBtn: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: palette.amber500, color: palette.white, border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans, flexShrink: 0 },
  grantPanel: { background: palette.white, borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: `1px solid ${palette.amber200}`, display: "flex", flexDirection: "column" as const, gap: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  grantTitle: { fontSize: 15, fontWeight: 700, color: palette.slate900, margin: 0 },
  field: { display: "flex", flexDirection: "column" as const, gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: palette.slate600 },
  req: { color: palette.red600 },
  input: { border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: fontFamily.mono, outline: "none", width: "100%", boxSizing: "border-box" as const },
  grantActions: { display: "flex", gap: 8 },
  confirmBtn: { background: palette.amber500, color: palette.white, border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans },
  cancelBtn: { background: "none", color: palette.slate500, border: `1.5px solid ${palette.slate200}`, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans },
  grantNote: { fontSize: 11, color: palette.slate400, margin: 0 },
  errorMsg: { fontSize: 12, color: palette.red600, margin: 0 },
  emptySmall: { fontSize: 13, color: palette.slate400, margin: 0 },
  pickerHint: { fontSize: 12, fontWeight: 600, color: palette.slate500 },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "2px 0" },
  orLine: { flex: 1, height: 1, background: palette.slate200 },
  orText: { fontSize: 11, color: palette.slate400, fontWeight: 600 },
  grantAllBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: palette.amber50, color: palette.amber600, border: `1.5px solid ${palette.amber200}`,
    padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: fontFamily.sans, width: "100%",
  },
  addOnlyBtn: {
    background: palette.slate50, color: palette.slate600, border: `1.5px solid ${palette.slate200}`,
    padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans, width: "100%",
  },
  errorBox: { background: palette.red50, border: `1px solid ${palette.red200}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: palette.red600, marginBottom: 16 },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: { width: 28, height: 28, border: `3px solid ${palette.slate200}`, borderTopColor: palette.amber500, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, padding: "60px 0", textAlign: "center" as const },
  emptyText: { fontSize: 14, color: palette.slate400, margin: 0 },
  doctorCard: { background: palette.white, border: `1px solid ${palette.slate100}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" },
  doctorHeader: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer", userSelect: "none" as const },
  doctorName: { fontSize: 14, fontWeight: 600, color: palette.slate900, margin: 0 },
  doctorSpecialty: { fontSize: 12, fontWeight: 600, color: palette.sky500, margin: "1px 0 0" },
  doctorAddrSmall: { fontFamily: fontFamily.mono, fontSize: 11, color: palette.slate400, margin: "2px 0 0" },
  removeDocBtn: {
    background: palette.white, color: palette.slate500, border: `1.5px solid ${palette.slate200}`,
    padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans, display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
  },
  addDocBar: { padding: "14px 16px 6px", display: "flex", gap: 12, flexWrap: "wrap" as const },
  grantAllInlineBtn: {
    background: colors.labSoft, color: colors.lab, border: `1px solid ${palette.emerald200}`,
    padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
    display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
  },
  doctorIcon: { width: 36, height: 36, borderRadius: 10, background: palette.sky50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  doctorAddr: { fontSize: 14, fontWeight: 600, color: palette.slate900, margin: 0 },
  doctorFull: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.slate400, margin: "2px 0 0" },
  docCount: { background: palette.sky50, color: palette.sky500, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0 },
  addDocBtn: { background: palette.indigoSoft, color: palette.indigo500, border: `1px solid ${palette.indigo200}`, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  addDocPanel: { background: palette.neutral50, borderBottom: `1px solid ${palette.slate100}`, padding: "14px 16px", display: "flex", flexDirection: "column" as const, gap: 12 },
  addDocLabel: { fontSize: 12, fontWeight: 600, color: palette.slate600, margin: 0 },
  docAccesList: { display: "flex", flexDirection: "column" as const },
  accessRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${palette.slate50}`, gap: 12 },
  accessInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  accessTitle: { fontSize: 13, fontWeight: 500, color: palette.slate800 },
  accessMeta: { fontSize: 11, color: palette.slate400 },
  revokeBtn: { background: "none", color: palette.red600, border: `1.5px solid ${palette.red200}`, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontFamily.sans, flexShrink: 0 },
};
