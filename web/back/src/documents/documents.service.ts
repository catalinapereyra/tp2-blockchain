import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateDocumentDto {
  documentIdOnChain: number;
  patientAddress: string;
  emitterAddress: string;
  title: string;
  description?: string;
  documentType: string;
  studyType?: string;
  labName?: string;
  notes?: string;
  ipfsCid: string;
  ipfsUrl: string;
}

export interface DocumentFilters {
  patientAddress?: string;
  emitterAddress?: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: DocumentFilters = {}) {
    return this.prisma.documentMetadata.findMany({
      where: {
        ...(filters.patientAddress
          ? { patientAddress: filters.patientAddress.toLowerCase() }
          : {}),
        ...(filters.emitterAddress
          ? { emitterAddress: filters.emitterAddress.toLowerCase() }
          : {}),
      },
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
