import { studies } from "./laboratoryData";
import { LaboratoryCard } from "./LaboratoryCard";

export function StudiesTable() {
  return (
    <LaboratoryCard title="Mis Estudios Recientes" action="Ver todos">
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Categoria</th>
              <th>Tipo Especifico<br /><span>Solo paciente</span></th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((study) => (
              <tr key={study.id}>
                <td>▧ {study.patient}</td>
                <td>{study.category}</td>
                <td>{study.detail}</td>
                <td>{study.date}</td>
                <td><span style={study.status === "Verificado" ? styles.verified : styles.pending}>{study.status}</span></td>
                <td><button style={styles.view}>◎</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tableWrap: { overflowX: "auto", padding: "20px 22px 24px" },
  table: {
    borderCollapse: "collapse",
    color: "#52627e",
    fontSize: 12,
    fontWeight: 800,
    minWidth: 820,
    width: "100%",
  },
  verified: {
    background: "#dcfce7",
    borderRadius: 6,
    color: "#16a34a",
    display: "inline-block",
    fontWeight: 900,
    padding: "8px 14px",
  },
  pending: {
    background: "#ffedd5",
    borderRadius: 6,
    color: "#f97316",
    display: "inline-block",
    fontWeight: 900,
    padding: "8px 14px",
  },
  view: {
    background: "#f8fafc",
    border: "1px solid #e3eaf4",
    borderRadius: "50%",
    color: "#64748b",
    cursor: "pointer",
    height: 30,
    width: 30,
  },
};
