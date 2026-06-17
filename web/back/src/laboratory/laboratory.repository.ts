import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLaboratoryStudyDto } from "./dto/create-laboratory-study.dto";

@Injectable()
export class LaboratoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmitter(emitterAddress: string) {
    return this.prisma.documentMetadata.findMany({
      where: { emitterAddress: emitterAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });
  }

  findByDocumentId(documentIdOnChain: number) {
    return this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
    });
  }

  createStudy(dto: CreateLaboratoryStudyDto) {
    return this.prisma.documentMetadata.create({
      data: {
        ...dto,
        patientAddress: dto.patientAddress.toLowerCase(),
        emitterAddress: dto.emitterAddress.toLowerCase(),
      },
    });
  }
}
