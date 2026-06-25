import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
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
  // Contenido del documento (PDF/imagen) en base64. Se guarda en la base de datos.
  fileBase64: string;
  fileName: string;
  mimeType: string;
}

export interface DocumentFilters {
  patientAddress?: string;
  emitterAddress?: string;
}

// Campos que se devuelven en los listados: NO incluye fileData (los bytes del archivo)
// para no cargar PDFs enteros al listar.
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
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Agrega el nombre y apellido (off-chain) del paciente y del emisor a partir
  // de su UserProfile. Las direcciones quedan on-chain; el nombre se muestra
  // junto a la dirección sin exponerlo en la blockchain.
  private async enrichWithNames<T extends { patientAddress: string; emitterAddress: string }>(
    doc: T,
  ) {
    const [patient, emitter] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { walletAddress: doc.patientAddress } }),
      this.prisma.userProfile.findUnique({ where: { walletAddress: doc.emitterAddress } }),
    ]);

    return {
      ...doc,
      patientName: patient?.name ?? null,
      patientLastName: patient?.lastName ?? null,
      emitterName: emitter?.name ?? null,
      emitterLastName: emitter?.lastName ?? null,
      // Rol del emisor (0=paciente, 1=médico, 2=lab, 3=institución) para mostrar
      // "verificado por médico/laboratorio" según corresponda.
      emitterRole: emitter?.role ?? null,
    };
  }

  // Adjunta a cada documento la lista de diagnósticos (uno por médico),
  // con el nombre off-chain del médico que lo escribió.
  private async attachDiagnoses<T extends { documentIdOnChain: number }>(docs: T[]) {
    const ids = docs.map((d) => d.documentIdOnChain);
    if (ids.length === 0) return docs.map((d) => ({ ...d, diagnoses: [] as any[] }));

    const diags = await this.prisma.diagnosis.findMany({
      where: { documentIdOnChain: { in: ids } },
      orderBy: { updatedAt: "desc" },
    });

    const doctorAddrs = [...new Set(diags.map((d) => d.doctorAddress))];
    const profiles = doctorAddrs.length
      ? await this.prisma.userProfile.findMany({
          where: { walletAddress: { in: doctorAddrs } },
          select: { walletAddress: true, name: true, lastName: true },
        })
      : [];
    const nameByAddr = new Map(
      profiles.map((p) => [p.walletAddress, `${p.name} ${p.lastName ?? ""}`.trim()]),
    );

    const byDoc = new Map<number, any[]>();
    for (const d of diags) {
      const list = byDoc.get(d.documentIdOnChain) ?? [];
      list.push({
        doctorAddress: d.doctorAddress,
        doctorName: nameByAddr.get(d.doctorAddress) || null,
        text: d.text,
        updatedAt: d.updatedAt,
      });
      byDoc.set(d.documentIdOnChain, list);
    }

    return docs.map((doc) => ({ ...doc, diagnoses: byDoc.get(doc.documentIdOnChain) ?? [] }));
  }

  // Crea o actualiza el diagnóstico de un médico sobre un documento (off-chain).
  async upsertDiagnosis(documentIdOnChain: number, doctorAddress: string, text: string) {
    const addr = doctorAddress.toLowerCase();
    return this.prisma.diagnosis.upsert({
      where: { documentIdOnChain_doctorAddress: { documentIdOnChain, doctorAddress: addr } },
      create: { documentIdOnChain, doctorAddress: addr, text },
      update: { text },
    });
  }

  async findAll(filters: DocumentFilters = {}) {
    const docs = await this.prisma.documentMetadata.findMany({
      where: {
        ...(filters.patientAddress
          ? { patientAddress: filters.patientAddress.toLowerCase() }
          : {}),
        ...(filters.emitterAddress
          ? { emitterAddress: filters.emitterAddress.toLowerCase() }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: METADATA_SELECT,
    });

    const named = await Promise.all(docs.map((doc) => this.enrichWithNames(doc)));
    return this.attachDiagnoses(named);
  }

  async findOne(documentIdOnChain: number) {
    const doc = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
      select: METADATA_SELECT,
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    const named = await this.enrichWithNames(doc);
    const [withDiagnoses] = await this.attachDiagnoses([named]);
    return withDiagnoses;
  }

  // Devuelve el archivo (bytes + nombre + tipo) para descargarlo.
  async getFile(documentIdOnChain: number) {
    const doc = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
      select: { fileData: true, fileName: true, mimeType: true },
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    return doc;
  }

  async create(dto: CreateDocumentDto) {
    const existing = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain: dto.documentIdOnChain },
    });
    if (existing) throw new ConflictException("Ya existe metadata para ese documento");

    if (!dto.fileBase64) throw new BadRequestException("Falta el contenido del archivo");

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
        fileData: Buffer.from(dto.fileBase64, "base64"),
        fileName: dto.fileName,
        mimeType: dto.mimeType,
      },
      select: METADATA_SELECT,
    });
  }
}
