import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateDocumentDto {
  documentIdOnChain: number;
  patientAddress: string;
  emitterAddress: string;
  title: string;
  description?: string;
  documentType: string;
  ipfsCid: string;
  ipfsUrl: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(patientAddress?: string) {
    return this.prisma.documentMetadata.findMany({
      where: patientAddress
        ? { patientAddress: patientAddress.toLowerCase() }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(documentIdOnChain: number) {
    const doc = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    return doc;
  }

  async create(dto: CreateDocumentDto) {
    const existing = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain: dto.documentIdOnChain },
    });
    if (existing) throw new ConflictException("Ya existe metadata para ese documento");

    return this.prisma.documentMetadata.create({
      data: {
        ...dto,
        patientAddress: dto.patientAddress.toLowerCase(),
        emitterAddress: dto.emitterAddress.toLowerCase(),
      },
    });
  }
}
