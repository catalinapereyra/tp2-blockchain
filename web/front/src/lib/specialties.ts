// Especialidades médicas (off-chain). El médico elige la suya al registrarse.
// Para el componente Select usamos {value, label} (value = label).

export const SPECIALTIES: string[] = [
  "Clínica médica",
  "Cardiología",
  "Dermatología",
  "Endocrinología",
  "Gastroenterología",
  "Ginecología",
  "Hematología",
  "Infectología",
  "Nefrología",
  "Neumonología",
  "Neurología",
  "Nutrición",
  "Obstetricia",
  "Oftalmología",
  "Oncología",
  "Odontología",
  "Otorrinolaringología",
  "Pediatría",
  "Psiquiatría",
  "Reumatología",
  "Traumatología",
  "Urología",
  "Cirugía general",
  "Otra",
];

export const SPECIALTY_OPTIONS = SPECIALTIES.map((s) => ({ value: s, label: s }));
