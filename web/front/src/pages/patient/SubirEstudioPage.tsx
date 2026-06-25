import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api } from "../../lib/api";
import { ethers } from "ethers";
import { getDocumentRegistry, DOCUMENT_REGISTRY_ABI, explorerTxUrl } from "../../lib/contracts";
import { landing, sectionAccent, colors, palette, fontFamily, fontSize, fontWeight, radius } from "../../styles";
import { STUDY_CATEGORIES } from "../../lib/categories";
import Select from "../../components/common/Select";
import { Icon } from "../../components/landing/Icon";
import PageShell, { lu, iconBox, accentPill } from "../../components/patient/PageShell";

const accent = sectionAccent.estudios;

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
  const [txHash, setTxHash] = useState<string | null>(null);

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
      setTxHash(tx.hash);
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
    setTxHash(null);
    setStep("idle");
    setErrorMsg("");
  }

  if (step === "done") {
    return (
      <PageShell back={() => navigate("/patient/estudios")} accent={accent} icon="document" eyebrow="Historial médico" title="Subir estudio propio">
        <div style={s.successBox}>
          <div style={{ ...iconBox(accent), width: 64, height: 64, borderRadius: radius.full, margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={s.successTitle}>Estudio subido</h2>
          <p style={s.successDesc}>Tu estudio quedó registrado en blockchain y aparece en tu historial.</p>
          {txHash && (
            <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" style={s.explorerLink}>
              Ver la transacción en Etherscan
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          )}
          <div style={s.successActions}>
            <button style={{ ...accentPill(accent), marginLeft: 0 }} onClick={() => navigate("/patient/estudios")}>
              <Icon name="arrow" size={15} />Ver mis estudios
            </button>
            <button style={s.btnSecondary} onClick={handleReset}>Subir otro</button>
          </div>
        </div>
      </PageShell>
    );
  }

  const isLoading = step === "uploading" || step === "signing" || step === "saving";

  const stepLabel: Record<string, string> = {
    uploading: "Procesando archivo…",
    signing: "Confirmá la transacción en MetaMask…",
    saving: "Guardando metadata…",
  };

  return (
    <PageShell
      back={() => !isLoading && navigate("/patient")}
      accent={accent}
      icon="document"
      eyebrow="Historial médico"
      title="Subir estudio propio"
      subtitle="Cargá estudios anteriores para completar tu historial."
      maxWidth={620}
    >
      <div style={s.infoBox}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent.main} strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>El tipo de estudio es <strong>privado</strong> — solo vos lo ves. On-chain solo queda la categoría genérica.</span>
      </div>

      {step === "error" && (
        <div style={s.errorBox}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.error.fg} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {errorMsg}
        </div>
      )}

      {isLoading && (
        <div style={s.loadingBox}>
          <div style={{ ...lu.spinner, width: 18, height: 18, borderWidth: 2, borderTopColor: accent.main }} />
          {stepLabel[step]}
        </div>
      )}

      <form style={{ ...s.form, opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? "none" : "auto" }} onSubmit={handleSubmit}>
        <div style={s.field}>
          <label style={s.label}>Archivo <span style={s.req}>*</span></label>
          <div
            style={{ ...s.dropzone, ...(file ? { borderColor: accent.main, background: accent.soft } : {}) }}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            {file
              ? <span style={{ color: accent.main, fontWeight: fontWeight.semibold }}>{file.name}</span>
              : <span style={{ color: landing.textFaint, fontSize: fontSize.md }}>PDF o imagen — hacé click para elegir</span>
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
          <Select options={STUDY_CATEGORIES} value={category} onChange={setCategory} accent={accent.main} />
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

        <button type="submit" style={{ ...s.submitBtn, background: accent.main, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit}>
          Subir estudio
        </button>
      </form>
    </PageShell>
  );
}

const s: Record<string, React.CSSProperties> = {
  infoBox: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: accent.soft, border: `1px solid ${accent.main}33`,
    borderRadius: radius.lg, padding: "11px 15px", fontSize: fontSize.base, color: accent.main,
    lineHeight: 1.5, marginBottom: 16,
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: colors.error.bg, border: `1px solid ${colors.error.border}`,
    borderRadius: radius.lg, padding: "11px 15px", fontSize: fontSize.base, color: colors.error.fg,
    marginBottom: 16,
  },
  loadingBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: palette.white, border: landing.cardBorder,
    borderRadius: radius.lg, padding: "12px 16px", fontSize: fontSize.md, color: landing.textBody,
    marginBottom: 16, fontWeight: fontWeight.medium,
  },
  form: { ...lu.card, borderRadius: radius["3xl"], padding: 26, display: "flex", flexDirection: "column" as const, gap: 18, transition: "opacity 0.2s" },
  field: { display: "flex", flexDirection: "column" as const, gap: 7 },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: landing.navy, display: "flex", alignItems: "center", gap: 4 },
  req: { color: colors.error.fg },
  opt: { color: landing.textFaint, fontWeight: fontWeight.regular, fontSize: fontSize.base },
  labelNote: { color: landing.textFaint, fontWeight: fontWeight.regular, fontSize: fontSize.sm },
  input: {
    border: "1px solid rgba(8,31,73,0.12)", borderRadius: radius.lg, padding: "11px 13px",
    fontSize: fontSize.md, fontFamily: fontFamily.sans, outline: "none",
    width: "100%", boxSizing: "border-box" as const, color: landing.navy,
  },
  dropzone: {
    border: "2px dashed rgba(8,31,73,0.16)", borderRadius: radius["2xl"], padding: 22,
    textAlign: "center" as const, cursor: "pointer",
  },
  submitBtn: {
    color: palette.white, border: "none", padding: 14, borderRadius: radius.full,
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, cursor: "pointer", fontFamily: fontFamily.sans,
  },
  successBox: { ...lu.card, borderRadius: radius["3xl"], padding: "48px 32px", textAlign: "center" as const },
  successTitle: { fontSize: fontSize["3xl"], fontWeight: fontWeight.bold, color: landing.navy, margin: "0 0 8px" },
  successDesc: { fontSize: fontSize.md, color: landing.textBody, margin: "0 0 16px" },
  explorerLink: { display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, color: accent.main, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textDecoration: "underline" },
  successActions: { display: "flex", gap: 10, justifyContent: "center" },
  btnSecondary: {
    background: "none", color: landing.textBody, border: "1.5px solid rgba(8,31,73,0.12)",
    padding: "11px 20px", borderRadius: radius.full, fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
