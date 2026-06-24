import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { api, AppUser } from "../../lib/api";
import { getUserRegistryReadOnly } from "../../lib/contracts";
import UserSelect from "../../components/common/UserSelect";

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              accent="#0ea5e9"
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
    background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 40%, #f0fdf8 100%)",
    fontFamily: "'DM Sans', sans-serif", paddingBottom: 60,
  },
  container: { maxWidth: 520, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: "#64748b",
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: "#f0f9ff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "2px 0 0" },
  form: { background: "white", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column" as const, gap: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  field: { display: "flex", flexDirection: "column" as const, gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569" },
  req: { color: "#dc2626" },
  hint: { fontSize: 11, color: "#94a3b8" },
  input: {
    border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  },
  medicosGrid: { display: "flex", flexDirection: "column" as const, gap: 8 },
  medicoBtn: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px",
    cursor: "pointer", color: "#475569", background: "white",
  },
  medicoBtnActive: { borderColor: "#0ea5e9", background: "#f0f9ff", color: "#0ea5e9" },
  submitBtn: {
    background: "#0ea5e9", color: "white", border: "none",
    padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  successBox: {
    background: "white", borderRadius: 20, padding: "48px 32px",
    textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" },
  successDesc: { fontSize: 14, color: "#64748b", margin: "0 0 24px" },
  btnPrimary: {
    background: "#0ea5e9", color: "white", border: "none",
    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};
