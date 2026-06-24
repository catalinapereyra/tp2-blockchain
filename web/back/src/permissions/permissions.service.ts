import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByPatient(patientAddress: string) {
    const patient = patientAddress.toLowerCase();

    const [rels, accesses] = await Promise.all([
      this.prisma.patientDoctor.findMany({ where: { patientAddress: patient } }),
      this.prisma.documentAccess.findMany({ where: { patientAddress: patient }, orderBy: { grantedAt: "asc" } }),
    ]);

    const docIdsByDoctor = new Map<string, number[]>();
    for (const a of accesses) {
      if (!docIdsByDoctor.has(a.doctorAddress)) docIdsByDoctor.set(a.doctorAddress, []);
      docIdsByDoctor.get(a.doctorAddress)!.push(a.documentIdOnChain);
    }

    const doctorAddrs = new Set<string>([...rels.map((r) => r.doctorAddress), ...docIdsByDoctor.keys()]);

    const result = [];
    for (const doctorAddress of doctorAddrs) {
      const docIds = docIdsByDoctor.get(doctorAddress) ?? [];
      const documents = docIds.length
        ? await this.prisma.documentMetadata.findMany({
            where: { documentIdOnChain: { in: docIds } },
            orderBy: { createdAt: "desc" },
            select: METADATA_SELECT,
          })
        : [];
      result.push({ doctorAddress, documents });
    }

    return result;
  }

  // Agrega un médico a "mis médicos" sin compartirle ningún documento.
  async addDoctor(patientAddress: string, doctorAddress: string) {
    return this.prisma.patientDoctor.upsert({
      where: {
        patientAddress_doctorAddress: {
          patientAddress: patientAddress.toLowerCase(),
          doctorAddress: doctorAddress.toLowerCase(),
        },
      },
      create: { patientAddress: patientAddress.toLowerCase(), doctorAddress: doctorAddress.toLowerCase() },
      update: {},
    });
  }

  async removeDoctor(patientAddress: string, doctorAddress: string) {
    await this.prisma.patientDoctor.deleteMany({
      where: { patientAddress: patientAddress.toLowerCase(), doctorAddress: doctorAddress.toLowerCase() },
    });
    return { ok: true };
  }

  //devuelve todos los pacientes que le dieron acceso a este medico, con sus documentos
  async getByDoctor(doctorAddress: string) {
    const accesses = await this.prisma.documentAccess.findMany({
      where: { doctorAddress: doctorAddress.toLowerCase() },
      orderBy: { grantedAt: "asc" },
    });

    const byPatient = new Map<string, number[]>();
    for (const a of accesses) {
      if (!byPatient.has(a.patientAddress)) byPatient.set(a.patientAddress, []);
      byPatient.get(a.patientAddress)!.push(a.documentIdOnChain);
    }

    const result = [];
    for (const [patientAddress, docIds] of byPatient.entries()) {
      const documents = await this.prisma.documentMetadata.findMany({
        where: { documentIdOnChain: { in: docIds } },
        orderBy: { createdAt: "desc" },
        select: METADATA_SELECT,
      });
      result.push({ patientAddress, documents });
    }

    return result;
  }

  // Documentos que un paciente específico compartió con un médico específico
  async getShared(patientAddress: string, doctorAddress: string) {
    const accesses = await this.prisma.documentAccess.findMany({
      where: {
        patientAddress: patientAddress.toLowerCase(),
        doctorAddress: doctorAddress.toLowerCase(),
      },
    });

    const docIds = accesses.map((a) => a.documentIdOnChain);
    if (docIds.length === 0) return [];

    const documents = await this.prisma.documentMetadata.findMany({
      where: { documentIdOnChain: { in: docIds } },
      orderBy: { createdAt: "desc" },
      select: METADATA_SELECT,
    });

    const diags = await this.prisma.diagnosis.findMany({
      where: { doctorAddress: doctorAddress.toLowerCase(), documentIdOnChain: { in: docIds } },
    });
    const textByDoc = new Map(diags.map((d) => [d.documentIdOnChain, d.text]));

    return documents.map((d) => ({ ...d, diagnosis: textByDoc.get(d.documentIdOnChain) ?? null }));
  }

  async grant(patientAddress: string, doctorAddress: string, documentIdOnChain: number) {
    await this.addDoctor(patientAddress, doctorAddress);
    return this.prisma.documentAccess.upsert({
      where: {
        patientAddress_doctorAddress_documentIdOnChain: {
          patientAddress: patientAddress.toLowerCase(),
          doctorAddress: doctorAddress.toLowerCase(),
          documentIdOnChain,
        },
      },
      create: {
        patientAddress: patientAddress.toLowerCase(),
        doctorAddress: doctorAddress.toLowerCase(),
        documentIdOnChain,
      },
      update: {},
    });
  }

  async revoke(patientAddress: string, doctorAddress: string, documentIdOnChain: number) {
    const record = await this.prisma.documentAccess.findUnique({
      where: {
        patientAddress_doctorAddress_documentIdOnChain: {
          patientAddress: patientAddress.toLowerCase(),
          doctorAddress: doctorAddress.toLowerCase(),
          documentIdOnChain,
        },
      },
    });
    if (!record) throw new NotFoundException("No existe ese permiso");

    return this.prisma.documentAccess.delete({
      where: { id: record.id },
    });
  }
}
