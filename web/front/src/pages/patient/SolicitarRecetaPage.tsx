import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { api, AppUser } from "../../lib/api";
import { getUserRegistryReadOnly } from "../../lib/contracts";
import UserSelect from "../../components/common/UserSelect";
import { palette, fontFamily, gradients } from "../../styles";

export default function SolicitarRecetaPage() {
  const navigate = useNavigate();
  const [doctorAddress, setDoctorAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [medicos, setMedicos] = useState<AppUser[]>([]);

  // Carga los médicos registrados (nombre off-chain) y deja solo los aprobados on-chain
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

  const canSubmit = doctorAddress.startsWith("0x") && description.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Acá iría: PrescriptionManager.requestPrescription(doctorAddress, description)
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.successBox}>
            <div style={s.successIcon}>📋</div>
            <h2 style={s.successTitle}>Solicitud enviada</h2>
            <p style={s.successDesc}>El médico va a recibir tu solicitud y podrá aceptarla o rechazarla desde su panel.</p>
            <button style={s.btnPrimary} onClick={() => navigate("/patient")}>Volver al inicio</button>
          </div>
        </div>
      </div>
    );
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.sky500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Solicitar receta</h1>
            <p style={s.pageSubtitle}>El médico recibe tu solicitud y te manda la receta desde su panel.</p>
          </div>
        </div>

        <form style={s.form} onSubmit={handleSubmit}>

          <div style={s.field}>
            <label style={s.label}>Médico <span style={s.req}>*</span></label>
            <UserSelect
              users={medicos}
              value={doctorAddress}
              onChange={setDoctorAddress}
              placeholder="Seleccioná un médico…"
              emptyText="No hay médicos aprobados disponibles todavía."
              accent={palette.sky500}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>¿Qué receta necesitás? <span style={s.req}>*</span></label>
            <textarea
              style={{ ...s.input, height: 90, resize: "vertical" as const }}
              placeholder="Ej: Losartán 50mg - 1 por día para la presión. Ya tomo hace 6 meses."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span style={s.hint}>Describí el medicamento, dosis si sabés, y contexto relevante.</span>
          </div>

          <button type="submit" style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit}>
            Enviar solicitud
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
  container: { maxWidth: 520, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: palette.slate500,
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: fontFamily.sans,
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: palette.sky50,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: palette.slate900, margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: palette.slate400, margin: "2px 0 0" },
  form: { background: palette.white, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column" as const, gap: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  field: { display: "flex", flexDirection: "column" as const, gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: palette.slate600 },
  req: { color: palette.red600 },
  hint: { fontSize: 11, color: palette.slate400 },
  input: {
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 13, fontFamily: fontFamily.sans, outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  },
  medicosGrid: { display: "flex", flexDirection: "column" as const, gap: 8 },
  medicoBtn: {
    display: "flex", alignItems: "center", gap: 10,
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 14px",
    cursor: "pointer", color: palette.slate600, background: palette.white,
  },
  medicoBtnActive: { borderColor: palette.sky500, background: palette.sky50, color: palette.sky500 },
  submitBtn: {
    background: palette.sky500, color: palette.white, border: "none",
    padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  successBox: {
    background: palette.white, borderRadius: 20, padding: "48px 32px",
    textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 700, color: palette.slate900, margin: "0 0 8px" },
  successDesc: { fontSize: 14, color: palette.slate500, margin: "0 0 24px" },
  btnPrimary: {
    background: palette.sky500, color: palette.white, border: "none",
    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
};
