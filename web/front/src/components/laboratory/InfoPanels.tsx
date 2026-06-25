import { LaboratoryCard } from "./LaboratoryCard";
import { palette, gradients } from "../../styles";

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
  panel: { color: palette.labGray2, display: "grid", fontSize: 13, fontWeight: 800, gap: 14, lineHeight: 1.6, padding: 22 },
  blue: { color: palette.blue600, fontSize: 15 },
  green: { color: palette.green700, fontSize: 15 },
  greenPanel: { background: gradients.labCard, borderRadius: 8 },
};
