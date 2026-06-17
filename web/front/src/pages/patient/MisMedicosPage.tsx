import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MedicoPermisoCard, { MedicoPermiso } from "../../components/patient/MedicoPermisoCard";

const MOCK_MEDICOS: MedicoPermiso[] = [
  { address: "0x29515ab33fccc23280c6638fdc02f8265db11262", since: "14 jun 2026", studiesShared: 3 },
  { address: "0xa05317a6208826d4f9c71b3e1234567890abcdef", since: "10 jun 2026", studiesShared: 5 },
];

export default function MisMedicosPage() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<MedicoPermiso[]>(MOCK_MEDICOS);
  const [newAddr, setNewAddr] = useState("");
  const [adding, setAdding] = useState(false);

  function handleRevoke(address: string) {
    // Acá iría: PermissionManager.revokeAccess(address)
    setMedicos((prev) => prev.filter((m) => m.address !== address));
  }

  function handleAdd() {
    if (!newAddr.startsWith("0x")) return;
    // Acá iría: PermissionManager.grantAccess(address)
    setMedicos((prev) => [...prev, { address: newAddr, since: "Hoy", studiesShared: 0 }]);
    setNewAddr("");
    setAdding(false);
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={s.pageTitle}>Mis médicos</h1>
            <p style={s.pageSubtitle}>{medicos.length} médicos con acceso a tus estudios.</p>
          </div>
          <button style={s.addBtn} onClick={() => setAdding(!adding)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Dar acceso
          </button>
        </div>

        {adding && (
          <div style={s.addBox}>
            <p style={s.addLabel}>Wallet del médico a quien querés dar acceso:</p>
            <div style={s.addRow}>
              <input
                style={s.input}
                placeholder="0x..."
                value={newAddr}
                onChange={(e) => setNewAddr(e.target.value)}
              />
              <button style={{ ...s.confirmBtn, opacity: newAddr.startsWith("0x") ? 1 : 0.5 }}
                disabled={!newAddr.startsWith("0x")} onClick={handleAdd}>
                Confirmar
              </button>
              <button style={s.cancelBtn} onClick={() => { setAdding(false); setNewAddr(""); }}>
                Cancelar
              </button>
            </div>
            <p style={s.addNote}>
              Al dar acceso, ese médico podrá ver todos tus estudios compartidos. Podés revocar en cualquier momento.
            </p>
          </div>
        )}

        {medicos.length === 0 ? (
          <div style={s.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span>Ningún médico tiene acceso todavía</span>
          </div>
        ) : (
          <div style={s.list}>
            {medicos.map((m) => (
              <MedicoPermisoCard key={m.address} medico={m} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
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
  container: { maxWidth: 620, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "none", border: "none", color: "#64748b",
    fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageIconWrap: {
    width: 44, height: 44, borderRadius: 12, background: "#fffbeb",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#94a3b8", margin: "2px 0 0" },
  addBtn: {
    marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
    background: "#f59e0b", color: "white", border: "none",
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  addBox: {
    background: "white", borderRadius: 14, padding: "18px 20px",
    marginBottom: 16, border: "1px solid #fde68a",
    display: "flex", flexDirection: "column" as const, gap: 10,
  },
  addLabel: { fontSize: 13, fontWeight: 600, color: "#475569", margin: 0 },
  addRow: { display: "flex", gap: 8 },
  input: {
    flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "9px 12px", fontSize: 13, fontFamily: "monospace", outline: "none",
  },
  confirmBtn: {
    background: "#f59e0b", color: "white", border: "none",
    padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  cancelBtn: {
    background: "none", color: "#64748b", border: "1.5px solid #e2e8f0",
    padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  addNote: { fontSize: 11, color: "#94a3b8", margin: 0 },
  list: { display: "flex", flexDirection: "column" as const, gap: 8 },
  empty: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10,
    padding: "48px 0", color: "#94a3b8", fontSize: 13,
  },
};
