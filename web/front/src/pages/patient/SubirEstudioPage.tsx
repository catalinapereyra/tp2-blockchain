import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import { ethers } from "ethers";
import { getDocumentRegistry, DOCUMENT_REGISTRY_ABI } from "../../lib/contracts";
import { palette, fontFamily, gradients } from "../../styles";
import { STUDY_CATEGORIES } from "../../lib/categories";
import Select from "../../components/common/Select";

type Step = "idle" | "uploading" | "signing" | "saving" | "done" | "error";

export default function SubirEstudioPage() {
  const navigate = useNavigate();
  const { address } = useWallet();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("analisis");
  const [studyType, setStudyType] = useState("");
  const [title, setTitle] = useState("");
  const [studyDate, setStudyDate] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = file && studyType && title && studyDate && step === "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !address) return;

    setErrorMsg("");

    try {
      setStep("uploading");
      const uploaded = await api.uploadFile(file);
      if (uploaded.error) throw new Error(uploaded.message || "Error subiendo archivo");
      const { fileBase64, fileName, mimeType, fileHash } = uploaded;

      setStep("signing");
      const registry = await getDocumentRegistry();


      if (await registry.isHashRegistered(fileHash)) {
        throw new Error(
          "Este archivo ya fue registrado anteriormente en la blockchain. Subí un archivo distinto.",
        );
      }

      const tx = await registry.uploadOwnDocument(fileHash, category, "");
      const receipt = await tx.wait();


      const iface = new ethers.Interface(DOCUMENT_REGISTRY_ABI);
      let documentIdOnChain = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "DocumentRegistered") {
            documentIdOnChain = Number(parsed.args.documentId);
            break;
          }
        } catch { /* log de otro contrato, ignorar */ }
      }


      setStep("saving");
      await api.createDocument({
        documentIdOnChain,
        patientAddress: address,
        emitterAddress: address,
        title,
        description: notes || undefined,
        documentType: category,
        studyType,
        studyDate,
        labName: labName || undefined,
        fileBase64,
        fileName,
        mimeType,
      });

      setStep("done");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error");
      setStep("error");
    }
  }

  function handleReset() {
    setFile(null);
    setStudyType("");
    setTitle("");
    setStudyDate("");
    setLabName("");
    setNotes("");
    setStep("idle");
    setErrorMsg("");
  }

  if (step === "done") {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.successBox}>
            <div style={s.successIconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={s.successTitle}>Estudio subido</h2>
            <p style={s.successDesc}>Tu estudio quedó registrado en blockchain y aparece en tu historial.</p>
            <div style={s.successActions}>
              <button style={s.btnPrimary} onClick={() => navigate("/patient/estudios")}>Ver mis estudios</button>
              <button style={s.btnSecondary} onClick={handleReset}>Subir otro</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = step === "uploading" || step === "signing" || step === "saving";

  const stepLabel: Record<string, string> = {
    uploading: "Procesando archivo…",
    signing: "Confirmá la transacción en MetaMask…",
    saving: "Guardando metadata…",
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/patient")} disabled={isLoading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.pageHeader}>
          <div style={s.pageIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Subir estudio propio</h1>
            <p style={s.pageSubtitle}>Cargá estudios anteriores para completar tu historial.</p>
          </div>
        </div>

        <div style={s.infoBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.indigo500} strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>El tipo de estudio es <strong>privado</strong> — solo vos lo ves. On-chain solo queda la categoría genérica.</span>
        </div>

        {step === "error" && (
          <div style={s.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.red600} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errorMsg}
          </div>
        )}

        {isLoading && (
          <div style={s.loadingBox}>
            <div style={s.spinner} />
            {stepLabel[step]}
          </div>
        )}

        <form style={{ ...s.form, opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? "none" : "auto" }} onSubmit={handleSubmit}>

          <div style={s.field}>
            <label style={s.label}>Archivo <span style={s.req}>*</span></label>
            <div
              style={{ ...s.dropzone, ...(file ? s.dropzoneActive : {}) }}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              {file
                ? <span style={{ color: palette.emerald500, fontWeight: 600 }}>{file.name}</span>
                : <span style={{ color: palette.slate400, fontSize: 13 }}>PDF o imagen — hacé click para elegir</span>
              }
              <input id="fileInput" type="file" accept=".pdf,image/*" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              Categoría <span style={s.req}>*</span>
              <span style={s.labelNote}>— esto va on-chain (genérico)</span>
            </label>
            <Select
              options={STUDY_CATEGORIES}
              value={category}
              onChange={setCategory}
              accent={palette.emerald500}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>
              Tipo de estudio <span style={s.req}>*</span>
              <span style={s.labelNote}>— solo lo ves vos (off-chain)</span>
            </label>
            <input style={s.input} placeholder="Ej: Colesterol total + HDL/LDL, TSH, Hemograma…"
              value={studyType} onChange={(e) => setStudyType(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Título <span style={s.req}>*</span></label>
            <input style={s.input} placeholder="Ej: Análisis de sangre - Marzo 2020"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>
              Fecha del estudio <span style={s.req}>*</span>
              <span style={s.labelNote}>— la fecha real, no la de hoy</span>
            </label>
            <input style={s.input} type="date"
              value={studyDate} onChange={(e) => setStudyDate(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Laboratorio / Centro <span style={s.opt}>(opcional)</span></label>
            <input style={s.input} placeholder="Ej: Laboratorio Central, Hospital Italiano…"
              value={labName} onChange={(e) => setLabName(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Notas personales <span style={s.opt}>(opcional)</span></label>
            <textarea style={{ ...s.input, height: 72, resize: "vertical" as const }}
              placeholder="Contexto, motivo del estudio…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button type="submit" style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit}>
            Subir estudio
          </button>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    background: gradients.app,
    fontFamily: fontFamily.sans, paddingBottom: 60,
  },
  container: { maxWidth: 560, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: palette.slate500,
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: fontFamily.sans,
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: palette.emerald50,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  infoBox: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: palette.indigoSoft, border: `1px solid ${palette.indigo200}`,
    borderRadius: 10, padding: "10px 14px", fontSize: 12, color: palette.indigo600,
    lineHeight: 1.5, marginBottom: 16,
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: palette.red50, border: `1px solid ${palette.red200}`,
    borderRadius: 10, padding: "10px 14px", fontSize: 12, color: palette.red600,
    marginBottom: 16,
  },
  loadingBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: palette.white, border: `1px solid ${palette.slate200}`,
    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: palette.slate600,
    marginBottom: 16, fontWeight: 500,
  },
  spinner: {
    width: 16, height: 16,
    border: `2px solid ${palette.slate200}`,
    borderTopColor: palette.emerald500,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  form: { background: palette.white, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column" as const, gap: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "opacity 0.2s" },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: palette.slate600, display: "flex", alignItems: "center", gap: 4 },
  req: { color: palette.red600 },
  opt: { color: palette.slate400, fontWeight: 400, fontSize: 12 },
  labelNote: { color: palette.slate400, fontWeight: 400, fontSize: 11 },
  input: {
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 13, fontFamily: fontFamily.sans, outline: "none",
    width: "100%", boxSizing: "border-box" as const, color: palette.slate800,
  },
  radioGroup: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  radioBtn: {
    border: `1.5px solid ${palette.slate200}`, borderRadius: 8, padding: "7px 14px",
    fontSize: 12, fontWeight: 500, cursor: "pointer", color: palette.slate600, background: palette.white,
  },
  radioBtnActive: { borderColor: palette.indigo500, background: palette.indigoSoft, color: palette.indigo500 },
  dropzone: {
    border: `2px dashed ${palette.slate200}`, borderRadius: 12, padding: "20px",
    textAlign: "center" as const, cursor: "pointer",
  },
  dropzoneActive: { borderColor: palette.emerald500, background: palette.emerald50 },
  submitBtn: {
    background: palette.emerald500, color: palette.white, border: "none",
    padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  successBox: {
    background: palette.white, borderRadius: 20, padding: "48px 32px",
    textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  successIconWrap: {
    width: 64, height: 64, borderRadius: "50%", background: palette.emerald50,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  successTitle: { fontSize: 22, fontWeight: 700, color: palette.slate900, margin: "0 0 8px" },
  successDesc: { fontSize: 14, color: palette.slate500, margin: "0 0 24px" },
  successActions: { display: "flex", gap: 10, justifyContent: "center" },
  btnPrimary: {
    background: palette.emerald500, color: palette.white, border: "none",
    padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  btnSecondary: {
    background: "none", color: palette.slate500, border: `1.5px solid ${palette.slate200}`,
    padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
