import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { getUserRegistry } from "../lib/contracts";
import { api } from "../lib/api";

type OptionKey = "patient" | "doctor" | "lab" | "institution";

const OPTIONS: { key: OptionKey; icon: string; label: string; desc: string; role?: number }[] = [
  { key: "patient", icon: "🙋", label: "Paciente", desc: "Aprobado automáticamente" },
  { key: "doctor", icon: "🧑‍⚕️", label: "Médico", desc: "Requiere aprobación del admin", role: 1 },
  { key: "lab", icon: "🔬", label: "Laboratorio", desc: "Requiere aprobación del admin", role: 2 },
  { key: "institution", icon: "🏥", label: "Institución", desc: "Requiere aprobación del admin", role: 3 },
];

function intendedToKey(s: string | null): OptionKey {
  if (s === "patient") return "patient";
  if (s === "doctor") return "doctor";
  if (s === "lab") return "lab";
  return "patient";
}

export default function Register() {
  const { refresh } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OptionKey>(() =>
    intendedToKey(localStorage.getItem("intended_role"))
  );
  const [fromHome] = useState<boolean>(() => !!localStorage.getItem("intended_role"));
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    localStorage.removeItem("intended_role");
  }, []);

  // Laboratorios e instituciones son entidades: solo piden el nombre de la entidad,
  // no apellido. Pacientes y médicos son personas: nombre + apellido.
  const isOrg = selected === "lab" || selected === "institution";

  async function register() {
    if (!name.trim() || (!isOrg && !lastName.trim())) {
      setError(isOrg ? "Completá el nombre" : "Completá tu nombre y apellido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const contract = await getUserRegistry();
      const opt = OPTIONS.find((o) => o.key === selected)!;
      const roleNumber = selected === "patient" ? 0 : opt.role!;
      let tx;
      if (selected === "patient") {
        tx = await contract.registerAsPatient();
      } else {
        tx = await contract.registerAsProfessional(opt.role!);
      }
      await tx.wait();

      // El nombre (y apellido si es persona) se guardan off-chain en la base de datos
      // (la blockchain solo guarda la address y el rol).
      try {
        await api.updateProfile({
          name: name.trim(),
          lastName: isOrg ? undefined : lastName.trim(),
          role: roleNumber,
        });
      } catch (profileErr) {
        console.error("No se pudo guardar el perfil off-chain", profileErr);
      }

      await refresh();
      if (selected === "patient") navigate("/patient");
      else navigate("/pending");
    } catch (e: any) {
      setError(e.reason || e.message || "Error en la transacción");
    } finally {
      setLoading(false);
    }
  }

  const selectedOpt = OPTIONS.find((o) => o.key === selected)!;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Crear cuenta</h2>
        <p style={styles.sub}>
          {fromHome ? "Confirmá tu registro en MediChain" : "Seleccioná tu rol en MediChain"}
        </p>

        {error && <div style={styles.error}>{error}</div>}

        {fromHome ? (
          <div style={styles.rolePreview}>
            <span style={styles.icon}>{selectedOpt.icon}</span>
            <strong style={{ fontSize: 18 }}>{selectedOpt.label}</strong>
          </div>
        ) : (
          <div style={styles.grid}>
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                style={opt.key === selected ? { ...styles.option, ...styles.optionSelected } : styles.option}
                onClick={() => setSelected(opt.key)}
                disabled={loading}
              >
                <span style={styles.icon}>{opt.icon}</span>
                <strong style={{ fontSize: 14 }}>{opt.label}</strong>
                <span style={styles.desc}>{opt.desc}</span>
              </button>
            ))}
          </div>
        )}

        <div style={styles.nameRow}>
          {isOrg ? (
            <div style={styles.nameField}>
              <label style={styles.nameLabel}>
                {selected === "lab" ? "Nombre del laboratorio" : "Nombre de la institución"}
              </label>
              <input
                style={styles.nameInput}
                placeholder={selected === "lab" ? "Laboratorio Central" : "Hospital Italiano"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          ) : (
            <>
              <div style={styles.nameField}>
                <label style={styles.nameLabel}>Nombre</label>
                <input
                  style={styles.nameInput}
                  placeholder="Juan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div style={styles.nameField}>
                <label style={styles.nameLabel}>Apellido</label>
                <input
                  style={styles.nameInput}
                  placeholder="Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>

        {selected !== "patient" && (
          <div style={styles.approvalBanner}>
            <span style={styles.bannerIcon}>⏳</span>
            <div>
              <strong style={{ display: "block", marginBottom: 2 }}>Requiere aprobación del administrador</strong>
              <span style={{ fontSize: 13, color: "#92400e" }}>
                Al registrarte, tu cuenta quedará en estado <strong>Pendiente</strong>. No podrás operar en MediChain hasta que el administrador revise y apruebe tu solicitud.
              </span>
            </div>
          </div>
        )}

        <button
          style={{ ...styles.btnRegister, opacity: !name.trim() || (!isOrg && !lastName.trim()) ? 0.5 : 1 }}
          onClick={register}
          disabled={loading || !name.trim() || (!isOrg && !lastName.trim())}
        >
          {loading
            ? "Confirmá en MetaMask..."
            : `Registrarme como ${selectedOpt.label}`}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  card: { background: "white", borderRadius: 16, padding: "40px 32px", maxWidth: 480, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  title: { fontSize: 24, fontWeight: 700, color: "#1e40af", marginBottom: 4 },
  sub: { color: "#64748b", marginBottom: 24 },
  error: { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  option: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "18px 12px", border: "2px solid #e2e8f0", borderRadius: 12,
    background: "white", cursor: "pointer", fontSize: 14, transition: "all 0.15s",
  },
  optionSelected: {
    borderColor: "#1e40af", background: "#eff6ff",
  },
  icon: { fontSize: 28 },
  desc: { fontSize: 11, color: "#94a3b8", textAlign: "center" as const },
  btnRegister: {
    width: "100%", background: "#1e40af", color: "white", border: "none",
    padding: "14px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
    marginTop: 4,
  },
  rolePreview: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: "24px",
    border: "2px solid #1e40af",
    borderRadius: 12,
    background: "#eff6ff",
    marginBottom: 20,
  },
  approvalBanner: {
    background: "#fffbeb",
    border: "1px solid #fbbf24",
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
    color: "#78350f",
  },
  bannerIcon: { fontSize: 22, flexShrink: 0 },
  nameRow: { display: "flex", gap: 10, marginBottom: 16 },
  nameField: { display: "flex", flexDirection: "column" as const, gap: 6, flex: 1 },
  nameLabel: { fontSize: 13, fontWeight: 600, color: "#475569" },
  nameInput: {
    border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px",
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  },
};
