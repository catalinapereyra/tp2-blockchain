import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { getUserRegistry } from "../lib/contracts";
import { api } from "../lib/api";
import { useLoader } from "../components/common/Loader";
import Select from "../components/common/Select";
import { SPECIALTY_OPTIONS } from "../lib/specialties";
import { palette, fontFamily } from "../styles";

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
  const { refresh, address } = useWallet();
  const navigate = useNavigate();
  const loader = useLoader();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OptionKey>(() =>
    intendedToKey(localStorage.getItem("intended_role"))
  );
  const [fromHome] = useState<boolean>(() => !!localStorage.getItem("intended_role"));
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");

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
      loader.show("Confirmá en MetaMask…");
      let tx;
      if (selected === "patient") {
        tx = await contract.registerAsPatient();
      } else {
        tx = await contract.registerAsProfessional(opt.role!);
      }
      loader.show("Registrando en la blockchain…");
      await tx.wait();

      // El nombre (y apellido si es persona) se guardan off-chain en la base de datos
      // (la blockchain solo guarda la address y el rol).
      try {
        await api.updateProfile({
          name: name.trim(),
          lastName: isOrg ? undefined : lastName.trim(),
          role: roleNumber,
          specialty: selected === "doctor" && specialty ? specialty : undefined,
        });
      } catch (profileErr) {
        console.error("No se pudo guardar el perfil off-chain", profileErr);
      }

      // El RPC a veces tarda un bloque en reflejar el registro recién minado.
      // Esperamos a que la wallet figure registrada antes de redirigir, así no
      // caemos en una pantalla en blanco que obligaba a recargar a mano.
      loader.show("Cargando tu cuenta…");
      if (address) {
        // Mismo provider (MetaMask) que usa loadChainData, para que cuando esto
        // dé true, el refresh() siguiente también lea el estado actualizado.
        const reg = await getUserRegistry();
        for (let i = 0; i < 10; i++) {
          try {
            if (await reg.isRegistered(address)) break;
          } catch { /* reintentar */ }
          await new Promise((r) => setTimeout(r, 700));
        }
      }

      await refresh();
      // Pequeño respiro para que el contexto propague el nuevo estado antes de rutear
      await new Promise((r) => setTimeout(r, 0));
      if (selected === "patient") navigate("/patient", { replace: true });
      else navigate("/pending", { replace: true });
    } catch (e: any) {
      setError(e.reason || e.message || "Error en la transacción");
    } finally {
      loader.hide();
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

        {selected === "doctor" && (
          <div style={styles.specialtyField}>
            <label style={styles.nameLabel}>Especialidad</label>
            <Select
              options={SPECIALTY_OPTIONS}
              value={specialty}
              onChange={setSpecialty}
              placeholder="Elegí tu especialidad…"
              accent={palette.sky500}
            />
          </div>
        )}

        {selected !== "patient" && (
          <div style={styles.approvalBanner}>
            <span style={styles.bannerIcon}>⏳</span>
            <div>
              <strong style={{ display: "block", marginBottom: 2 }}>Requiere aprobación del administrador</strong>
              <span style={{ fontSize: 13, color: palette.amber800 }}>
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
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.slate50 },
  card: { background: palette.white, borderRadius: 16, padding: "40px 32px", maxWidth: 480, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  title: { fontSize: 24, fontWeight: 700, color: palette.indigo700, marginBottom: 4 },
  sub: { color: palette.slate500, marginBottom: 24 },
  error: { background: palette.red100, color: palette.red600, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  option: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "18px 12px", border: `2px solid ${palette.slate200}`, borderRadius: 12,
    background: palette.white, cursor: "pointer", fontSize: 14, transition: "all 0.15s",
  },
  optionSelected: {
    borderColor: palette.indigo700, background: palette.blue50,
  },
  icon: { fontSize: 28 },
  desc: { fontSize: 11, color: palette.slate400, textAlign: "center" as const },
  btnRegister: {
    width: "100%", background: palette.indigo700, color: palette.white, border: "none",
    padding: "14px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
    marginTop: 4,
  },
  rolePreview: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: "24px",
    border: `2px solid ${palette.indigo700}`,
    borderRadius: 12,
    background: palette.blue50,
    marginBottom: 20,
  },
  approvalBanner: {
    background: palette.amber50,
    border: `1px solid ${palette.amber400}`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
    color: palette.amber900,
  },
  bannerIcon: { fontSize: 22, flexShrink: 0 },
  nameRow: { display: "flex", gap: 10, marginBottom: 16 },
  specialtyField: { display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 16 },
  nameField: { display: "flex", flexDirection: "column" as const, gap: 6, flex: 1 },
  nameLabel: { fontSize: 13, fontWeight: 600, color: palette.slate600 },
  nameInput: {
    border: `1.5px solid ${palette.slate200}`, borderRadius: 10, padding: "10px 12px",
    fontSize: 14, fontFamily: fontFamily.sans, outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  },
};
