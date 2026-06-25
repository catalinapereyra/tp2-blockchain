export class CreateLaboratoryStudyDto {
  documentIdOnChain!: number;
  patientAddress!: string;
  emitterAddress!: string;
  title!: string;
  documentType!: string;
  studyType?: string;
  labName?: string;
  notes?: string;
  // Contenido del estudio (PDF/imagen) en base64. Se guarda en la base de datos.
  fileBase64!: string;
  fileName!: string;
  mimeType!: string;
}
