import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api, AppUser } from "../../lib/api";
import { getPermissionManager, getUserRegistryReadOnly, explorerTxUrl } from "../../lib/contracts";
import { getErrorMessage } from "../../lib/error";
import UserSelect from "../../components/common/UserSelect";
import { useToast } from "../../components/common/Toast";
import { useLoader } from "../../components/common/Loader";
import { useConfirm } from "../../components/common/Confirm";
import { Icon } from "../../components/landing/Icon";
import PageShell, { lu, iconBox, accentPill } from "../../components/patient/PageShell";
import { landing, sectionAccent, palette, fontFamily } from "../../styles";

const accent = sectionAccent.medicos;

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

  // Devuelve el hash de la última transacción on-chain realizada (para el link a Etherscan).
  async function grantDocs(targetDoctor: string, docIds: number[], onError: (m: string) => void): Promise<string | null> {
    if (!address || docIds.length === 0) return null;
    const pm = await getPermissionManager();
    let lastTxHash: string | null = null;
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i];
      loader.show(
        docIds.length > 1
          ? `Confirmá en MetaMask (${i + 1}/${docIds.length})…`
          : "Confirmá en MetaMask…",
      );
      try {
        const tx = await pm.grantDocumentAccess(docId, targetDoctor);
        lastTxHash = tx.hash;
        loader.show("Procesando transacción…");
        await tx.wait();
      } catch (contractErr: unknown) {
        const msg = getErrorMessage(contractErr);
        if (!msg.includes("acceso ya otorgado")) throw contractErr;
      }
      await api.grantPermission({ patientAddress: address, doctorAddress: targetDoctor, documentIdOnChain: docId });
    }
    return lastTxHash;
  }

  // Opciones de toast con link a Etherscan (solo si hubo una tx on-chain).
  function txLink(hash: string | null) {
    return hash ? { link: { href: explorerTxUrl(hash), label: "Ver en Etherscan" } } : undefined;
  }

  async function handleGrantNew() {
    if (!newDoctorAddr.startsWith("0x") || newSelectedIds.length === 0) return;
    setGranting(true);
    setGrantError("");
    try {
      const hash = await grantDocs(newDoctorAddr, newSelectedIds, setGrantError);
      setShowGrant(false);
      setNewDoctorAddr("");
      setNewSelectedIds([]);
      await load();
      toast.show("Acceso otorgado", "success", txLink(hash));
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
    let txHash: string | null = null;
    try {
      const pm = await getPermissionManager();
      try {
        const tx = await pm.grantGlobalAccess(newDoctorAddr);
        txHash = tx.hash;
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
      toast.show("Acceso total otorgado", "success", txLink(txHash));
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
    let txHash: string | null = null;
    try {
      const pm = await getPermissionManager();
      try {
        const tx = await pm.grantGlobalAccess(doctorAddress);
        txHash = tx.hash;
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
      toast.show("Acceso total otorgado", "success", txLink(txHash));
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
      const hash = await grantDocs(doctorAddress, addDocIds, setAddDocError);
      setAddingToDoctor(null);
      setAddDocIds([]);
      await load();
      toast.show("Acceso otorgado", "success", txLink(hash));
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
        toast.show("Acceso total revocado", "success", txLink(tx.hash));
      } else {
        setRevoking(key);
        loader.show("Confirmá en MetaMask…");
        const tx = await pm.revokeDocumentAccess(docId, doctor);
        loader.show("Procesando transacción…");
        await tx.wait();
        await api.revokePermission({ patientAddress: address, doctorAddress, documentIdOnChain: docId });
        toast.show("Acceso revocado", "success", txLink(tx.hash));
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
    <PageShell
      back={() => navigate("/patient")}
      accent={accent}
      icon="doctor"
      eyebrow="Acceso a tu historial"
      title="Mis médicos"
      subtitle={loading ? "Cargando…" : `${doctors.length} médico${doctors.length !== 1 ? "s" : ""} con acceso`}
      action={
        <button style={accentPill(accent)} onClick={() => { setShowGrant(!showGrant); setGrantError(""); setNewSelectedIds([]); }}>
          <Icon name="arrow" size={15} />
          Dar acceso
        </button>
      }
    >
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
              accent={accent.main}
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
      {loading && <div style={s.center}><div style={{ ...lu.spinner, borderTopColor: accent.main }} /></div>}

      {!loading && doctors.length === 0 && (
        <div style={s.empty}>
          <span style={{ ...iconBox(accent), width: 60, height: 60, borderRadius: 18 }}><Icon name="doctor" size={30} /></span>
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
              <span style={iconBox(accent)}><Icon name="doctor" size={20} /></span>
              <div style={{ minWidth: 0 }}>
                {name && <p style={s.doctorName}>{name}</p>}
                {specialty && <p style={s.doctorSpecialty}>{specialty}</p>}
                <p style={name ? s.doctorAddrSmall : s.doctorAddr}>{fmtAddr(doctor.doctorAddress)}</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={s.docCount}>{doctor.documents.length} doc{doctor.documents.length !== 1 ? "s" : ""}</span>
                <span style={{ display: "inline-flex", color: landing.textFaint, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                  <Icon name="arrow" size={15} />
                </span>
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
    </PageShell>
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

const FONT = fontFamily.sans;

const sp: Record<string, React.CSSProperties> = {
  docRow: { display: "flex", alignItems: "center", gap: 10, border: "1.5px solid rgba(8,31,73,0.12)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", background: palette.white },
  docRowActive: { borderColor: accent.main, background: accent.soft },
  checkbox: { width: 16, height: 16, accentColor: accent.main, flexShrink: 0, cursor: "pointer" },
  docInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  docTitle: { fontSize: 13, fontWeight: 600, color: landing.navy },
  docMeta: { fontSize: 11, color: landing.textFaint },
};

const s: Record<string, React.CSSProperties> = {
  grantPanel: { ...lu.card, borderRadius: 18, padding: "20px 24px", marginBottom: 20, display: "flex", flexDirection: "column" as const, gap: 16 },
  grantTitle: { fontSize: 16, fontWeight: 700, color: landing.navy, margin: 0 },
  field: { display: "flex", flexDirection: "column" as const, gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: landing.textBody },
  req: { color: palette.red600 },
  grantActions: { display: "flex", gap: 8 },
  confirmBtn: { background: accent.main, color: landing.onBrand, border: "none", padding: "11px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT },
  cancelBtn: { background: "none", color: landing.textBody, border: "1.5px solid rgba(8,31,73,0.12)", padding: "11px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT },
  grantNote: { fontSize: 11, color: landing.textFaint, margin: 0 },
  errorMsg: { fontSize: 12, color: palette.red600, margin: 0 },
  emptySmall: { fontSize: 13, color: landing.textFaint, margin: 0 },
  pickerHint: { fontSize: 12, fontWeight: 600, color: landing.textBody },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "2px 0" },
  orLine: { flex: 1, height: 1, background: "rgba(8,31,73,0.1)" },
  orText: { fontSize: 11, color: landing.textFaint, fontWeight: 600 },
  grantAllBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: accent.soft, color: accent.main, border: `1.5px solid ${accent.main}`,
    padding: "11px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: FONT, width: "100%",
  },
  addOnlyBtn: {
    background: "rgba(8,31,73,0.04)", color: landing.textBody, border: "1.5px solid rgba(8,31,73,0.1)",
    padding: "10px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: FONT, width: "100%",
  },
  errorBox: { background: palette.red50, border: `1px solid ${palette.red200}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: palette.red600, marginBottom: 16 },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  empty: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14, padding: "60px 0", textAlign: "center" as const },
  emptyText: { fontSize: 15, color: landing.textBody, margin: 0 },
  doctorCard: { ...lu.card, borderRadius: 18, marginBottom: 12, overflow: "hidden" },
  doctorHeader: { display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", userSelect: "none" as const },
  doctorName: { fontSize: 15, fontWeight: 700, color: landing.navy, margin: 0 },
  doctorSpecialty: { fontSize: 12, fontWeight: 600, color: accent.main, margin: "1px 0 0" },
  doctorAddrSmall: { fontFamily: "monospace", fontSize: 11, color: landing.textFaint, margin: "2px 0 0" },
  doctorAddr: { fontSize: 15, fontWeight: 700, color: landing.navy, margin: 0 },
  docCount: { background: accent.soft, color: accent.main, fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999, flexShrink: 0 },
  removeDocBtn: {
    background: palette.white, color: landing.textBody, border: "1.5px solid rgba(8,31,73,0.12)",
    padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
  },
  addDocBar: { padding: "14px 18px 6px", display: "flex", gap: 10, flexWrap: "wrap" as const, borderTop: `1px solid ${landing.hairline}` },
  grantAllInlineBtn: {
    background: sectionAccent.firmados.soft, color: sectionAccent.firmados.main, border: `1px solid ${sectionAccent.firmados.main}`,
    padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: FONT,
    display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
  },
  addDocBtn: { background: sectionAccent.estudios.soft, color: sectionAccent.estudios.main, border: `1px solid ${sectionAccent.estudios.main}`, padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  addDocPanel: { background: "rgba(8,31,73,0.03)", borderTop: `1px solid ${landing.hairline}`, padding: "14px 18px", display: "flex", flexDirection: "column" as const, gap: 12 },
  addDocLabel: { fontSize: 12, fontWeight: 600, color: landing.textBody, margin: 0 },
  docAccesList: { display: "flex", flexDirection: "column" as const },
  accessRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderTop: "1px solid rgba(8,31,73,0.05)", gap: 12 },
  accessInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  accessTitle: { fontSize: 13, fontWeight: 600, color: landing.navy },
  accessMeta: { fontSize: 11, color: landing.textFaint },
  revokeBtn: { background: "none", color: palette.red600, border: `1.5px solid ${palette.red200}`, padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, flexShrink: 0 },
};
