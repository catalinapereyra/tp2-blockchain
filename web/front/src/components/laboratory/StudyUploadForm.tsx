import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { api, AppUser } from "../../lib/api";
import { getDocumentRegistry, getUserRegistryReadOnly } from "../../lib/contracts";
import { useWallet } from "../../context/WalletContext";
import { LaboratoryCard } from "./LaboratoryCard";
import UserSelect from "../common/UserSelect";
import Select from "../common/Select";
import Spinner from "../common/Spinner";
import { useToast } from "../common/Toast";
import { STUDY_CATEGORIES } from "../../lib/categories";
import { palette, gradients } from "../../styles";

type StudyUploadFormProps = {
  onStudyCreated?: () => void;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudyUploadForm({ onStudyCreated }: StudyUploadFormProps) {
  const { address } = useWallet();
  const toast = useToast();
  const [studyFile, setStudyFile] = useState<File | null>(null);
  const [patientAddress, setPatientAddress] = useState("");
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [studyType, setStudyType] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [patientStatus, setPatientStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  //carga todos los pacientes registrados (nombre + apellido off-chain) para el desplegable
  useEffect(() => {
    api.getUsers(0).then(setPatients).catch(() => setPatients([]));
  }, []);

  async function verifyPatient() {
    setError(null);
    setPatientStatus(null);

    if (!ethers.isAddress(patientAddress)) {
      setError("La address del paciente no es valida");
      return false;
    }

    setIsVerifying(true);
    try {
      const registry = getUserRegistryReadOnly();
      const normalizedPatient = ethers.getAddress(patientAddress);
      const isRegistered = await registry.isRegistered(normalizedPatient);
      if (!isRegistered) {
        setPatientStatus("Paciente no registrado");
        return false;
      }

      const role = Number(await registry.getRole(normalizedPatient));
      if (role !== 0) {
        setPatientStatus("La address existe, pero no corresponde a un paciente");
        return false;
      }

      setPatientStatus("Paciente verificado");
      return true;
    } catch (err: any) {
      setError(err.message || "No se pudo verificar el paciente");
      return false;
    } finally {
      setIsVerifying(false);
    }
  }

  async function ensureBackendSession(labAddress: string) {
    const existingToken = localStorage.getItem("token");
    if (existingToken) {
      try {
        await api.getMe();
        return;
      } catch {
        localStorage.removeItem("token");
      }
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const signerAddress = (await signer.getAddress()).toLowerCase();
    if (signerAddress !== labAddress.toLowerCase()) {
      throw new Error("La wallet conectada no coincide con la sesion del laboratorio");
    }

    const { nonce } = await api.getNonce(labAddress);
    const signature = await signer.signMessage(`MediChain login: ${nonce}`);
    const { accessToken } = await api.verify(labAddress, signature);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("wallet", labAddress.toLowerCase());
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (!address) {
      setError("Conecta la wallet del laboratorio");
      return;
    }
    if (!ethers.isAddress(patientAddress)) {
      setError("Ingresa una address de paciente valida");
      return;
    }
    if (!documentType.trim() || !title.trim() || !studyType.trim()) {
      setError("Completa paciente, categoria, titulo y tipo especifico");
      return;
    }
    if (!studyFile) {
      setError("Selecciona el PDF o imagen del estudio");
      return;
    }
    if (!confirmed) {
      setError("Confirma que los datos son correctos");
      return;
    }

    setIsSubmitting(true);
    try {
      const patientOk = await verifyPatient();
      if (!patientOk) return;

      setMessage("Validando sesion del laboratorio...");
      await ensureBackendSession(address);

      //nombre del laboratorio sale de su perfil (se cargó al registrarse),
      //el lab no lo escribe. va off-chain y el paciente lo ve.
      let labName = "";
      try {
        const me = await api.getMe();
        labName = me?.name?.trim() || "";
      } catch { /* si falla, queda vacío y el paciente igual ve emitterName */ }

      setMessage("Procesando archivo...");
      const upload = await api.uploadFile(studyFile);
      const bytes = new Uint8Array(await studyFile.arrayBuffer());
      const documentHash = ethers.keccak256(bytes);

      setMessage("Registrando documento en blockchain...");
      const documentRegistry = await getDocumentRegistry();


      if (await documentRegistry.isHashRegistered(documentHash)) {
        throw new Error(
          "Este archivo ya fue registrado anteriormente en la blockchain. Subí un archivo distinto.",
        );
      }

      const tx = await documentRegistry.registerDocument(
        ethers.getAddress(patientAddress),
        documentHash,
        documentType.trim(),
        "",
      );
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log: any) => {
          try {
            return documentRegistry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === "DocumentRegistered");

      if (!event) throw new Error("No se pudo obtener el id del documento registrado");
      const documentIdOnChain = Number(event.args.documentId ?? event.args[0]);

      setMessage("Guardando datos del estudio...");
      await api.createLaboratoryStudy({
        documentIdOnChain,
        patientAddress: ethers.getAddress(patientAddress),
        emitterAddress: ethers.getAddress(address),
        title: title.trim(),
        documentType: documentType.trim(),
        studyType: studyType.trim(),
        labName: labName || undefined,
        notes: notes.trim() || undefined,
        fileBase64: upload.fileBase64,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      });

      setMessage(null);
      toast.show("Estudio subido correctamente");
      onStudyCreated?.();
      setPatientAddress("");
      setDocumentType("");
      setTitle("");
      setStudyType("");
      setNotes("");
      setStudyFile(null);
      setPatientStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "No se pudo subir el estudio");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LaboratoryCard title="Subir nuevo estudio">
      <div style={styles.body}>
        <p style={styles.help}>
          Completa los datos del estudio. La wallet, la categoría genérica y el hash se registran on-chain; el documento y el detalle clínico quedan off-chain en la base de datos.
        </p>

        <div style={styles.twoColumns}>
          <label style={styles.field}>
            <span style={styles.label}>Paciente <em style={styles.tag}>On-chain: address</em></span>
            <UserSelect
              users={patients}
              value={patientAddress}
              onChange={(addr) => {
                setPatientAddress(addr);
                setPatientStatus(null);
              }}
              placeholder="Seleccioná un paciente…"
              emptyText="No hay pacientes registrados todavía."
              accent={palette.emerald500}
            />
            <small style={styles.small}>
              El nombre se guarda off-chain; on-chain solo viaja la address.
            </small>
            {patientStatus ? <small style={patientStatus.includes("verificado") ? styles.okText : styles.warnText}>{patientStatus}</small> : null}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Categoría genérica <em style={styles.tag}>On-chain</em></span>
            <Select
              options={STUDY_CATEGORIES}
              value={documentType}
              onChange={setDocumentType}
              placeholder="Seleccioná una categoría…"
              accent={palette.emerald500}
            />
            <small style={styles.small}>Categoría general visible para todos</small>
          </label>
        </div>

        <div style={styles.twoColumns}>
          <label style={styles.field}>
            <span style={styles.label}>Título <em style={styles.tag}>Off-chain</em></span>
            <input
              style={styles.input}
              placeholder="Analisis de sangre - Jun 2026"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <small style={styles.small}>Nombre legible para mostrar en la app</small>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Tipo específico <em style={styles.tag}>Off-chain</em></span>
            <input
              style={styles.input}
              placeholder="Colesterol + HDL/LDL, TSH, Hemograma..."
              value={studyType}
              onChange={(event) => setStudyType(event.target.value)}
            />
            <small style={styles.small}>Tipo de análisis realizado, sin diagnóstico</small>
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Notas <em style={styles.tag}>Opcional</em></span>
          <input
            style={styles.input}
            placeholder="Muestra recibida en ayunas, observaciones..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <small style={styles.small}>Observaciones internas visibles solo donde corresponda</small>
        </label>

        <div style={styles.dropzone}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg"
            style={styles.hiddenFileInput}
            onChange={(event) => setStudyFile(event.target.files?.[0] ?? null)}
          />
          {studyFile ? (
            <div style={styles.file}>
              <div style={styles.fileIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={styles.fileInfo}>
                <strong style={styles.fileName}>{studyFile.name}</strong>
                <span style={styles.fileSize}>{formatFileSize(studyFile.size)}</span>
              </div>
              <button
                type="button"
                style={styles.remove}
                onClick={() => {
                  setStudyFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div style={styles.emptyFile}>
              <div style={styles.fileIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.slate400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <strong style={styles.emptyFileTitle}>Archivo del estudio</strong>
                <span style={styles.emptyFileSub}>Seleccioná un PDF o imagen</span>
              </div>
            </div>
          )}
          <button
            type="button"
            style={styles.selectFile}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Seleccionar archivo
            <span style={styles.selectFileSub}>PDF, JPG, PNG — máx. 10 MB</span>
          </button>
        </div>

        <div style={styles.footer}>
          <label style={styles.confirm}>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            Confirmo que los datos ingresados son correctos y el estudio pertenece al paciente.
          </label>
          <button type="button" style={styles.submit} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Spinner size={15} color={palette.white} /> Subiendo…
              </span>
            ) : "Subir estudio"}
          </button>
        </div>
        {message ? (
          <div style={{ ...styles.message, display: "flex", alignItems: "center", gap: 8 }}>
            {isSubmitting && <Spinner size={15} color={palette.emerald500} />}
            {message}
          </div>
        ) : null}
        {error ? <div style={styles.error}>{error}</div> : null}
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: { padding: "20px 22px 24px" },
  help: { color: palette.slate400, fontSize: 12, lineHeight: 1.6, marginBottom: 22, marginTop: 0 },
  twoColumns: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginBottom: 16,
  },
  field: { display: "flex", flexDirection: "column" as const, gap: 6, minWidth: 0 },
  label: { color: palette.labInk, fontSize: 12, fontWeight: 600 },
  tag: { fontStyle: "normal", fontSize: 10, fontWeight: 500, color: palette.slate400, marginLeft: 4 },
  input: {
    border: `1px solid ${palette.slate200}`,
    borderRadius: 10,
    color: palette.slate900,
    fontSize: 13,
    fontWeight: 500,
    height: 40,
    padding: "0 12px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  inputWithButton: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 90px", minWidth: 0 },
  verify: {
    background: palette.emerald50,
    border: `1px solid ${palette.emerald200}`,
    borderLeft: "none",
    borderRadius: "0 10px 10px 0",
    color: palette.emerald500,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  small: { color: palette.slate400, fontSize: 11 },
  okText: { color: palette.emerald500, fontSize: 11, fontWeight: 600 },
  warnText: { color: palette.orange500, fontSize: 11, fontWeight: 600 },
  dropzone: {
    alignItems: "center",
    background: palette.slate50,
    border: `1.5px dashed ${palette.slate200}`,
    borderRadius: 12,
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(0, 1fr) 160px",
    marginBottom: 20,
    padding: "16px 18px",
  },
  hiddenFileInput: { display: "none" },
  file: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "32px minmax(0, 1fr) 20px",
    minWidth: 0,
  },
  emptyFile: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "32px minmax(0, 1fr)",
    minWidth: 0,
  },
  fileIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: palette.emerald50,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  fileInfo: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  fileName: { fontSize: 12, fontWeight: 600, color: palette.slate900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileSize: { fontSize: 11, color: palette.slate400 },
  emptyFileTitle: { display: "block", fontSize: 12, fontWeight: 600, color: palette.slate500 },
  emptyFileSub: { display: "block", fontSize: 11, color: palette.slate400, marginTop: 2 },
  remove: { background: "transparent", border: "none", color: palette.red500, cursor: "pointer", fontSize: 16, padding: 0 },
  selectFile: {
    background: palette.white,
    border: `1.5px solid ${palette.slate200}`,
    borderRadius: 10,
    color: palette.emerald500,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 4,
    transition: "border-color 0.15s",
  },
  selectFileSub: { fontSize: 10, color: palette.slate400, fontWeight: 400 },
  footer: { alignItems: "center", display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) 160px" },
  confirm: { alignItems: "flex-start", color: palette.slate500, display: "flex", fontSize: 12, gap: 8, lineHeight: 1.5, cursor: "pointer" },
  submit: {
    background: gradients.labButton,
    border: "none",
    borderRadius: 10,
    color: palette.white,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    height: 40,
    transition: "opacity 0.15s",
  },
  message: {
    background: palette.emerald50,
    border: `1px solid ${palette.emerald200}`,
    borderRadius: 10,
    color: palette.green700,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 14,
    padding: "10px 14px",
  },
  error: {
    background: palette.red50,
    border: `1px solid ${palette.red200}`,
    borderRadius: 10,
    color: palette.red600,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 14,
    padding: "10px 14px",
  },
};
