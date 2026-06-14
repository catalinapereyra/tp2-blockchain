import React from "react";
import { useWallet } from "../context/WalletContext";

export default function PatientDashboard() {
  const { address } = useWallet();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.avatar}>👤</div>
        <h1 style={styles.greeting}>Hola, Paciente</h1>
        <p style={styles.address}>{address}</p>
        <p style={styles.desc}>Tu historial médico en blockchain. Próximamente podés ver tus documentos y recetas.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  card: { background: "white", borderRadius: 20, padding: "48px 40px", maxWidth: 480, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  avatar: { fontSize: 64, marginBottom: 16 },
  greeting: { fontSize: 32, fontWeight: 800, color: "#1e40af", margin: "0 0 8px" },
  address: { fontFamily: "monospace", fontSize: 13, color: "#94a3b8", marginBottom: 20, wordBreak: "break-all" as const },
  desc: { color: "#64748b", fontSize: 15, lineHeight: 1.6 },
};
