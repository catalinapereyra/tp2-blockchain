import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import { api, AppUser } from "../../lib/api";
import { signMedicalDocument } from "../../lib/contracts";
import { STUDY_CATEGORIES } from "../../lib/categories";
import UserSelect from "../../components/common/UserSelect";
import Select from "../../components/common/Select";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../components/common/Toast";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

export default function FirmarEstudioPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const toast = useToast();

  const [patients, setPatients] = useState<AppUser[]>([]);
  const [patientAddress, setPatientAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("analisis");
  const [studyType, setStudyType] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getUsers(0).then(setPatients).catch(() => setPatients([]));
  }, []);

  const canSubmit = patientAddress.startsWith("0x") && file && title.trim() && studyType.trim() && !signing;

  async function handleSign() {
    setError("");
    if (!address || !file || !patientAddress.startsWith("0x")) return;
    setSigning(true);
    try {
      //procesa el archivo y calcula el hash que se firma
      const upload = await api.uploadFile(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const documentHash = ethers.keccak256(bytes);
      const offChainRef = crypto.randomUUID(); // referencia off-chain (debe ser no vacía)

      //medico firma off-chain con EIP-712, sin pagar gas
      const signature = await signMedicalDocument({
        patient: ethers.getAddress(patientAddress),
        documentHash,
        documentType: category,
        offChainRef,
        doctor: ethers.getAddress(address),
      });

      await api.createSignedDocument({
        patientAddress: ethers.getAddress(patientAddress),
        documentHash,
        documentType: category,
        offChainRef,
        signature,
        title: title.trim(),
        studyType: studyType.trim(),
        notes: notes.trim() || undefined,
        fileBase64: upload.fileBase64,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      });

      toast.show("Estudio firmado — el paciente lo verá para registrar");
      setPatientAddress("");
      setFile(null);
      setStudyType("");
      setTitle("");
      setNotes("");
    } catch (e: any) {
      setError(e?.message || "No se pudo firmar el estudio");
      toast.show("No se pudo firmar el estudio", "error");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/doctor")}>
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
            <h1 style={s.title}>Firmar estudio</h1>
            <p style={s.subtitle}>Firmás el estudio sin pagar gas. El paciente lo registra en su historial.</p>
          </div>
        </div>

        <div style={s.infoBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.emerald600} strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Tu firma queda guardada off-chain. <strong>No pagás gas.</strong> Cuando el paciente la acepte, él paga la transacción que la registra on-chain.</span>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Paciente <span style={s.req}>*</span></label>
            <UserSelect
              users={patients}
              value={patientAddress}
              onChange={setPatientAddress}
              placeholder="Seleccioná un paciente…"
              emptyText="No hay pacientes registrados todavía."
              accent={palette.emerald500}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Archivo <span style={s.req}>*</span></label>
            <div style={{ ...s.dropzone, ...(file ? s.dropzoneActive : {}) }} onClick={() => document.getElementById("signFileInput")?.click()}>
              {file
                ? <span style={{ color: palette.emerald500, fontWeight: fontWeight.semibold }}>{file.name}</span>
                : <span style={{ color: palette.slate400, fontSize: fontSize.base }}>PDF o imagen — hacé click para elegir</span>}
              <input id="signFileInput" type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Categoría <span style={s.req}>*</span></label>
              <Select options={STUDY_CATEGORIES} value={category} onChange={setCategory} accent={palette.emerald500} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Título <span style={s.req}>*</span></label>
              <input style={s.input} placeholder="Análisis de sangre - Jun 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Tipo específico <span style={s.req}>*</span></label>
            <input style={s.input} placeholder="Colesterol + HDL/LDL, TSH…" value={studyType} onChange={(e) => setStudyType(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Notas <span style={s.opt}>opcional</span></label>
            <input style={s.input} placeholder="Observaciones…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit} onClick={handleSign}>
            {signing ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Spinner size={15} color={palette.white} /> Firmá en MetaMask…</span> : "Firmar estudio (sin gas)"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 560, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  infoBox: { display: "flex", alignItems: "flex-start", gap: 8, background: colors.labSoft, border: `1px solid ${palette.emerald200}`, borderRadius: radius.md, padding: "10px 14px", fontSize: fontSize.sm, color: palette.emerald600, lineHeight: 1.5, marginBottom: 16 },
  errorBox: { display: "flex", alignItems: "center", gap: 8, background: colors.error.bg, border: `1px solid ${colors.error.border}`, borderRadius: radius.md, padding: "10px 14px", fontSize: fontSize.sm, color: colors.error.fg, marginBottom: 16 },
  form: { background: colors.surface, borderRadius: radius["2xl"], padding: "24px", display: "flex", flexDirection: "column" as const, gap: 16, boxShadow: shadow.sm },
  row: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  field: { display: "flex", flexDirection: "column" as const, gap: 6, flex: 1, minWidth: 0 },
  label: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textSecondary, display: "flex", alignItems: "center", gap: 4 },
  req: { color: colors.error.fg },
  opt: { color: colors.textFaint, fontWeight: fontWeight.regular, fontSize: fontSize.sm },
  input: { border: `1.5px solid ${colors.border}`, borderRadius: radius.md, padding: "10px 12px", fontSize: fontSize.base, fontFamily: fontFamily.sans, outline: "none", width: "100%", boxSizing: "border-box" as const, color: palette.slate800 },
  dropzone: { border: `2px dashed ${colors.border}`, borderRadius: radius.lg, padding: "20px", textAlign: "center" as const, cursor: "pointer" },
  dropzoneActive: { borderColor: palette.emerald500, background: colors.labSoft },
  submitBtn: { background: palette.emerald500, color: palette.white, border: "none", padding: "13px", borderRadius: radius.md, fontSize: fontSize.md, fontWeight: fontWeight.bold, cursor: "pointer", fontFamily: fontFamily.sans, marginTop: 4 },
};
