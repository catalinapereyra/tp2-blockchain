import { LaboratoryCard } from "./LaboratoryCard";

export function InfoPanels() {
  return (
    <div style={styles.stack}>
      <LaboratoryCard subtle>
        <div style={styles.panel}>
          <strong style={styles.blue}>ⓘ Informacion Importante</strong>
          <p>El diagnostico y la interpretacion de los resultados son responsabilidad exclusiva del profesional medico.</p>
          <p>El laboratorio solo registra el tipo de analisis realizado. Los resultados especificos permanecen privados entre el paciente y su medico tratante.</p>
        </div>
      </LaboratoryCard>
      <LaboratoryCard>
        <div style={{ ...styles.panel, ...styles.greenPanel }}>
          <strong style={styles.green}>▱ Consejo de Seguridad</strong>
          <p>Verifica siempre la wallet del paciente antes de subir un estudio. Esto garantiza que el resultado llegue a la persona correcta.</p>
        </div>
      </LaboratoryCard>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stack: { display: "grid", gap: 24 },
  panel: { color: "#61708d", display: "grid", fontSize: 13, fontWeight: 800, gap: 14, lineHeight: 1.6, padding: 22 },
  blue: { color: "#2563eb", fontSize: 15 },
  green: { color: "#15803d", fontSize: 15 },
  greenPanel: { background: "linear-gradient(135deg, #ecfdf5, #f8fafc)", borderRadius: 8 },
};
