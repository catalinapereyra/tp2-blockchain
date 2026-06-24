import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLaboratoryStudyDto } from "./dto/create-laboratory-study.dto";

// No incluye fileData (los bytes del archivo) en los listados.
const METADATA_SELECT = {
  id: true,
  documentIdOnChain: true,
  patientAddress: true,
  emitterAddress: true,
  title: true,
  description: true,
  documentType: true,
  studyType: true,
  labName: true,
  notes: true,
  studyDate: true,
  fileName: true,
  mimeType: true,
  createdAt: true,
} as const;

@Injectable()
export class LaboratoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmitter(emitterAddress: string) {
    return this.prisma.documentMetadata.findMany({
      where: { emitterAddress: emitterAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
      select: METADATA_SELECT,
    });
  }

  findByDocumentId(documentIdOnChain: number) {
    return this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
      select: METADATA_SELECT,
    });
  }

  createStudy(dto: CreateLaboratoryStudyDto) {
    const { fileBase64, ...rest } = dto;
    return this.prisma.documentMetadata.create({
      data: {
        ...rest,
        patientAddress: dto.patientAddress.toLowerCase(),
        emitterAddress: dto.emitterAddress.toLowerCase(),
        fileData: Buffer.from(fileBase64, "base64"),
      },
      select: METADATA_SELECT,
    });
  }
}
