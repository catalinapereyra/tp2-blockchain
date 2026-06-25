import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { api } from "../lib/api";
import Select from "../components/common/Select";
import Spinner from "../components/common/Spinner";
import { SPECIALTY_OPTIONS } from "../lib/specialties";
import { useToast } from "../components/common/Toast";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../styles";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { role, roleLabel, address, refresh } = useWallet();
  const toast = useToast();

  const isOrg = role === 2 || role === 3;
  const isDoctor = role === 1;

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMe()
      .then((me: any) => {
        setName(me?.name ?? "");
        setLastName(me?.lastName ?? "");
        setEmail(me?.email ?? "");
        setSpecialty(me?.specialty ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!name.trim() || (!isOrg && !lastName.trim())) {
      toast.show("Completá los campos obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        lastName: isOrg ? undefined : lastName.trim(),
        email: email.trim() || undefined,
        specialty: isDoctor && specialty ? specialty : undefined,
      });
      await refresh(); // actualiza el "Hola, {nombre}" del dashboard
      toast.show("Perfil actualizado");
    } catch {
      toast.show("No se pudo guardar el perfil", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
        </div>

        <div style={s.header}>
          <h1 style={s.title}>Mi perfil</h1>
          <p style={s.subtitle}>
            {roleLabel} · <span style={s.addr}>{address?.slice(0, 10)}…{address?.slice(-6)}</span>
          </p>
        </div>

        {loading ? (
          <div style={s.center}><Spinner size={26} /></div>
        ) : (
          <div style={s.form}>
            <div style={s.field}>
              <label style={s.label}>{isOrg ? "Nombre de la entidad" : "Nombre"}</label>
              <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder={isOrg ? "Laboratorio Central" : "Juan"} />
            </div>

            {!isOrg && (
              <div style={s.field}>
                <label style={s.label}>Apellido</label>
                <input style={s.input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" />
              </div>
            )}

            {isDoctor && (
              <div style={s.field}>
                <label style={s.label}>Especialidad</label>
                <Select options={SPECIALTY_OPTIONS} value={specialty} onChange={setSpecialty} placeholder="Elegí tu especialidad…" accent={palette.sky500} />
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>Email <span style={s.opt}>opcional</span></label>
              <input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>

            <p style={s.note}>Estos datos se guardan off-chain en la base de datos. On-chain solo está tu address y tu rol.</p>

            <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
              {saving ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Spinner size={15} color={palette.white} /> Guardando…</span> : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 480, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { marginBottom: 20 },
  title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.4px" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "4px 0 0" },
  addr: { fontFamily: fontFamily.mono },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  form: { background: colors.surface, borderRadius: radius["2xl"], padding: "24px", display: "flex", flexDirection: "column" as const, gap: 16, boxShadow: shadow.sm },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textSecondary, display: "flex", alignItems: "center", gap: 4 },
  opt: { color: colors.textFaint, fontWeight: fontWeight.regular, fontSize: fontSize.sm },
  input: { border: `1.5px solid ${colors.border}`, borderRadius: radius.md, padding: "10px 12px", fontSize: fontSize.base, fontFamily: fontFamily.sans, outline: "none", width: "100%", boxSizing: "border-box" as const, color: palette.slate800 },
  note: { fontSize: fontSize.sm, color: colors.textFaint, margin: 0, lineHeight: 1.5 },
  saveBtn: { background: colors.primary, color: palette.white, border: "none", padding: "13px", borderRadius: radius.md, fontSize: fontSize.md, fontWeight: fontWeight.bold, cursor: "pointer", fontFamily: fontFamily.sans, marginTop: 4 },
};
