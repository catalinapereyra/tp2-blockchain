export class CreateLaboratoryStudyDto {
  documentIdOnChain!: number;
  patientAddress!: string;
  emitterAddress!: string;
  title!: string;
  documentType!: string;
  studyType?: string;
  labName?: string;
  notes?: string;
  fileBase64!: string;
  fileName!: string;
  mimeType!: string;
}
