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
  studyDate?: string;
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
        documentIdOnChain: dto.documentIdOnChain,
        patientAddress: dto.patientAddress.toLowerCase(),
        emitterAddress: dto.emitterAddress.toLowerCase(),
        title: dto.title,
        description: dto.description ?? null,
        documentType: dto.documentType,
        studyType: dto.studyType ?? null,
        notes: dto.notes ?? null,
        studyDate: dto.studyDate ? new Date(dto.studyDate) : null,
        labName: dto.labName ?? null,
        ipfsCid: dto.ipfsCid,
        ipfsUrl: dto.ipfsUrl,
      },
    });
  }
}
