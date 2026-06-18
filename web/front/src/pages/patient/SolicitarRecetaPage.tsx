import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Mock de médicos que el paciente ya tiene como contacto
const MOCK_MEDICOS = [
  { address: "0x29515ab33fccc23280c6638fdc02f8265db11262", label: "Médico 1" },
  { address: "0xa05317a6208826d4f9c71b3e1234567890abcdef", label: "Médico 2" },
];

export default function SolicitarRecetaPage() {
  const navigate = useNavigate();
  const [doctorAddress, setDoctorAddress] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const finalAddress = doctorAddress === "custom" ? customAddress : doctorAddress;
  const canSubmit = finalAddress.startsWith("0x") && description.trim().length > 0;

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
            <div style={s.medicosGrid}>
              {MOCK_MEDICOS.map((m) => (
                <label
                  key={m.address}
                  style={{ ...s.medicoBtn, ...(doctorAddress === m.address ? s.medicoBtnActive : {}) }}
                >
                  <input type="radio" name="doctor" value={m.address}
                    checked={doctorAddress === m.address}
                    onChange={() => setDoctorAddress(m.address)}
                    style={{ display: "none" }} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>
                      {m.address.slice(0, 10)}…{m.address.slice(-6)}
                    </div>
                  </div>
                </label>
              ))}
              <label style={{ ...s.medicoBtn, ...(doctorAddress === "custom" ? s.medicoBtnActive : {}) }}>
                <input type="radio" name="doctor" value="custom"
                  checked={doctorAddress === "custom"}
                  onChange={() => setDoctorAddress("custom")}
                  style={{ display: "none" }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Otro médico</div>
              </label>
            </div>
            {doctorAddress === "custom" && (
              <input
                style={{ ...s.input, marginTop: 8 }}
                placeholder="0x... wallet del médico"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
              />
            )}
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
