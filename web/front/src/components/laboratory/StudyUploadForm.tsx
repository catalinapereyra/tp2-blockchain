import { useRef, useState } from "react";
import { ethers } from "ethers";
import { api } from "../../lib/api";
import { getDocumentRegistry, getUserRegistryReadOnly } from "../../lib/contracts";
import { useWallet } from "../../context/WalletContext";
import { LaboratoryCard } from "./LaboratoryCard";

type StudyUploadFormProps = {
  onStudyCreated?: () => void;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudyUploadForm({ onStudyCreated }: StudyUploadFormProps) {
  const { address } = useWallet();
  const [studyFile, setStudyFile] = useState<File | null>(null);
  const [patientAddress, setPatientAddress] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [labName, setLabName] = useState("");
  const [studyType, setStudyType] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [patientStatus, setPatientStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!documentType.trim() || !title.trim() || !labName.trim() || !studyType.trim()) {
      setError("Completa paciente, categoria, titulo, laboratorio y tipo especifico");
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

      setMessage("Subiendo archivo a IPFS...");
      const upload = await api.uploadFile(studyFile);
      const bytes = new Uint8Array(await studyFile.arrayBuffer());
      const documentHash = ethers.keccak256(bytes);

      setMessage("Registrando documento en blockchain...");
      const documentRegistry = await getDocumentRegistry();
      const tx = await documentRegistry.registerDocument(
        ethers.getAddress(patientAddress),
        documentHash,
        documentType.trim(),
        upload.cid,
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
        labName: labName.trim(),
        notes: notes.trim() || undefined,
        ipfsCid: upload.cid,
        ipfsUrl: upload.url,
      });

      setMessage("Estudio subido correctamente");
      onStudyCreated?.();
      setPatientAddress("");
      setDocumentType("");
      setTitle("");
      setLabName("");
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
    <LaboratoryCard title="Subir Nuevo Estudio">
      <div style={styles.body}>
        <p style={styles.help}>
          Completa los datos del estudio. La wallet, la categoria generica, el hash y el CID se registran on-chain; el detalle clinico queda off-chain.
        </p>

        <div style={styles.twoColumns}>
          <label style={styles.field}>
            <span style={styles.label}>Paciente <em>On-chain</em></span>
            <div style={styles.inputWithButton}>
              <input
                style={styles.input}
                placeholder="0xA6B7...e3D4f"
                value={patientAddress}
                onChange={(event) => {
                  setPatientAddress(event.target.value);
                  setPatientStatus(null);
                }}
              />
              <button type="button" style={styles.verify} onClick={verifyPatient} disabled={isVerifying || isSubmitting}>
                {isVerifying ? "..." : "Verificar"}
              </button>
            </div>
            <small style={styles.small}>Ingresa la address del paciente</small>
            {patientStatus ? <small style={patientStatus.includes("verificado") ? styles.okText : styles.warnText}>{patientStatus}</small> : null}
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Categoria Generica <em>On-chain</em></span>
            <input
              style={styles.input}
              placeholder="analisis, imagen, patologia..."
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            />
            <small style={styles.small}>Categoria general visible para todos</small>
          </label>
        </div>

        <div style={styles.twoColumns}>
          <label style={styles.field}>
            <span style={styles.label}>Titulo <em>Off-chain</em></span>
            <input
              style={styles.input}
              placeholder="Analisis de sangre - Jun 2026"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <small style={styles.small}>Nombre legible para mostrar en la app</small>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Nombre del Laboratorio <em>Off-chain</em></span>
            <input
              style={styles.input}
              placeholder="Laboratorio Central"
              value={labName}
              onChange={(event) => setLabName(event.target.value)}
            />
            <small style={styles.small}>Texto visible, no solo la wallet emisora</small>
          </label>
        </div>

        <div style={styles.twoColumns}>
          <label style={styles.field}>
            <span style={styles.label}>Tipo Especifico <em>Off-chain / solo paciente</em></span>
            <input
              style={styles.input}
              placeholder="Colesterol + HDL/LDL, TSH, Hemograma..."
              value={studyType}
              onChange={(event) => setStudyType(event.target.value)}
            />
            <small style={styles.small}>El laboratorio no carga diagnostico, solo el tipo de analisis realizado</small>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Notas del Lab <em>Off-chain / opcional</em></span>
            <input
              style={styles.input}
              placeholder="Muestra recibida en ayunas, observaciones..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <small style={styles.small}>Observaciones internas del resultado, visibles solo donde corresponda</small>
          </label>
        </div>

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
              <span style={styles.fileIcon}>▣</span>
              <div style={styles.fileInfo}>
                <strong style={styles.fileName}>{studyFile.name}</strong>
                <span>{formatFileSize(studyFile.size)}</span>
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
              <span style={styles.fileIcon}>▣</span>
              <div>
                <strong>Archivo del estudio</strong>
                <span>Selecciona un PDF o imagen</span>
              </div>
            </div>
          )}
          <button
            type="button"
            style={styles.selectFile}
            onClick={() => fileInputRef.current?.click()}
          >
            ↥ Seleccionar archivo<br /><span>PDF, JPG, PNG - Max. 10MB</span>
          </button>
        </div>

        <div style={styles.footer}>
          <label style={styles.confirm}>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            Confirmo que los datos ingresados son correctos y el estudio pertenece al paciente.
          </label>
          <button type="button" style={styles.submit} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Subiendo..." : "Subir Estudio"}
          </button>
        </div>
        {message ? <div style={styles.message}>{message}</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: { padding: "24px 24px 26px" },
  help: { color: "#687795", fontSize: 13, fontWeight: 800, marginBottom: 26 },
  twoColumns: {
    display: "grid",
    gap: 36,
    gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
    marginBottom: 24,
  },
  field: { display: "grid", gap: 10, marginBottom: 24, minWidth: 0 },
  label: { color: "#344462", fontSize: 12, fontWeight: 900 },
  input: {
    border: "1px solid #dbe3ef",
    borderRadius: 6,
    color: "#3f4f6b",
    fontSize: 13,
    fontWeight: 800,
    height: 44,
    padding: "0 14px",
    width: "100%",
  },
  inputWithButton: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 104px", minWidth: 0 },
  verify: {
    background: "#f8fffb",
    border: "1px solid #dbe3ef",
    borderLeft: "none",
    borderRadius: "0 6px 6px 0",
    color: "#16a34a",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
  },
  small: { color: "#8793aa", fontSize: 11, fontWeight: 800 },
  okText: { color: "#16a34a", fontSize: 11, fontWeight: 900 },
  warnText: { color: "#f97316", fontSize: 11, fontWeight: 900 },
  dropzone: {
    alignItems: "center",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    display: "grid",
    gap: 24,
    gridTemplateColumns: "minmax(0, 1fr) 190px",
    marginBottom: 22,
    minHeight: 112,
    padding: 20,
  },
  hiddenFileInput: { display: "none" },
  file: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #edf1f7",
    borderRadius: 8,
    color: "#536582",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "36px minmax(0, 1fr) 24px",
    maxWidth: 560,
    minWidth: 0,
    padding: "12px 14px",
  },
  emptyFile: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #edf1f7",
    borderRadius: 8,
    color: "#536582",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "36px minmax(0, 1fr)",
    maxWidth: 560,
    minWidth: 0,
    padding: "12px 14px",
  },
  fileInfo: { display: "grid", gap: 4, minWidth: 0 },
  fileName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileIcon: {
    alignItems: "center",
    background: "#f1edff",
    borderRadius: 6,
    color: "#7c3aed",
    display: "flex",
    height: 32,
    justifyContent: "center",
  },
  remove: { background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" },
  selectFile: {
    background: "#ffffff",
    border: "1px solid #e0e7f2",
    borderRadius: 8,
    color: "#2563eb",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1.7,
    padding: "12px 10px",
  },
  footer: { alignItems: "center", display: "grid", gap: 24, gridTemplateColumns: "minmax(0, 1fr) 230px" },
  confirm: { alignItems: "center", color: "#61708d", display: "flex", fontSize: 12, fontWeight: 800, gap: 10 },
  submit: {
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    border: "none",
    borderRadius: 6,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    height: 42,
  },
  message: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 6,
    color: "#15803d",
    fontSize: 12,
    fontWeight: 900,
    marginTop: 16,
    padding: "10px 12px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 900,
    marginTop: 16,
    padding: "10px 12px",
  },
};
