import React from "react";
import { useWallet } from "../context/WalletContext";

const ROLE_INFO: Record<number, { icon: string; label: string; desc: string }> = {
  1: { icon: "🩺", label: "Médico", desc: "Podés emitir recetas y registrar documentos para tus pacientes." },
  2: { icon: "🔬", label: "Laboratorio", desc: "Podés registrar resultados y estudios verificados en blockchain." },
  3: { icon: "🏥", label: "Institución", desc: "Podés registrar documentos e historiales médicos oficiales." },
};

export default function DoctorDashboard() {
  const { address, role } = useWallet();
  const info = role !== null ? ROLE_INFO[role] ?? ROLE_INFO[1] : ROLE_INFO[1];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.avatar}>{info.icon}</div>
        <h1 style={styles.greeting}>Hola, {info.label}</h1>
        <p style={styles.address}>{address}</p>
        <p style={styles.desc}>{info.desc}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  card: { background: "white", borderRadius: 20, padding: "48px 40px", maxWidth: 480, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  avatar: { fontSize: 64, marginBottom: 16 },
  greeting: { fontSize: 32, fontWeight: 800, color: "#0369a1", margin: "0 0 8px" },
  address: { fontFamily: "monospace", fontSize: 13, color: "#94a3b8", marginBottom: 20, wordBreak: "break-all" as const },
  desc: { color: "#64748b", fontSize: 15, lineHeight: 1.6 },
};
