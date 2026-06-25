import { useNavigate } from "react-router-dom";
import { LaboratoryCard } from "./LaboratoryCard";
import QuickActionCard from "./QuickActionCard";
import { sectionAccent } from "../../styles";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { icon: "DOC", title: "Nuevo Estudio", text: "Subir analisis", accent: sectionAccent.firmados, onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { icon: "LIST", title: "Mis Estudios", text: "Ver todos", accent: sectionAccent.recetas, onClick: () => navigate("/lab/pacientes") },
    { icon: "PAC", title: "Pacientes", text: "Gestionar pacientes", accent: sectionAccent.estudios, onClick: () => navigate("/lab/pacientes") },
    { icon: "CAT", title: "Tipos de Analisis", text: "Ver categorias", accent: sectionAccent.medicos, onClick: () => navigate("/lab/categorias") },
  ];

  return (
    <LaboratoryCard title="Acciones rápidas">
      <div style={styles.grid}>
        {actions.map((action) => (
          <QuickActionCard key={action.title} {...action} />
        ))}
      </div>
    </LaboratoryCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", padding: "16px 20px 20px" },
};
