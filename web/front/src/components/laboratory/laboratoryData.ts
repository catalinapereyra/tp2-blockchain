export type LabStudy = {
  id: string;
  patient: string;
  category: string;
  detail: string;
  date: string;
  status: "Verificado" | "Pendiente";
};

export const labStats = [
  { label: "Estudios Subidos", value: "128", detail: "+12 este mes", tone: "success" },
  { label: "Pacientes Atendidos", value: "85", detail: "+8 este mes", tone: "success" },
  { label: "Categorias Utilizadas", value: "6", detail: "Activas", tone: "success" },
  { label: "En Proceso", value: "18", detail: "Pendientes", tone: "warning" },
  { label: "Verificados", value: "92", detail: "+15 este mes", tone: "success" },
];

export const recentActivity = [
  { icon: "DNA", title: "Estudio subido", text: "Analisis de Sangre - 0xA6B7...e3D4f", time: "18/05/2024 14:30", tone: "purple" },
  { icon: "OK", title: "Estudio verificado", text: "Orina - 0xB8C9...f4E5g", time: "18/05/2024 11:15", tone: "green" },
  { icon: "SR", title: "Estudio consultado", text: "Analisis de Sangre - 0xA6B7...e3D4f", time: "18/05/2024 09:45", tone: "orange" },
  { icon: "DNA", title: "Estudio subido", text: "Quimica Sanguinea - 0xA1B2...c3D4e", time: "17/05/2024 16:20", tone: "purple" },
  { icon: "OK", title: "Estudio verificado", text: "Inmunologia - 0xD2E3...h6G7i", time: "17/05/2024 10:30", tone: "green" },
];

export const studies: LabStudy[] = [
  { id: "1", patient: "0xA6B7...e3D4f", category: "Analisis de Sangre", detail: "Perfil Lipidico Completo", date: "18/05/2024", status: "Verificado" },
  { id: "2", patient: "0xB8C9...f4E5g", category: "Orina", detail: "Examen Completo de Orina", date: "17/05/2024", status: "Verificado" },
  { id: "3", patient: "0xC9D0...g5F6h", category: "Analisis de Sangre", detail: "Hemograma Completo", date: "16/05/2024", status: "Pendiente" },
  { id: "4", patient: "0xA1B2...c3D4e", category: "Quimica Sanguinea", detail: "Glucosa en Sangre", date: "15/05/2024", status: "Verificado" },
  { id: "5", patient: "0xD2E3...h6G7i", category: "Inmunologia", detail: "Proteina C Reactiva (PCR)", date: "14/05/2024", status: "Verificado" },
];

export const quickActions = [
  { icon: "DOC", title: "Nuevo Estudio", text: "Subir analisis" },
  { icon: "LIST", title: "Mis Estudios", text: "Ver todos" },
  { icon: "PAC", title: "Pacientes", text: "Gestionar pacientes" },
  { icon: "CAT", title: "Tipos de Analisis", text: "Ver categorias" },
];
