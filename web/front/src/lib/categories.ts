export interface StudyCategory {
  value: string; // lo que se guarda on-chain
  label: string; // lo que ve el usuario
}

export const STUDY_CATEGORIES: StudyCategory[] = [
  { value: "analisis", label: "Análisis de laboratorio" },
  { value: "imagen", label: "Imagen (Rx, eco, resonancia…)" },
  { value: "patologia", label: "Anatomía patológica" },
  { value: "cardiologia", label: "Cardiología (ECG, ergometría…)" },
  { value: "genetica", label: "Estudio genético" },
  { value: "endoscopia", label: "Endoscopía" },
  { value: "oftalmologia", label: "Oftalmología" },
  { value: "odontologia", label: "Odontología" },
  { value: "dermatologia", label: "Dermatología" },
  { value: "vacuna", label: "Vacuna" },
  { value: "receta", label: "Receta / indicación" },
  { value: "otro", label: "Otro" },
];

export function categoryLabel(value: string): string {
  return STUDY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
